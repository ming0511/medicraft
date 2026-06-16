// 보건의료정보관리사(보정사) 국가시험 — 의학용어 출제범위 = 14개 신체계통.
// 이 앱의 "비즈니스 스파인": 우리 어근 그물이 이 14계통을 어디까지 덮는지(그물 보유),
// 그리고 사용자가 그 범위를 어디까지 읽어내는지(커버율)를 1급으로 보여준다.
//
// 설계 원칙
//  - 14계통이 *정본 커리큘럼*. body system 태그(terms.systems, 옛 9 카테고리)는 여기에 매핑된다.
//  - 한 용어는 정확히 한 계통에 속한다(대표 계통) → 커버율 카운트가 깨끗.
//  - 빈 계통(어근 0)도 숨기지 않고 그대로 노출 = 정직한 그물 갭(= 보강 타겟 리스트).
//  - 전부 결정적 계산. 런타임 LLM 없음. 출처: 국시원 의학용어 출제범위(14 신체계통).

import { terms, type MedicalTerm } from './terms';
import { morphemeById, isVerified, type Morpheme } from './morphemes';

export interface BojeongsaSystem {
	id: string;
	/** 출제범위 표기 순서(1~14). */
	no: number;
	nameKo: string;
	/** 한 줄 범위 힌트 (해부/진단/증상/수술처치). */
	blurb: string;
}

/** 보정사 의학용어 출제범위 — 14개 신체계통(국시원 공고 순서). */
export const BOJEONGSA_SYSTEMS: BojeongsaSystem[] = [
	{ id: 'digestive', no: 1, nameKo: '소화계통', blurb: '위·장 등 소화관' },
	{ id: 'hepatobiliary', no: 2, nameKo: '소화부속기(간담췌)', blurb: '간·담도·췌장' },
	{ id: 'respiratory', no: 3, nameKo: '호흡계통', blurb: '폐·기관지·흉막' },
	{ id: 'circulatory', no: 4, nameKo: '순환계통', blurb: '심장·혈관' },
	{ id: 'blood-lymph', no: 5, nameKo: '혈액 및 림프계통', blurb: '혈구·응고·림프' },
	{ id: 'endocrine', no: 6, nameKo: '내분비계통', blurb: '갑상선·부신·뇌하수체' },
	{ id: 'musculoskeletal', no: 7, nameKo: '근골격계통', blurb: '뼈·근육·관절' },
	{ id: 'nervous', no: 8, nameKo: '신경계통 및 정신의학', blurb: '뇌·신경·정신' },
	{ id: 'female-reproductive', no: 9, nameKo: '여성 생식계통 및 유방', blurb: '자궁·난소·유방' },
	{ id: 'obstetrics', no: 10, nameKo: '임신·출산·신생아', blurb: '임신·분만·신생아' },
	{ id: 'male-reproductive', no: 11, nameKo: '남성 생식계통', blurb: '고환·전립선' },
	{ id: 'urinary', no: 12, nameKo: '비뇨계통', blurb: '신장·방광·요로' },
	{ id: 'integumentary', no: 13, nameKo: '외피계통', blurb: '피부·피하' },
	{ id: 'sensory', no: 14, nameKo: '감각계통(눈·귀)', blurb: '눈·귀' }
];

export const bojeongsaSystemById: Record<string, BojeongsaSystem> = Object.fromEntries(
	BOJEONGSA_SYSTEMS.map((s) => [s.id, s])
);

/** 옛 body system 카테고리(terms.systems[0]) → 보정사 계통 id. 매핑 안 되면 null(=계통 공통/횡단). */
const CATEGORY_TO_SYSTEM: Record<string, string> = {
	cardiology: 'circulatory',
	neurology: 'nervous',
	pulmonology: 'respiratory',
	gastroenterology: 'digestive',
	nephrology: 'urinary',
	hematology: 'blood-lymph',
	musculoskeletal: 'musculoskeletal',
	endocrinology: 'endocrine',
	gynecology: 'female-reproductive',
	obstetrics: 'obstetrics',
	andrology: 'male-reproductive',
	ophthalmology: 'sensory',
	otology: 'sensory',
	dermatology: 'integumentary'
	// pathology / anatomy = 횡단(특정 계통 아님) → null
};

/** 어근 기반 세분화 — 카테고리만으론 안 갈리는 계통을 어근으로 보정. */
const HEPATOBILIARY_ROOTS = new Set(['hepat', 'chole', 'pancreat']);
const INTEGUMENTARY_ROOTS = new Set(['cutane']);

/**
 * 한 용어의 대표 보정사 계통. 어근 세분화 우선 → 카테고리 매핑 → null(횡단).
 * 예: cholecystitis(chole) = 간담췌, subcutaneous(cutane) = 외피.
 */
