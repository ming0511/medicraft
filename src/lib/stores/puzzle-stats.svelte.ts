import { terms } from '$lib/data/terms';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RootStat {
	root: string;       // e.g. "Cardio-"
	attempts: number;
	correct: number;
}

export interface Badge {
	root: string;
	origin: string;
	meaning: string;
	meaningKo: string;
	earnedAt: number;  // timestamp
}

export interface WrongAnswer {
	termId: string;
	timestamp: number;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const ROOTS_KEY   = 'mediflash_root_stats';
const BADGES_KEY  = 'mediflash_badges';
const WRONG_KEY   = 'mediflash_wrong';
const DSTREAK_KEY = 'mediflash_day_streak';

// Earn badge after this many correct answers for a root
export const BADGE_THRESHOLD = 5;

// ── Load / Save helpers ───────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch { return fallback; }
}

function save(key: string, value: unknown) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(key, JSON.stringify(value));
}

// ── Reactive state ────────────────────────────────────────────────────────────

let rootStats  = $state<Record<string, RootStat>>(load(ROOTS_KEY, {}));
let badges     = $state<Badge[]>(load(BADGES_KEY, []));
let wrongList  = $state<WrongAnswer[]>(load(WRONG_KEY, []));

// Day streak: { lastDate: 'YYYY-MM-DD', days: number }
let dayStreak  = $state<{ lastDate: string; days: number }>(load(DSTREAK_KEY, { lastDate: '', days: 0 }));

// ── Day streak logic ──────────────────────────────────────────────────────────

function todayStr() {
	return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().slice(0, 10);
}

export function markDailyGoalAchieved() {
	const today = todayStr();
	if (dayStreak.lastDate === today) return; // already counted today
	const newDays = dayStreak.lastDate === yesterdayStr() ? dayStreak.days + 1 : 1;
	dayStreak = { lastDate: today, days: newDays };
	save(DSTREAK_KEY, dayStreak);
}

export function getDayStreak() { return dayStreak.days; }

// ── Record a puzzle attempt ───────────────────────────────────────────────────

export function recordAttempt(
	termId: string,
	rootParts: Array<{ part: string; origin: string; meaning: string; meaningKo: string }>,
	isCorrect: boolean
) {
	// Update root stats for each part involved
	for (const r of rootParts) {
		const prev = rootStats[r.part] ?? { root: r.part, attempts: 0, correct: 0 };
		const next: RootStat = {
			root: r.part,
			attempts: prev.attempts + 1,
			correct: prev.correct + (isCorrect ? 1 : 0)
		};
		rootStats[r.part] = next;

		// Check badge
		if (isCorrect && next.correct === BADGE_THRESHOLD && !badges.find((b) => b.root === r.part)) {
			badges = [...badges, {
				root: r.part,
				origin: r.origin,
				meaning: r.meaning,
				meaningKo: r.meaningKo,
				earnedAt: Date.now()
			}];
		}
	}
	save(ROOTS_KEY, rootStats);
	save(BADGES_KEY, badges);

	// Track wrong answers
	if (!isCorrect) {
		wrongList = [{ termId, timestamp: Date.now() }, ...wrongList.slice(0, 49)];
		save(WRONG_KEY, wrongList);
	} else {
		// Remove from wrong list if now answered correctly
		wrongList = wrongList.filter((w) => w.termId !== termId);
		save(WRONG_KEY, wrongList);
	}
}

// ── Getters ───────────────────────────────────────────────────────────────────

export function getAllRootStats(): RootStat[] {
	return Object.values(rootStats).sort((a, b) => b.attempts - a.attempts);
}

export function getWeakRoots(limit = 5): RootStat[] {
	return Object.values(rootStats)
		.filter((r) => r.attempts >= 2)
		.map((r) => ({ ...r, accuracy: r.correct / r.attempts }))
		.sort((a, b) => (a.correct / a.attempts) - (b.correct / b.attempts))
		.slice(0, limit);
}

export function getBadges(): Badge[] { return badges; }

export function getWrongTerms() {
	const ids = new Set(wrongList.map((w) => w.termId));
	return terms.filter((t) => ids.has(t.id));
}

export function hasWrongAnswers() { return wrongList.length > 0; }

export function clearStats() {
	rootStats = {};
	badges = [];
	wrongList = [];
	dayStreak = { lastDate: '', days: 0 };
	save(ROOTS_KEY, rootStats);
	save(BADGES_KEY, badges);
	save(WRONG_KEY, wrongList);
	save(DSTREAK_KEY, dayStreak);
}
