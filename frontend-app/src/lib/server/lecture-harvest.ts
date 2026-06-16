// 강의자료 수확 에이전트 — 결정적 파이프라인 (서버).
// scripts/extract-lecture-terms.mjs 의 ③ NBK RAG 대조 + 분류 + eval 을 TS로 포팅.
// 차이: 데이터를 regex 파싱 대신 $lib/data 에서 직접 import + NBK/후보 JSON import.
// LLM(① 추출 ② 분해)은 lecture-extract.ts 가 담당 — 여기는 런타임 LLM 0(결정적).

import { morphemes } from '$lib/data/morphemes';
import { terms } from '$lib/data/terms';
import type { LectureSet, LectureTerm, LectureClassifiedPart } from '$lib/data/lectures';
// scripts/ 의 워크리스트 JSON — Vite 가 번들에 포함.
import nbk from '../../../scripts/nbk-ch1-wordparts.json';
import candidateDraft from '../../../scripts/candidate-morphemes-draft.json';

// ── 데이터 인덱스 (모듈 로드 시 1회) ──────────────────────────────
const MORPH_IDS = new Set(morphemes.map((m) => m.id));
const UNVERIFIED_IDS = new Set(morphemes.filter((m) => m.verified === false).map((m) => m.id));
const TERM_LABELS = new Set(terms.map((t) => t.term.toLowerCase()));

type CandidateDraft = { id: string; source?: string; meaningKo?: string; meaning?: string };
const CANDIDATE_MAP = new Map<string, CandidateDraft>(
	((candidateDraft as { drafts?: CandidateDraft[] }).drafts ?? []).map((d) => [d.id, d])
);

type NbkEntry = { primary?: string; forms?: string[]; meaning?: string };
type NbkData = { prefixes?: NbkEntry[]; roots?: NbkEntry[]; suffixes?: NbkEntry[]; counts?: { total?: number } };
const NBK = nbk as NbkData;

// ── NBK 검색 (스크립트 nbkSearch 포팅) ────────────────────────────
const norm = (s: string) => String(s).toLowerCase().replace(/[-/]/g, '').trim();

function nbkSearch(surface: string): { bucket: string; entry: NbkEntry } | null {
	const target = norm(surface);
	if (!target) return null;
	for (const bucket of ['prefixes', 'roots', 'suffixes'] as const) {
		for (const e of NBK[bucket] ?? []) {
			const forms = [e.primary, ...(e.forms ?? [])].filter(Boolean) as string[];
			for (const f of forms) {
				const fn = norm(f);
				if (fn === target || fn.replace(/o$/, '') === target) {
					return { bucket: bucket.replace(/(es|s)$/, ''), entry: e };
				}
			}
		}
	}
	return null;
}

// ── 분류 (스크립트 classifyParts 포팅) ────────────────────────────
function classifyPart(id: string): LectureClassifiedPart {
	if (MORPH_IDS.has(id) && !UNVERIFIED_IDS.has(id)) {
		return { id, status: 'verified' };
	}
	const cand = CANDIDATE_MAP.get(id);
	if (cand) {
		return {
			id,
			status: 'candidate',
			source: cand.source ?? 'nbk-ch1',
			meaning: cand.meaningKo ?? cand.meaning
		};
	}
	const hit = nbkSearch(id);
	if (hit) {
		return {
			id,
			status: 'unverified-with-source',
			source: 'nbk-ch1',
			nbkMeaning: hit.entry.meaning,
			bucket: hit.bucket
		};
	}
	return { id, status: 'unverified-no-source' };
}

export type Decomposed = { term: string; parts: string[] };

/**
 * ③ NBK RAG 대조 + 분류 + eval → LectureSet.
 * @param extractedTerms ① 추출 결과 (영어 용어 문자열)
 * @param decomposed     ② 분해 결과 (용어 → morpheme id 배열)
 * @param meta           fixture 메타 (제목/원문/출처/생성일/추출방식)
 * @param expectedTerms  라벨이 있으면 precision/recall 계산용 (없으면 0)
 */
