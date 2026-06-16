// 응급실(벼락치기) 압축 코스 엔진 — 전부 결정적. 런타임 LLM 0.
//
// 입력: 시험범위(보정사 계통 id들) + 남은 시간(분) + 친숙 어근 + 어근 약점 점수.
// 출력: 레버리지×약점×범위포함도로 정렬해 시간예산에 맞춰 자른 어근 학습 순서 +
//       "어근 N개 → 시험범위 M개 커버" 예상치.
//
// 핵심 = 그리디 set-cover. 매 단계 "지금 학습하면 범위 용어를 가장 많이 읽히게 하는" 어근을
// 고른다(다어근 용어는 분수 기여로 진행도 반영). 통째 암기와 달리 어근을 자산으로 남긴다(복리).

import { termsBySystem } from './bojeongsa';
import { learnableMorphemes, morphemeById } from './morphemes';
import type { MedicalTerm } from './terms';

/** 한 어근 빠른 드릴의 예상 소요(초). 시간예산 → 최대 어근 수 환산에 사용. */
export const DRILL_SEC_PER_ROOT = 30;

/** 시간 프리셋(분). */
export const TIME_PRESETS = [15, 30, 60, 90] as const;

const LEARNABLE_IDS = new Set(learnableMorphemes.map((m) => m.id));
const isLearnable = (id: string) => LEARNABLE_IDS.has(id);

export interface ScopeStat {
	systemIds: string[];
	/** 범위 내 용어(중복 없음 — 한 용어는 한 계통). */
	terms: MedicalTerm[];
	totalTerms: number;
	/** 범위가 쓰는 학습 가능 어근(중복 제거). */
	allRoots: string[];
	/** 그중 아직 안 친숙한(미수집) 어근 = 벼락치기 학습 후보. */
	unfamiliarRoots: string[];
	/** 지금 이미 모든 어근이 친숙해 *읽히는* 용어 수. */
	readableNow: number;
}

/** 선택 범위의 진단 통계 (진단 쇼크 화면용). */
export function scopeOf(systemIds: string[], collected: Iterable<string>): ScopeStat {
	const familiar = collected instanceof Set ? collected : new Set(collected);

	const seen = new Set<string>();
	const scopeTerms: MedicalTerm[] = [];
	for (const sid of systemIds) {
		for (const t of termsBySystem[sid] ?? []) {
			if (seen.has(t.id)) continue;
			seen.add(t.id);
			scopeTerms.push(t);
		}
	}

	const rootSet = new Set<string>();
	for (const t of scopeTerms) {
		for (const p of t.parts) if (isLearnable(p)) rootSet.add(p);
	}
	const allRoots = [...rootSet];
	const unfamiliarRoots = allRoots.filter((r) => !familiar.has(r));
	const readableNow = scopeTerms.filter((t) => t.parts.every((p) => familiar.has(p))).length;

	return {
		systemIds,
		terms: scopeTerms,
		totalTerms: scopeTerms.length,
		allRoots,
		unfamiliarRoots,
		readableNow
	};
}

export interface CourseRoot {
	id: string;
	form: string;
	meaningKo: string;
	unit: number;
	/** 이 어근을 학습하면 *직접* 읽히게 되는(나머지 미친숙 어근이 이것뿐인) 범위 용어 수. */
	directUnlocks: number;
}

export interface CramCourse {
	minutes: number;
	/** 학습 순서대로(레버리지 높은 순)의 어근. */
	roots: CourseRoot[];
	/** 시간예산이 허용하는 최대 어근 수. */
	maxByTime: number;
	/** 범위 내 안친숙 어근 총수. */
	candidateCount: number;
	/** 시간이 모자라 일부만 담겼나(candidateCount > roots.length). */
	truncated: boolean;
	totalTerms: number;
	/** 시작 전 읽히는 용어. */
	readableNow: number;
	/** 코스 완주 후 읽히는 용어(예상). */
	projectedReadable: number;
	/** projectedReadable - readableNow. */
	newlyReadable: number;
	/** 예상 소요(분). */
	estMinutes: number;
}

