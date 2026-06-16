// 강의자료 수확 에이전트 — ① 용어 추출 + ② 어근 분해.
// 두 전략:
//   · deterministic (기본, 키 불필요): 아는 어근 사전으로 텍스트를 스캔/세그먼트.
//                                      런타임 LLM 0 = PRD 원래 설계(안티-증발). 새 어근은 못 찾음.
//   · claude (LECTURE_LLM=claude + ANTHROPIC_API_KEY): 처음 보는 어근까지 LLM이 추출/분해. (유료)
//   · gemini (LECTURE_LLM=gemini + GEMINI_API_KEY):    동일, Google Gemini 무료 티어 사용.
//
// ★ LLM 연결부는 extractWithLLM()/extractWithGemini() 에 격리 — 여기만 갈아끼우면 됨.

import { env } from '$env/dynamic/private';
import Anthropic from '@anthropic-ai/sdk';
import { morphemes } from '$lib/data/morphemes';
import { terms } from '$lib/data/terms';
import type { Decomposed } from './lecture-harvest';
import { resolveEngine, type EngineId } from './lecture-engines';
import { recordLlmCall } from './llm-usage';

export type ExtractResult = {
	extracted: string[];
	decomposed: Decomposed[];
	/** 'deterministic' | 'claude' — _meta.llm_runtime 에 기록. */
	runtime: string;
};

// ── 사전: 아는 용어 surface → 정본 parts ─────────────────────────
const KNOWN_TERM_PARTS = new Map<string, { display: string; parts: string[] }>(
	terms.map((t) => [t.term.toLowerCase(), { display: t.term, parts: t.parts }])
);

// ── 어근 surface 인덱스 (결정적 세그먼트용, 검수된 것만) ───────────
const SURFACE_TO_ID: Array<[string, string]> = [];
for (const m of morphemes) {
	if (m.verified === false) continue;
	const surfaces = new Set<string>([m.id, ...(m.variants ?? [])]);
	for (const s of surfaces) SURFACE_TO_ID.push([s.toLowerCase(), m.id]);
}
// 긴 surface 우선 매칭 (greedy longest-match).
SURFACE_TO_ID.sort((a, b) => b[0].length - a[0].length);

/** 한 단어를 아는 어근 시퀀스로 분해. 연결모음(o/i/e/a) 1개 스킵 허용. 못 풀면 null. */
function segment(word: string): string[] | null {
	const MAX = 6; // parts 상한 (폭주 방지)
	function go(i: number, parts: string[]): string[] | null {
		if (i === word.length) return parts.length >= 2 ? parts : null;
		if (parts.length >= MAX) return null;
		for (const [surface, id] of SURFACE_TO_ID) {
			if (word.startsWith(surface, i)) {
				const res = go(i + surface.length, [...parts, id]);
				if (res) return res;
			}
		}
		// 어근 사이 연결모음 1개 스킵 (예: cardi+o+megaly)
		if (parts.length > 0 && 'oiea'.includes(word[i])) {
			const res = go(i + 1, parts);
			if (res) return res;
		}
		return null;
	}
	return go(0, []);
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** 결정적 추출: 아는 용어 사전 매칭 + 규칙적 새 용어 세그먼트. */
function extractDeterministic(text: string): Decomposed[] {
	const seen = new Set<string>();
	const out: Decomposed[] = [];
	const tokens = text.toLowerCase().match(/[a-z][a-z]{4,}/g) ?? []; // 5자 이상 영문 단어
	for (const tok of tokens) {
		if (seen.has(tok)) continue;
		const known = KNOWN_TERM_PARTS.get(tok);
		if (known) {
			seen.add(tok);
			out.push({ term: known.display, parts: known.parts });
			continue;
		}
		const parts = segment(tok);
		if (parts) {
			seen.add(tok);
			out.push({ term: cap(tok), parts });
		}
	}
	return out;
}

// ── LLM 경로 (격리된 연결부) ──────────────────────────────────────
const LLM_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		terms: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					term: { type: 'string', description: 'English medical term as it appears (Title Case)' },
					parts: {
						type: 'array',
						items: { type: 'string' },
						description: 'ordered morpheme ids, lowercase, no hyphen/slash (e.g. ["hyper","glyc","emia"])'
					}
				},
				required: ['term', 'parts']
			}
		}
	},
	required: ['terms']
} as const;

function knownMorphemeCatalog(): string {
	return morphemes
		.filter((m) => m.verified !== false)
		.map((m) => `${m.id} (${m.type}, ${m.meaning})`)
		.join('\n');
}

const SYSTEM_PROMPT = `You extract English medical terms from lecture text and decompose each into etymological morphemes.
Rules:
- Only extract genuine English medical/anatomical terms (diseases, procedures, anatomy, signs). Ignore ordinary words.
- Decompose each term into an ordered list of morpheme ids.
- Prefer ids from the KNOWN MORPHEMES catalog when the morpheme matches.
- For a morpheme NOT in the catalog, coin a short lowercase id (the root form, no hyphen, no slash, no combining vowel) — e.g. "thyroid", "ren".
- Drop connecting vowels from ids (cardi/o → "cardi"). Each id is the bare root/prefix/suffix form.
- Return JSON only.`;

