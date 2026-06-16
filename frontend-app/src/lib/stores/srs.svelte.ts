import { terms, type MedicalTerm } from '$lib/data/terms';
import { morphemes, type Morpheme } from '$lib/data/morphemes';

/** 어근(morpheme) SRS 카드 키는 'm:' 접두 — 용어 id와의 충돌 방지(예: 'edema'). */
const M_PREFIX = 'm:';

export interface CardState {
	id: string;
	interval: number; // days (fractional for hours)
	easeFactor: number;
	repetitions: number;
	dueDate: number; // unix timestamp ms
	lastRated: number | null;
	/** 최근 N개 평가 (슬라이딩 윈도우). 약점 점수의 정답률 신호. 옵셔널 = 옛 localStorage 호환. */
	recentRatings?: Rating[];
	/** 최근 N개 응답시간(ms). 카드 등장 → 평가까지. 약점 점수의 속도 신호. */
	recentResponseMs?: number[];
}

export type Rating = 0 | 1 | 2 | 3; // 0=Again, 1=Hard, 2=Good, 3=Easy

const STORAGE_KEY = 'mediflash_srs';
const SETTINGS_KEY = 'mediflash_settings';

/** 약점 점수 슬라이딩 윈도우 크기 — 최근 N개 평가만 본다 (옛 부진은 잊는다). */
const WINDOW = 10;
/** 응답시간 정규화 임계값 (ms) — 이 값이 점수 0.5에 해당. */
const RT_HALF_MS = 4000;
/** 약점 임계 — 이 점수 이상이면 due가 아니어도 복습 큐로 끌어옴. */
export const WEAK_THRESHOLD = 0.4;
/** "최근 약한 어원" 라벨이 붙는 임계 (큐 포함보다 보수적). */
export const WEAK_LABEL_THRESHOLD = 0.5;

function defaultState(id: string): CardState {
	return {
		id,
		interval: 0,
		easeFactor: 2.5,
		repetitions: 0,
		dueDate: Date.now(),
		lastRated: null
	};
}

function pushWindow<T>(arr: T[] | undefined, item: T): T[] {
	const next = arr ? [...arr, item] : [item];
	return next.length > WINDOW ? next.slice(-WINDOW) : next;
}

