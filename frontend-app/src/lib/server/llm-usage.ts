// 외부 LLM(수확 에이전트) 일일 호출 카운터 — 서버 전역(프로세스 메모리, 날짜별 리셋).
// 외부 무료 티어 한도(예: Gemini 무료 RPD)를 "오늘 몇 번 더 쓸 수 있는지"로 보여주기 위함.
// 단일 API 키를 전체 사용자가 공유하므로 한도는 서버 기준 1개 — 클라이언트 카운터로는 못 셈.
// ⚠️ 프로세스 메모리라 서버 재시작 시 0으로 리셋(영속 백엔드 없음). 한도는 근사치/설정값.

import { env } from '$env/dynamic/private';

export type LlmProvider = 'gemini' | 'claude';

// 무료 티어 일일 한도(근사). 모델/정책에 따라 다르므로 env 로 덮어쓸 수 있게.
//  · gemini-2.5-flash 무료: 대략 일 200~250건 → 보수적으로 200 기본.
//  · claude 는 유료(무료 한도 개념 없음) → null = 한도 표시 안 함.
function geminiDailyLimit(): number {
	const raw = Number(env.GEMINI_DAILY_LIMIT);
	return Number.isFinite(raw) && raw > 0 ? raw : 200;
}

function today(): string {
	return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

let state: { date: string; counts: Record<LlmProvider, number> } = {
	date: today(),
	counts: { gemini: 0, claude: 0 }
};

function rollover() {
	const d = today();
	if (state.date !== d) state = { date: d, counts: { gemini: 0, claude: 0 } };
}

/** LLM 호출 1건 성공 기록. (deterministic 모드는 호출 안 함) */
export function recordLlmCall(provider: LlmProvider) {
	rollover();
	state.counts[provider] += 1;
}

export type ProviderUsage = {
	provider: LlmProvider;
	used: number;
	limit: number | null; // null = 무료 한도 개념 없음(유료)
	remaining: number | null;
};

/** 한 provider 의 오늘 사용량 스냅샷. */
export function usageFor(provider: LlmProvider): ProviderUsage {
	rollover();
	const used = state.counts[provider];
	const limit = provider === 'gemini' ? geminiDailyLimit() : null;
	return {
		provider,
		used,
		limit,
		remaining: limit == null ? null : Math.max(0, limit - used)
	};
}

/** 전체 스냅샷 (설정/디버그 표시용). */
export function usageSnapshot() {
	rollover();
	return { date: state.date, gemini: usageFor('gemini'), claude: usageFor('claude') };
}