export function bojeongsaSystemOf(term: MedicalTerm): string | null {
	if (term.parts.some((p) => HEPATOBILIARY_ROOTS.has(p))) return 'hepatobiliary';
	if (term.parts.some((p) => INTEGUMENTARY_ROOTS.has(p))) return 'integumentary';
	return CATEGORY_TO_SYSTEM[term.systems[0]] ?? null;
}

/** 계통별 용어 목록(대표 계통 기준). 매핑 안 된 횡단 용어는 어느 계통에도 안 들어감. */
export const termsBySystem: Record<string, MedicalTerm[]> = (() => {
	const map: Record<string, MedicalTerm[]> = Object.fromEntries(
		BOJEONGSA_SYSTEMS.map((s) => [s.id, [] as MedicalTerm[]])
	);
	for (const t of terms) {
		const sys = bojeongsaSystemOf(t);
		if (sys && map[sys]) map[sys].push(t);
	}
	return map;
})();

/** 계통이 쓰는 학습 가능 어근 id 집합(검수된 것만). = 그 계통을 읽으려면 익혀야 할 어근. */
export function systemRootIds(systemId: string): string[] {
	const set = new Set<string>();
	for (const t of termsBySystem[systemId] ?? []) {
		for (const p of t.parts) {
			const m = morphemeById[p];
			if (m && isVerified(m)) set.add(p);
		}
	}
	return [...set];
}

export interface SystemCoverage {
	system: BojeongsaSystem;
	/** 그물이 이 계통에 보유한 용어 수. */
	totalTerms: number;
	/** 그 용어들이 쓰는(학습 가능) 어근 수. */
	totalRoots: number;
	/** 사용자가 친숙해진(collected) 어근 중 이 계통에 속한 수. */
	familiarRoots: number;
	/** 모든 어근이 친숙해 *읽히는* 용어 수. */
	unlockedTerms: number;
	/** 커버율 = 읽힌 용어 / 보유 용어 (0~1). 보유 0이면 0. */
	coverage: number;
	/** 그물이 비었나(어근 0) = 보강 타겟. */
	empty: boolean;
}

/** 한 계통의 커버리지 계산. collected = 친숙 어근 id 집합(progress.collectedRoots). */
export function systemCoverage(systemId: string, collected: Set<string>): SystemCoverage {
	const system = bojeongsaSystemById[systemId];
	const termsIn = termsBySystem[systemId] ?? [];
	const rootIds = systemRootIds(systemId);
	const familiarRoots = rootIds.filter((r) => collected.has(r)).length;
	const unlockedTerms = termsIn.filter((t) => t.parts.every((p) => collected.has(p))).length;
	const totalTerms = termsIn.length;
	return {
		system,
		totalTerms,
		totalRoots: rootIds.length,
		familiarRoots,
		unlockedTerms,
		coverage: totalTerms > 0 ? unlockedTerms / totalTerms : 0,
		empty: rootIds.length === 0
	};
}

export interface OverallCoverage {
	/** 그물이 14계통에 매핑한 총 용어 수. */
	totalTerms: number;
	/** 읽히는(해금된) 용어 수. */
	unlockedTerms: number;
	/** 14계통에 속한 학습 가능 어근 총수(중복 제거). */
	totalRoots: number;
	/** 그중 친숙해진 어근 수. */
	familiarRoots: number;
	/** 전체 커버율 = 읽힌 용어 / 총 용어. */
	coverage: number;
	/** 그물에 용어가 하나라도 있는 계통 수 / 14. */
	systemsWithContent: number;
	perSystem: SystemCoverage[];
}

/** 14계통 전체 커버리지 + 계통별 분해. */
export function overallCoverage(collectedRoots: Iterable<string>): OverallCoverage {
	const collected = collectedRoots instanceof Set ? collectedRoots : new Set(collectedRoots);
	const perSystem = BOJEONGSA_SYSTEMS.map((s) => systemCoverage(s.id, collected));

	const allRoots = new Set<string>();
	for (const s of BOJEONGSA_SYSTEMS) for (const r of systemRootIds(s.id)) allRoots.add(r);

	const totalTerms = perSystem.reduce((a, s) => a + s.totalTerms, 0);
	const unlockedTerms = perSystem.reduce((a, s) => a + s.unlockedTerms, 0);
	const familiarRoots = [...allRoots].filter((r) => collected.has(r)).length;

	return {
		totalTerms,
		unlockedTerms,
		totalRoots: allRoots.size,
		familiarRoots,
		coverage: totalTerms > 0 ? unlockedTerms / totalTerms : 0,
		systemsWithContent: perSystem.filter((s) => s.totalTerms > 0).length,
		perSystem
	};
}