function median(arr: number[]): number {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function loadFromStorage(): Record<string, CardState> {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function saveToStorage(data: Record<string, CardState>) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** SM-2 style interval calculation */
export function getNextInterval(state: CardState, rating: Rating): number {
	if (rating === 0) return 1 / 24; // 1 hour
	if (rating === 1) return 3 / 24; // 3 hours
	// Good or Easy
	if (state.repetitions === 0) return rating === 3 ? 4 : 1;
	if (state.repetitions === 1) return rating === 3 ? 4 : 1;
	const base = state.interval * state.easeFactor;
	return rating === 3 ? Math.max(4, base * 1.3) : Math.max(1, base);
}

/** Human readable label for next review */
export function intervalLabel(days: number): string {
	const hours = days * 24;
	if (hours < 1) return `${Math.round(hours * 60)}분 후`;
	if (hours < 24) return `${Math.round(hours)}시간 후`;
	return `${Math.round(days)}일 후`;
}

export function rateCard(state: CardState, rating: Rating, responseMs?: number): CardState {
	const now = Date.now();
	const newInterval = getNextInterval(state, rating);
	const newEaseFactor =
		rating <= 1
			? Math.max(1.3, state.easeFactor - 0.2)
			: Math.min(3.0, state.easeFactor + (rating === 3 ? 0.15 : 0));

	return {
		...state,
		interval: newInterval,
		easeFactor: newEaseFactor,
		repetitions: rating === 0 ? 0 : state.repetitions + 1,
		dueDate: now + newInterval * 24 * 60 * 60 * 1000,
		lastRated: now,
		recentRatings: pushWindow(state.recentRatings, rating),
		recentResponseMs:
			typeof responseMs === 'number' && responseMs >= 0
				? pushWindow(state.recentResponseMs, Math.min(responseMs, 60_000))
				: state.recentResponseMs
	};
}

/**
 * 약점 점수 0~1 (높을수록 약함). PRD 솔루션 #3: 정답률·응답속도·최근등장·간격 4신호.
 * 한 번도 학습 안 한 카드는 0 (= 신규로 따로 다룸).
 */
export function weaknessScore(state: CardState, now: number = Date.now()): number {
	if (state.lastRated === null) return 0;

	// 1) 정답률 — 최근 평가 중 rating ≤ 1 비율. 평가 기록 부족하면 보수적 기본값.
	const ratings = state.recentRatings ?? [];
	const lapseRate = ratings.length === 0 ? 0.3 : ratings.filter((r) => r <= 1).length / ratings.length;

	// 2) 응답속도 — 중앙값 응답시간을 RT_HALF_MS로 정규화. RT_HALF_MS의 2배 → 1.0.
	const rt = median(state.recentResponseMs ?? []);
	const slow = rt === 0 ? 0 : Math.min(1, rt / (RT_HALF_MS * 2));

	// 3) overdue — (now - lastRated) / intervalMs. 1.0 = 딱 due, 2.0+ = 한참 지남.
	const intervalMs = Math.max(state.interval, 1 / 24) * 86_400_000;
	const overdueRatio = (now - state.lastRated) / intervalMs;
	const overdue = Math.min(1, overdueRatio / 2);

	// 4) 짧은 interval — 아직 충분히 익지 않음. 14일+ → 0, 0일 → 1.
	const shortInterval = state.interval >= 14 ? 0 : Math.max(0, 1 - state.interval / 14);

	return Math.min(1, lapseRate * 0.4 + slow * 0.2 + overdue * 0.2 + shortInterval * 0.2);
}

// ── Reactive Store ────────────────────────────────────────────────────────────

let cardStates = $state<Record<string, CardState>>(loadFromStorage());

// Ensure all terms have a state entry
for (const t of terms) {
	if (!cardStates[t.id]) {
		cardStates[t.id] = defaultState(t.id);
	}
}
// ...and all morphemes (keyed with 'm:' prefix)
for (const m of morphemes) {
	const k = M_PREFIX + m.id;
	if (!cardStates[k]) cardStates[k] = defaultState(k);
}

function persist() {
	saveToStorage(cardStates);
}

export function getCardState(id: string): CardState {
	return cardStates[id] ?? defaultState(id);
}

export function applyRating(id: string, rating: Rating) {
	const current = cardStates[id] ?? defaultState(id);
	cardStates[id] = rateCard(current, rating);
	persist();
}

export function resetCard(id: string) {
	cardStates[id] = defaultState(id);
	persist();
}

export function resetAll() {
	for (const t of terms) {
		cardStates[t.id] = defaultState(t.id);
	}
	for (const m of morphemes) {
		cardStates[M_PREFIX + m.id] = defaultState(M_PREFIX + m.id);
	}
	persist();
}

/** Cards due now */
export function getDueCards(): MedicalTerm[] {
	const now = Date.now();
	return terms.filter((t) => (cardStates[t.id]?.dueDate ?? 0) <= now);
}

// ── Morpheme SRS (어근 친숙화) ────────────────────────────────────────────────
export function getMorphemeState(mid: string): CardState {
	return cardStates[M_PREFIX + mid] ?? defaultState(M_PREFIX + mid);
}

export function applyMorphemeRating(mid: string, rating: Rating, responseMs?: number) {
	const k = M_PREFIX + mid;
	cardStates[k] = rateCard(cardStates[k] ?? defaultState(k), rating, responseMs);
	persist();
}

/** 한 번 이상 학습했고 지금 복습 시점이 된 어근들 (한 번도 안 본 어근은 제외 — 그건 '새 어근'으로 등장). */
export function getDueMorphemes(): Morpheme[] {
	const now = Date.now();
	return morphemes.filter((m) => {
		const s = cardStates[M_PREFIX + m.id];
		return !!s && s.lastRated !== null && s.dueDate <= now;
	});
}

/** SRS 상으로 아직 한 번도 학습하지 않은 어근 (= '새 어근'). */
export function isMorphemeNew(mid: string): boolean {
	return (cardStates[M_PREFIX + mid]?.lastRated ?? null) === null;
}

/**
 * 약점 가중 복습 큐. due 어근 ∪ 약점 임계값 이상 어근, weakness 점수 내림차순.
 * PRD 솔루션 #3: due가 아니어도 약한 어근을 앞으로 끌어옴. 한 번도 학습 안 한 어근(=신규)은 별도.
 */
export function getReviewQueue(): Array<{ morpheme: Morpheme; state: CardState; score: number; isDue: boolean; isWeak: boolean }> {
	const now = Date.now();
	const out: Array<{ morpheme: Morpheme; state: CardState; score: number; isDue: boolean; isWeak: boolean }> = [];
	for (const m of morphemes) {
		const s = cardStates[M_PREFIX + m.id];
		if (!s || s.lastRated === null) continue;
		const isDue = s.dueDate <= now;
		const score = weaknessScore(s, now);
		if (!isDue && score < WEAK_THRESHOLD) continue;
		out.push({ morpheme: m, state: s, score, isDue, isWeak: score >= WEAK_LABEL_THRESHOLD });
	}
	out.sort((a, b) => b.score - a.score);
	return out;
}

/** 복습 큐 크기 (캠퍼스 카드 등 표시용). */
export function reviewQueueCount(): number {
	return getReviewQueue().length;
}

/** "최근 약한 어원" 라벨 대상인지 — 임계값(WEAK_LABEL_THRESHOLD) 이상. */
export function isMorphemeWeak(mid: string): boolean {
	const s = cardStates[M_PREFIX + mid];
	if (!s || s.lastRated === null) return false;
	return weaknessScore(s) >= WEAK_LABEL_THRESHOLD;
}

/** 어근의 약점 점수(0~1). 미학습/신규는 0. 도서관 디코딩 큐의 약점 가중 정렬용. */
export function morphemeWeakness(mid: string): number {
	const s = cardStates[M_PREFIX + mid];
	if (!s || s.lastRated === null) return 0;
	return weaknessScore(s);
}

/** Cards filtered by category */
export function getCardsByCategory(category: string | null): MedicalTerm[] {
	if (!category) return terms;
	return terms.filter((t) => t.category === category);
}

/** Statistics */
export function getStats() {
	const now = Date.now();
	const total = terms.length;
	const due = terms.filter((t) => (cardStates[t.id]?.dueDate ?? 0) <= now).length;
	const studied = terms.filter((t) => cardStates[t.id]?.lastRated !== null).length;
	const mastered = terms.filter((t) => (cardStates[t.id]?.interval ?? 0) >= 7).length;

	const categoryStats = Object.entries(
		terms.reduce(
			(acc, t) => {
				const cat = t.category;
				if (!acc[cat]) acc[cat] = { total: 0, studied: 0 };
				acc[cat].total++;
				if (cardStates[t.id]?.lastRated !== null) acc[cat].studied++;
				return acc;
			},
			{} as Record<string, { total: number; studied: number }>
		)
	);

	return { total, due, studied, mastered, categoryStats };
}

export { cardStates };
