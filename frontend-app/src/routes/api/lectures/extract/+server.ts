// POST /api/lectures/extract — 강의자료 수확 에이전트 엔드포인트.
// 입력: multipart/form-data { file?: pdf|txt|md, text?: string, title?: string }
// 흐름: (PDF→텍스트) → ① 추출 ② 분해 (lecture-extract) → ③ NBK 대조 + eval (lecture-harvest)
// 출력: LectureSet JSON (앱이 그대로 소비) + suggestedId.

import { json, error } from '@sveltejs/kit';
import { extractText, getDocumentProxy } from 'unpdf';
import { extractAndDecompose } from '$lib/server/lecture-extract';
import { buildLectureSet } from '$lib/server/lecture-harvest';
import { resolveEngine } from '$lib/server/lecture-engines';
import { usageFor } from '$lib/server/llm-usage';
import type { RequestHandler } from './$types';

const MAX_CHARS = 40_000;

function slugify(s: string): string {
	const base = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
	return base || 'lecture';
}

async function pdfToText(file: File): Promise<string> {
	const buf = new Uint8Array(await file.arrayBuffer());
	const pdf = await getDocumentProxy(buf);
	const { text } = await extractText(pdf, { mergePages: true });
	return Array.isArray(text) ? text.join('\n') : text;
}

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const file = form.get('file');
	const pastedText = (form.get('text') as string | null)?.trim() ?? '';
	let title = (form.get('title') as string | null)?.trim() ?? '';
	// 화면에서 고른 엔진(없으면 서버 기본). 키 없는 엔진을 요청하면 resolveEngine 이 폴백.
	const engine = resolveEngine(form.get('engine') as string | null);

	let body = pastedText;

	if (file instanceof File && file.size > 0) {
		const name = file.name.toLowerCase();
		if (!title) title = file.name.replace(/\.[^.]+$/, '');
		try {
			if (name.endsWith('.pdf')) body = await pdfToText(file);
			else body = await file.text(); // txt / md
		} catch {
			throw error(422, 'PDF/파일에서 텍스트를 추출하지 못했습니다. 텍스트로 붙여넣어 주세요.');
		}
	}

	body = body.trim();
	if (!body) throw error(400, '강의 텍스트가 비어 있습니다. 파일을 올리거나 텍스트를 붙여넣어 주세요.');
	if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS);
	if (!title) title = '붙여넣은 강의자료';

	let result;
	try {
		result = await extractAndDecompose(body, engine);
	} catch (e) {
		throw error(502, `용어 추출에 실패했습니다: ${(e as Error).message}`);
	}

	const generated = new Date().toISOString().slice(0, 10);
	const set = await buildLectureSet(result.extracted, result.decomposed, {
		title,
		source: file instanceof File ? `업로드: ${file.name}` : '직접 붙여넣기',
		body,
		generated,
		runtime: result.runtime
	});

	// 이 호출 직후의 외부 LLM 일일 사용량(서버 전역) — 화면이 "오늘 N번 더" 갱신용.
	const usage = engine === 'gemini' || engine === 'claude' ? usageFor(engine) : null;

	return json({
		suggestedId: `${slugify(title)}-${generated}`,
		system: '',
		shortLabel: title,
		set,
		engine,
		usage
	});
};