export function buildLectureSet(
	extractedTerms: string[],
	decomposed: Decomposed[],
	meta: { title: string; source: string; body: string; generated: string; runtime: string },
	expectedTerms: string[] = []
): LectureSet {
	const results = decomposed.map(({ term, parts }) => {
		const classified = parts.map(classifyPart);
		const alreadyInTerms = TERM_LABELS.has(term.toLowerCase());
		const allVerified = classified.every((p) => p.status === 'verified');
		const allSourced = classified.every((p) => p.status !== 'unverified-no-source');
		const unresolved = classified.filter((p) => p.status === 'unverified-no-source');
		const newCandidates = classified.filter((p) => p.status === 'unverified-with-source');
		return { term, parts, classified, alreadyInTerms, allVerified, allSourced, unresolved, newCandidates };
	});

	const inNet = results.filter((r) => r.alreadyInTerms);
	const autoMerge = results.filter((r) => !r.alreadyInTerms && r.allVerified);
	const afterPromote = results.filter((r) => !r.alreadyInTerms && !r.allVerified && r.allSourced);
	const blocked = results.filter((r) => r.unresolved.length > 0);

	// eval
	const expected = new Set(expectedTerms.map((s) => s.toLowerCase()));
	const extractedSet = new Set(decomposed.map((e) => e.term.toLowerCase()));
	const tp = [...extractedSet].filter((t) => expected.has(t)).length;
	const precision = extractedSet.size > 0 && expected.size > 0 ? tp / extractedSet.size : 0;
	const recall = expected.size > 0 ? tp / expected.size : 0;

	const allParts = results.flatMap((r) => r.classified);
	const verifiedCount = allParts.filter((p) => p.status === 'verified').length;
	const sourcedCount = allParts.filter((p) => p.status !== 'unverified-no-source').length;
	const newTerms = results.filter((r) => !r.alreadyInTerms);
	const autoRate = newTerms.length > 0 ? autoMerge.length / newTerms.length : null;

	// 집계: 새 후보 어근 / 출처없는 어근
	const newCandAgg = new Map<string, { id: string; bucket?: string; source: string; verified: false; nbkMeaning: string; usedIn: string[] }>();
	const noSourceAgg = new Map<string, { id: string; usedIn: string[] }>();
	for (const r of results) {
		for (const p of r.newCandidates) {
			const ex = newCandAgg.get(p.id);
			if (ex) ex.usedIn.push(r.term);
			else newCandAgg.set(p.id, { id: p.id, bucket: p.bucket, source: 'nbk-ch1', verified: false, nbkMeaning: p.nbkMeaning ?? '', usedIn: [r.term] });
		}
		for (const p of r.unresolved) {
			const ex = noSourceAgg.get(p.id);
			if (ex) ex.usedIn.push(r.term);
			else noSourceAgg.set(p.id, { id: p.id, usedIn: [r.term] });
		}
	}

	const lectureTerms: LectureTerm[] = results.map((r) => ({
		term: r.term,
		parts: r.parts,
		verified: false,
		already_in_terms: r.alreadyInTerms,
		all_parts_verified: r.allVerified,
		needs_curator: r.unresolved.length > 0,
		classified: r.classified as LectureClassifiedPart[]
	}));

	const round = (n: number) => Math.round(n * 1000) / 1000;
	const total = allParts.length || 1;

	return {
		_meta: {
			generated: meta.generated,
			fixture: meta.title,
			pipeline: '강의 텍스트 → ① 용어 추출 → ② 어근 분해 → ③ NBK RAG 대조 (서버 결정적)',
			llm_runtime: meta.runtime,
			llm_hook: 'lecture-extract.ts (deterministic | claude)',
			next_step: '검수자가 needs_curator + candidate_morphemes 통과 처리 → morphemes.ts/terms.ts 머지'
		},
		fixture: { title: meta.title, source: meta.source, body: meta.body.trim() },
		extracted_terms: extractedTerms,
		eval: {
			extraction_precision: round(precision),
			extraction_recall: round(recall),
			decomposition_coverage: round(verifiedCount / total),
			citation_coverage: round(sourcedCount / total),
			auto_merge_rate: autoRate !== null ? round(autoRate) : null,
			counts: {
				extracted: decomposed.length,
				already_in_terms: inNet.length,
				auto_mergeable: autoMerge.length,
				after_candidate_promotion: afterPromote.length,
				blocked_on_curator: blocked.length
			}
		},
		terms: lectureTerms,
		candidate_morphemes: [...newCandAgg.values()],
		needs_curator: [...noSourceAgg.values()]
	};
}

/** NBK 후보 풀 크기 (UI 표시용). */
export const NBK_RAW_COUNT = NBK.counts?.total ?? 0;
export const CANDIDATE_POOL_SIZE = CANDIDATE_MAP.size;
