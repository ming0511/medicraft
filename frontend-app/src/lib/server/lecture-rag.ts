// 수확 에이전트 RAG 검색부 — 어근/어구를 임베딩해 NBK 코퍼스(Supabase pgvector)에서
// 의미적으로 가까운 출처 구절을 끌어온다. ③ NBK 대조의 "정확매칭" → "벡터 의미검색" 승격.
//
// 외부 도구 둘: ① Gemini 임베딩 API  ② Supabase pgvector (match_nbk RPC).
// 둘 중 하나라도 없으면 null → 호출부(lecture-harvest)는 기존 정확매칭으로 폴백.
// 코퍼스 자체는 오프라인(scripts/embed-corpus.mjs)에 미리 임베딩 → 런타임은 쿼리 표면만 임베딩.

import { env } from '$env/dynamic/private';
import { getAdminClient } from './supabase-admin';

export const EMBED_MODEL = 'gemini-embedding-001';
export const EMBED_DIMS = 768;
/** 이 이상이면 "출처 있음(unverified-with-source)"으로 인정. 미만이면 출처 없음.
 *  보정(calibrate-rag): 코퍼스 内 정답 ≥0.79, 코퍼스 外 오답 ≤0.734 → 0.76 에서 분리. */
export const MATCH_THRESHOLD = 0.76;

/** 쿼리 표면형을 문서 임베딩 포맷("surface (type): meaning")에 가깝게 감싼다.
 *  맨 표면형보다 진짜 어근 매칭 유사도를 0.69→0.80 수준으로 끌어올림(보정 실측). */
function queryText(surface: string): string {
	return `${surface} (medical word part)`;
}

export type RagHit = {
	surface: string;
	bucket?: string;
	meaning?: string;
	source: string;
	citation?: string;
	similarity: number;
};

/** RAG 사용 가능 여부 (키 + Supabase 둘 다 있어야). UI/디스패처가 폴백 판단에 사용. */
export function ragAvailable(): boolean {
	return !!env.GEMINI_API_KEY && !!getAdminClient();
}

// ── Gemini 임베딩 (배치) ──────────────────────────────────────────
type EmbedResponse = { embeddings?: Array<{ values?: number[] }> };

/** 여러 텍스트를 한 번에 임베딩. 실패 시 throw (호출부가 폴백). */
async function embedBatch(texts: string[]): Promise<number[][]> {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY 없음');
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
		body: JSON.stringify({
			requests: texts.map((t) => ({
				model: `models/${EMBED_MODEL}`,
				content: { parts: [{ text: t }] },
				outputDimensionality: EMBED_DIMS,
				taskType: 'RETRIEVAL_QUERY'
			}))
		})
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`Gemini embed ${res.status}: ${detail.slice(0, 200)}`);
	}
	const data = (await res.json()) as EmbedResponse;
	const out = (data.embeddings ?? []).map((e) => e.values ?? []);
	if (out.length !== texts.length || out.some((v) => v.length !== EMBED_DIMS)) {
		throw new Error('Gemini embed: 응답 차원/개수 불일치');
	}
	return out;
}

// ── 검색: 어근 표면형들 → best hit ────────────────────────────────
export type RetrieveResult = {
	/** RAG 가 실제로 동작했나 (임베딩 성공 + RPC 1건 이상 정상). 라벨/폴백 판단용. */
	used: boolean;
	/** surface → best RagHit (임계값 이상 매칭만). 미발견은 키 없음. */
	hits: Map<string, RagHit>;
};

/**
 * 미지 어근(검수/후보에 없는 것)들을 RAG로 일괄 조회.
 * @param surfaces 표면형 배열 (예: ['thyroid','ren'])
 * @returns used + 매칭된 hits. RAG 불가/실패 시 used=false → 호출부가 정확매칭 폴백.
 */
export async function retrieveSources(surfaces: string[]): Promise<RetrieveResult> {
	const hits = new Map<string, RagHit>();
	const uniq = [...new Set(surfaces.map((s) => s.trim()).filter(Boolean))];
	if (uniq.length === 0) return { used: false, hits };

	const admin = getAdminClient();
	if (!admin || !env.GEMINI_API_KEY) return { used: false, hits }; // RAG 불가 → 폴백

	let vectors: number[][];
	try {
		vectors = await embedBatch(uniq.map(queryText)); // 문서 포맷에 맞춘 쿼리로 임베딩
	} catch {
		return { used: false, hits }; // 임베딩 실패 → 폴백
	}

	// 표면형마다 top-1 검색. (코퍼스가 작아 표면당 1콜이면 충분; 커지면 배치 RPC로.)
	let anyRpcOk = false;
	await Promise.all(
		uniq.map(async (surface, i) => {
			try {
				const { data, error } = await admin.rpc('match_nbk', {
					query_embedding: vectors[i],
					match_count: 1
				});
				if (error) return; // RPC 실패(테이블/함수 없음 등) → 이 표면은 미발견
				anyRpcOk = true;
				const top = Array.isArray(data) ? (data[0] as RagHit | undefined) : undefined;
				if (top && top.similarity >= MATCH_THRESHOLD) hits.set(surface, top);
			} catch {
				/* 미발견 처리 */
			}
		})
	);
	// RPC 가 한 번도 정상 응답 못 했으면(=마이그레이션 전 등) RAG 미동작으로 간주.
	return { used: anyRpcOk, hits };
}
