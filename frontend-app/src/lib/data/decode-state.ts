// 용어 = 어근 조합이라는 원칙에서 유도하는 "디코딩 상태" 3분류.
// 풀려는 문제 = "긴 영어 용어 → 한국어 뜻이 *바로* 떠오르게". 그 상태가 곧 '즉답'.
//   🔒 잠김(locked)   — 구성 어근 중 아직 안 모은 게 있음 → 쪼갤 수도 없음
//   🟡 읽힘(readable) — 어근은 다 모았지만 일부가 아직 약함 → 쪼개면 풀리지만 느림
//   🟢 즉답(instant)  — 구성 어근이 전부 '마스터' → 긴 용어를 봐도 뜻이 바로
// 전부 기존 데이터(progress.collectedRoots + 어근 SRS)로 결정적 유도. 런타임 LLM 없음.

export type DecodeState = 'instant' | 'readable' | 'locked';

export interface DecodeBreakdown {
	instant: number;
	readable: number;
	locked: number;
	total: number;
}

export function termDecodeState(
	parts: string[],
	isCollected: (id: string) => boolean,
	isMastered: (id: string) => boolean
): DecodeState {
	if (parts.length === 0) return 'locked';
	if (!parts.every(isCollected)) return 'locked';
	if (parts.every(isMastered)) return 'instant';
	return 'readable';
}

export function decodeBreakdown(
	items: { parts: string[] }[],
	isCollected: (id: string) => boolean,
	isMastered: (id: string) => boolean
): DecodeBreakdown {
	let instant = 0;
	let readable = 0;
	let locked = 0;
	for (const it of items) {
		const s = termDecodeState(it.parts, isCollected, isMastered);
		if (s === 'instant') instant++;
		else if (s === 'readable') readable++;
		else locked++;
	}
	return { instant, readable, locked, total: items.length };
}
