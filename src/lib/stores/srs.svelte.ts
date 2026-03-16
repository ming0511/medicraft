import { terms, type MedicalTerm } from '$lib/data/terms';

export interface CardState {
	id: string;
	interval: number; // days (fractional for hours)
	easeFactor: number;
	repetitions: number;
	dueDate: number; // unix timestamp ms
	lastRated: number | null;
}

export type Rating = 0 | 1 | 2 | 3; // 0=Again, 1=Hard, 2=Good, 3=Easy

const STORAGE_KEY = 'mediflash_srs';
const SETTINGS_KEY = 'mediflash_settings';

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

export function rateCard(state: CardState, rating: Rating): CardState {
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
		lastRated: now
	};
}

// ── Reactive Store ────────────────────────────────────────────────────────────

let cardStates = $state<Record<string, CardState>>(loadFromStorage());

// Ensure all terms have a state entry
for (const t of terms) {
	if (!cardStates[t.id]) {
		cardStates[t.id] = defaultState(t.id);
	}
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
	persist();
}

/** Cards due now */
export function getDueCards(): MedicalTerm[] {
	const now = Date.now();
	return terms.filter((t) => (cardStates[t.id]?.dueDate ?? 0) <= now);
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