/**
 * 시간예산 압축 코스. 그리디 set-cover로 어근을 고른다.
 * weaknessOf(mid) = 0~1 (높을수록 약함) — 약점 가중. 안 넘기면 0 취급(레버리지만).
 */
export function buildCourse(
	systemIds: string[],
	minutes: number,
	collected: Iterable<string>,
	weaknessOf: (mid: string) => number = () => 0
): CramCourse {
	const familiar = new Set(collected instanceof Set ? collected : [...collected]);
	const scope = scopeOf(systemIds, familiar);

	// 범위 용어 중 "이론상 읽힐 수 있는"(미친숙 어근이 전부 학습 가능) 것만 레버리지 대상.
	// 학습 불가 어근에 막힌 용어는 추격해도 못 읽히므로 제외(시간 낭비 방지).
	const reachable = scope.terms.filter((t) =>
		t.parts.every((p) => familiar.has(p) || isLearnable(p))
	);

	// 어근 → 그 어근을 쓰는 (도달 가능) 범위 용어들.
	const termsByRoot = new Map<string, MedicalTerm[]>();
	for (const r of scope.unfamiliarRoots) termsByRoot.set(r, []);
	for (const t of reachable) {
		for (const p of t.parts) {
			if (termsByRoot.has(p)) termsByRoot.get(p)!.push(t);
		}
	}

	const selected = new Set<string>();
	const order: CourseRoot[] = [];
	const pool = new Set(scope.unfamiliarRoots);
	const maxByTime = Math.max(1, Math.floor((minutes * 60) / DRILL_SEC_PER_ROOT));

	const remainingCount = (t: MedicalTerm): number =>
		t.parts.filter((p) => !familiar.has(p) && !selected.has(p)).length;

	while (selected.size < maxByTime && pool.size > 0) {
		let best: string | null = null;
		let bestScore = -1;
		let bestDirect = 0;
		let bestUnit = Infinity;
		let bestTerms = -1;

		for (const r of pool) {
			const using = termsByRoot.get(r) ?? [];
			let direct = 0;
			let frac = 0;
			for (const t of using) {
				const rem = remainingCount(t); // r 포함 (r은 미친숙·미선택)
				if (rem === 1) direct += 1; // 이 어근만 익히면 바로 읽힘
				if (rem > 0) frac += 1 / rem; // 다어근 용어엔 분수 기여
			}
			const w = weaknessOf(r);
			const score = (direct * 2 + frac) * (1 + 0.5 * w);
			const unit = morphemeById[r]?.unit ?? 99;

			const better =
				score > bestScore + 1e-9 ||
				(Math.abs(score - bestScore) <= 1e-9 &&
					(direct > bestDirect ||
						(direct === bestDirect &&
							(unit < bestUnit ||
								(unit === bestUnit && using.length > bestTerms)))));
			if (better) {
				best = r;
				bestScore = score;
				bestDirect = direct;
				bestUnit = unit;
				bestTerms = using.length;
			}
		}

		if (best === null) break;
		const m = morphemeById[best];
		order.push({
			id: best,
			form: m?.form ?? best,
			meaningKo: m?.meaningKo ?? '',
			unit: m?.unit ?? 99,
			directUnlocks: bestDirect
		});
		selected.add(best);
		pool.delete(best);
	}

	const familiarOrSelected = (p: string) => familiar.has(p) || selected.has(p);
	const projectedReadable = scope.terms.filter((t) => t.parts.every(familiarOrSelected)).length;

	return {
		minutes,
		roots: order,
		maxByTime,
		candidateCount: scope.unfamiliarRoots.length,
		truncated: scope.unfamiliarRoots.length > order.length,
		totalTerms: scope.totalTerms,
		readableNow: scope.readableNow,
		projectedReadable,
		newlyReadable: projectedReadable - scope.readableNow,
		estMinutes: Math.max(1, Math.round((order.length * DRILL_SEC_PER_ROOT) / 60))
	};
}
