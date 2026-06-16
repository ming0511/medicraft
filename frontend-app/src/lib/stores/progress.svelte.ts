import { scheduleSync } from './sync';

export type Progress = {
	level: number;
	xp: number;
	streak: number;
	bestStreak: number;
	lastStudyDate: string | null; // YYYY-MM-DD (local)
	cardsLearned: number;
	todayLearned: number; // 오늘 학습한 카드 수
	todayDate: string | null; // todayLearned 가 가리키는 날짜
	collectedRoots: string[];
	rootMastery: Record<string, number>; // root → encounters (정답 기준)
	earnedBadges: string[];
};

/** 하루 학습 목표 카드 수 */
export const DAILY_GOAL = 10;

const KEY = 'medicraft.progress';

const DEFAULT: Progress = {
	level: 1,
	xp: 0,
	streak: 0,
	bestStreak: 0,
	lastStudyDate: null,
	cardsLearned: 0,
	todayLearned: 0,
	todayDate: null,
	collectedRoots: [],
	rootMastery: {},
	earnedBadges: []
};

export function xpForLevel(level: number): number {
	return level <= 1 ? 0 : (level - 1) * 100;
}

export function xpToNext(level: number): number {
	return xpForLevel(level + 1) - xpForLevel(level);
}

export function levelProgress(p: Progress): number {
	const base = xpForLevel(p.level);
	const need = xpToNext(p.level);
	return need ? Math.min(1, (p.xp - base) / need) : 0;
}

export function loadProgress(): Progress {
	if (typeof localStorage === 'undefined') return { ...DEFAULT };
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...DEFAULT };
		const parsed = JSON.parse(raw) as Partial<Progress>;
		return { ...DEFAULT, ...parsed };
	} catch {
		return { ...DEFAULT };
	}
}

export function saveProgress(p: Progress) {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
		scheduleSync();
	} catch {
		// ignore
	}
}

export function gainXP(p: Progress, amount: number): Progress {
	let next = { ...p, xp: p.xp + amount };
	while (next.xp >= xpForLevel(next.level + 1)) {
		next.level += 1;
	}
	saveProgress(next);
	return next;
}

export function collectRoot(p: Progress, root: string): Progress {
	const mastery = { ...p.rootMastery, [root]: (p.rootMastery[root] ?? 0) + 1 };
	const collectedRoots = p.collectedRoots.includes(root)
		? p.collectedRoots
		: [...p.collectedRoots, root];
	const next = { ...p, collectedRoots, rootMastery: mastery };
	saveProgress(next);
	return next;
}

/** 카드 1장 학습 기록 — 누적 + 오늘 카운트 갱신 (날짜 바뀌면 오늘 카운트 리셋) */
export function recordCardLearned(p: Progress): Progress {
	const today = todayKey();
	const sameDay = p.todayDate === today;
	const next: Progress = {
		...p,
		cardsLearned: p.cardsLearned + 1,
		todayDate: today,
		todayLearned: (sameDay ? p.todayLearned : 0) + 1
	};
	saveProgress(next);
	return next;
}

/** 저장된 오늘 카운트 — 날짜가 지났으면 0 */
export function todayLearnedCount(p: Progress): number {
	return p.todayDate === todayKey() ? p.todayLearned : 0;
}

function todayKey(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function diffDays(a: string, b: string): number {
	const da = new Date(a + 'T00:00:00').getTime();
	const db = new Date(b + 'T00:00:00').getTime();
	return Math.round((db - da) / 86400000);
}

/** 오늘 학습 1회 등록 — streak 자동 갱신 */
export function registerStudyDay(p: Progress): Progress {
	const today = todayKey();
	if (p.lastStudyDate === today) return p;
	let streak = 1;
	if (p.lastStudyDate && diffDays(p.lastStudyDate, today) === 1) {
		streak = p.streak + 1;
	}
	const next: Progress = {
		...p,
		lastStudyDate: today,
		streak,
		bestStreak: Math.max(p.bestStreak, streak)
	};
	saveProgress(next);
	return next;
}

export const HOSPITAL_UNLOCK_LEVEL = 5;

// ── Mastery (★1~5) ───────────────────────────────────────────────
/** 어원 마스터 등급. encounters 기반: 1/3/6/10/15+ */
export function masteryStar(encounters: number): 0 | 1 | 2 | 3 | 4 | 5 {
	if (encounters <= 0) return 0;
	if (encounters >= 15) return 5;
	if (encounters >= 10) return 4;
	if (encounters >= 6) return 3;
	if (encounters >= 3) return 2;
	return 1;
}

// ── Badges ───────────────────────────────────────────────────────
export type Badge = {
	id: string;
	icon: string; // Icon.svelte 의 IconName
	name: string;
	desc: string;
	check: (p: Progress) => boolean;
};

export const BADGES: Badge[] = [
	{
		id: 'first-card',
		icon: 'stethoscope',
		name: '첫 진료',
		desc: '카드 1장 학습',
		check: (p) => p.cardsLearned >= 1
	},
	{
		id: 'cards-10',
		icon: 'bookCheck',
		name: '인턴',
		desc: '카드 10장 학습',
		check: (p) => p.cardsLearned >= 10
	},
	{
		id: 'cards-50',
		icon: 'cap',
		name: '레지던트',
		desc: '카드 50장 학습',
		check: (p) => p.cardsLearned >= 50
	},
	{
		id: 'streak-3',
		icon: 'flame',
		name: '3일 연속',
		desc: '3일 연속 학습',
		check: (p) => p.bestStreak >= 3
	},
	{
		id: 'streak-7',
		icon: 'calendarCheck',
		name: '주간 풀출석',
		desc: '7일 연속 학습',
		check: (p) => p.bestStreak >= 7
	},
	{
		id: 'roots-10',
		icon: 'puzzle',
		name: '어원 컬렉터',
		desc: '어원 10개 수집',
		check: (p) => p.collectedRoots.length >= 10
	},
	{
		id: 'roots-30',
		icon: 'blocks',
		name: '어원 마스터',
		desc: '어원 30개 수집',
		check: (p) => p.collectedRoots.length >= 30
	},
	{
		id: 'level-5',
		icon: 'hospital',
		name: '병원 진입',
		desc: 'Lv.5 도달',
		check: (p) => p.level >= 5
	},
	{
		id: 'master-star5',
		icon: 'award',
		name: '5성 어원',
		desc: '★5 어원 1개 보유',
		check: (p) => Object.values(p.rootMastery).some((n) => masteryStar(n) === 5)
	}
];

/** 진척도 갱신 후 새로 획득한 뱃지 반환 (영속 저장도 함께) */
export function checkBadges(p: Progress): { progress: Progress; newly: Badge[] } {
	const newly: Badge[] = [];
	const earned = new Set(p.earnedBadges);
	for (const b of BADGES) {
		if (!earned.has(b.id) && b.check(p)) {
			earned.add(b.id);
			newly.push(b);
		}
	}
	if (newly.length === 0) return { progress: p, newly: [] };
	const next = { ...p, earnedBadges: [...earned] };
	saveProgress(next);
	return { progress: next, newly };
}