async function extractWithLLM(text: string, apiKey: string, model: string): Promise<Decomposed[]> {
	const client = new Anthropic({ apiKey });
	// 강의 한 편에 용어가 수십~수백 개 → JSON 출력이 길어질 수 있어 넉넉히. 16k 미만이라 비스트리밍 OK.
	const res = await client.messages.create({
		model,
		max_tokens: 8192,
		system: SYSTEM_PROMPT,
		output_config: { format: { type: 'json_schema', schema: LLM_SCHEMA } },
		messages: [
			{
				role: 'user',
				content: `KNOWN MORPHEMES (id (type, meaning)):\n${knownMorphemeCatalog()}\n\n=== LECTURE TEXT ===\n${text}\n\nExtract and decompose all medical terms.`
			}
		]
	});
	// 출력이 max_tokens 에 걸려 잘리면 JSON 이 깨짐 → 명확히 알려 잘못된 부분 추출을 막는다.
	if (res.stop_reason === 'max_tokens') {
		throw new Error('LLM 출력이 잘렸습니다(용어가 너무 많음). 강의를 더 짧게 잘라 올려 주세요.');
	}
	const block = res.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
	if (!block) throw new Error('LLM returned no text block');
	const parsed = JSON.parse(block.text) as { terms: Array<{ term: string; parts: string[] }> };
	return (parsed.terms ?? [])
		.filter((t) => t.term && Array.isArray(t.parts) && t.parts.length > 0)
		.map((t) => ({ term: t.term.trim(), parts: t.parts.map((p) => p.toLowerCase().replace(/[-/]/g, '')) }));
}

// ── Gemini 경로 (격리된 연결부, 무료 티어) ────────────────────────
/** LLM JSON 응답 → Decomposed[]. 두 경로 공용. */
function parseDecomposed(raw: string): Decomposed[] {
	// 모델이 ```json 펜스를 감쌀 때가 있어 제거 후 파싱.
	const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
	const parsed = JSON.parse(cleaned) as { terms?: Array<{ term: string; parts: string[] }> };
	return (parsed.terms ?? [])
		.filter((t) => t.term && Array.isArray(t.parts) && t.parts.length > 0)
		.map((t) => ({ term: t.term.trim(), parts: t.parts.map((p) => p.toLowerCase().replace(/[-/]/g, '')) }));
}

async function extractWithGemini(text: string, apiKey: string, model: string): Promise<Decomposed[]> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
			contents: [
				{
					role: 'user',
					parts: [
						{
							text: `KNOWN MORPHEMES (id (type, meaning)):\n${knownMorphemeCatalog()}\n\n=== LECTURE TEXT ===\n${text}\n\nExtract and decompose all medical terms. Return ONLY a JSON object of the form {"terms":[{"term":"Hepatomegaly","parts":["hepat","megaly"]}]}.`
						}
					]
				}
			],
			generationConfig: {
				responseMimeType: 'application/json',
				temperature: 0,
				maxOutputTokens: 8192
			}
		})
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
	}
	const data = (await res.json()) as {
		candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
	};
	const cand = data.candidates?.[0];
	if (cand?.finishReason === 'MAX_TOKENS') {
		throw new Error('LLM 출력이 잘렸습니다(용어가 너무 많음). 강의를 더 짧게 잘라 올려 주세요.');
	}
	const out = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('');
	if (!out.trim()) throw new Error('Gemini returned no text');
	return parseDecomposed(out);
}

/** 디스패처: 요청 엔진(없으면 env 기본)에 따라 결정적 또는 LLM(claude/gemini). UI/route 가 이걸 호출.
 *  @param requested 화면에서 사용자가 고른 엔진. 키 없거나 미지정이면 서버 기본으로 폴백(resolveEngine). */
export async function extractAndDecompose(
	text: string,
	requested?: string | null
): Promise<ExtractResult> {
	const engine: EngineId = resolveEngine(requested);
	if (engine === 'claude' && env.ANTHROPIC_API_KEY) {
		const model = env.LECTURE_LLM_MODEL || 'claude-opus-4-8';
		const decomposed = await extractWithLLM(text, env.ANTHROPIC_API_KEY, model);
		recordLlmCall('claude');
		return { extracted: decomposed.map((d) => d.term), decomposed, runtime: `claude (${model})` };
	}
	if (engine === 'gemini' && env.GEMINI_API_KEY) {
		const model = env.LECTURE_LLM_MODEL || 'gemini-2.0-flash';
		const decomposed = await extractWithGemini(text, env.GEMINI_API_KEY, model);
		recordLlmCall('gemini');
		return { extracted: decomposed.map((d) => d.term), decomposed, runtime: `gemini (${model})` };
	}
	const decomposed = extractDeterministic(text);
	return { extracted: decomposed.map((d) => d.term), decomposed, runtime: 'deterministic (no LLM)' };
}
