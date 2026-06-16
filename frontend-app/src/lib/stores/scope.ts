// 활성 학습 범위(active scope) — "지금 나는 *이 범위* 대비 공부 중"의 지속 상태.
// 범위는 두 입구 중 하나: ① 보정사 시험범위(빌트인 14계통) ② 내 강의(수확한 용어집).
// 캠퍼스 히어로가 이 범위 대비 즉답 진척을 보여주고, 연습(강의실·도서관) 버튼이
// 이 범위에 맞는 라우트로 보낸다. localStorage 영속(백엔드 없음).

import { browser } from '$app/environment';
import { type MedicalTerm } from '$lib/data/terms';
import { BOJEONGSA_SYSTEMS, termsBySystem } from '$lib/data/bojeongsa';
import { resolveLecture } from '$lib/stores/generated-lectures.svelte';
import { scheduleSync } from './sync';

export type Scope = { kind: 'bojeongsa' } | { kind: 'lecture'; lectureId: string };

/** 즉답 분류에 필요한 최소 형태 — MedicalTerm·LectureTerm 둘 다 만족. */
export interface ScopeItem {
	parts: string[];
}

const KEY = 'medicraft.scope';
export const DEFAULT_SCOPE: Scope = { kind: 'bojeongsa' };

export function loadScope(): Scope {
	if (!browser) return DEFAULT_SCOPE;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return DEFAULT_SCOPE;
		const s = JSON.parse(raw) as Scope;
		// 강의가 삭제됐으면 보정사로 폴백.
		if (s.kind === 'lecture') return resolveLecture(s.lectureId) ? s : DEFAULT_SCOPE;
		if (s.kind === 'bojeongsa') return s;
		return DEFAULT_SCOPE;
	} catch {
		return DEFAULT_SCOPE;
	}
}

export function saveScope(s: Scope) {
	if (browser) {
		localStorage.setItem(KEY, JSON.stringify(s));
		scheduleSync();
	}
}

/** 보정사 범위 = 14계통에 매핑된 용어 합집합(횡단 용어 제외 — overallCoverage 와 동일 기준). */
const bojeongsaTerms: MedicalTerm[] = BOJEONGSA_SYSTEMS.flatMap((s) => termsBySystem[s.id] ?? []);

/** 활성 범위가 포함하는 용어들(즉답 진척 측정 대상). */
export function scopeTerms(scope: Scope): ScopeItem[] {
	if (scope.kind === 'lecture') {
		const lec = resolveLecture(scope.lectureId);
		// 강의 용어집은 수확 결과(set.terms) — parts 가 곧 어근 조합.
		return lec ? lec.set.terms.map((t) => ({ parts: t.parts })) : [];
	}
	return bojeongsaTerms;
}

export function scopeLabel(scope: Scope): string {
	if (scope.kind === 'lecture') {
		const lec = resolveLecture(scope.lectureId);
		return lec ? lec.shortLabel : '내 강의';
	}
	return '보정사 시험범위';
}

/** 연습(강의실·도서관) 진입 라우트 — 강의 범위면 그 강의 전용 라우트로. */
export function practiceRoutes(scope: Scope): { classroom: string; library: string } {
	if (scope.kind === 'lecture') {
		return {
			classroom: `/lectures/${scope.lectureId}/classroom`,
			library: `/lectures/${scope.lectureId}/library`
		};
	}
	return { classroom: '/classroom', library: '/library' };
}

export function scopeEquals(a: Scope, b: Scope): boolean {
	if (a.kind !== b.kind) return false;
	if (a.kind === 'lecture' && b.kind === 'lecture') return a.lectureId === b.lectureId;
	return true;
}
