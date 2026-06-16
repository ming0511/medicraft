// 강의 추출 — 클라이언트 사용자 설정 + 무료 사용량.
//  · selectedEngine: 사용자가 고른 추출 엔진(서버가 키로 검증·폴백).
//    기본 = 'deterministic'(LLM 없음, 외부 호출 0) — 사용자가 명시적으로 Gemini(LLM)를 골라야 외부 호출.
//  · 무료 추출 횟수: 기기 단위 카운터(localStorage). 비즈니스 쐐기 = 무료=내장범위 / 유료=내 강의 업로드.
//    한도 소진 시 업로드를 막고 결제 유도. (서버 LLM 일일 한도와는 별개 축 — 그건 서버 전역.)
import { browser } from '$app/environment';

export type SelectedEngine = 'deterministic' | 'gemini' | 'claude';

/** 출고 기본 엔진 = LLM 없는 결정적 모드. */
export const DEFAULT_ENGINE: SelectedEngine = 'deterministic';

const ENGINE_KEY = 'medicraft.lectures.engine';
const USAGE_KEY = 'medicraft.lectures.freeUsed';

/** 무료로 추출할 수 있는 총 횟수(기기당). 데모/쐐기용 — 넘으면 결제 유도. */
export const FREE_EXTRACTS = 3;

function readEngine(): SelectedEngine {
	if (!browser) return DEFAULT_ENGINE;
	const v = localStorage.getItem(ENGINE_KEY);
	// 'gemini'/'claude' 만 명시 저장. 그 외(미설정·예전 'auto')는 기본=결정적.
	return v === 'gemini' || v === 'claude' ? v : DEFAULT_ENGINE;
}

function readUsed(): number {
	if (!browser) return 0;
	const n = Number(localStorage.getItem(USAGE_KEY));
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

let selected = $state<SelectedEngine>(readEngine());
let freeUsed = $state<number>(readUsed());

export function selectedEngine(): SelectedEngine {
	return selected;
}

export function setSelectedEngine(e: SelectedEngine) {
	selected = e;
	if (browser) {
		// 기본(결정적)은 키를 지워 깔끔하게, LLM 선택만 저장.
		if (e === DEFAULT_ENGINE) localStorage.removeItem(ENGINE_KEY);
		else localStorage.setItem(ENGINE_KEY, e);
	}
}

/** 폼에 실어 보낼 engine 값. 항상 명시 엔진(기본=결정적)을 보낸다. */
export function engineParam(): string {
	return selected;
}

export function freeUsedCount(): number {
	return freeUsed;
}

export function freeRemaining(): number {
	return Math.max(0, FREE_EXTRACTS - freeUsed);
}

export function canExtract(): boolean {
	return freeRemaining() > 0;
}

/** 추출 성공 1건 기록 → 무료 잔여 1 감소. */
export function recordExtract() {
	freeUsed += 1;
	if (browser) localStorage.setItem(USAGE_KEY, String(freeUsed));
}

/** 데모/테스트용 — 무료 사용량 0으로. */
export function resetFreeUsage() {
	freeUsed = 0;
	if (browser) localStorage.removeItem(USAGE_KEY);
}
