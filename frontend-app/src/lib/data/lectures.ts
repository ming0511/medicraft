// 강의자료 수확 결과 = 앱이 소비하는 1급 데이터.
// scripts/extract-lecture-terms.mjs 가 lectures/{id}.json 으로 출력하면 여기서 import.
// PRD §3 시나리오 B = "강의자료 수확 (개인화/프리미엄 레이어)" 의 데이터 표면.

import cardiologyWeek3 from './lectures/cardiology-week-3.json';

/** 각 morpheme part 의 NBK 대조 결과. */
export type LecturePartStatus =
	/** morphemes.ts 에 있고 검수됨. */
	| 'verified'
	/** candidate-morphemes-draft.json 에 있음 (NBK 출처). */
	| 'candidate'
	/** 새 어근, NBK 에서 찾음. */
	| 'unverified-with-source'
	/** 새 어근, NBK 에도 없음. */
	| 'unverified-no-source';

export type LectureClassifiedPart = {
	id: string;
	status: LecturePartStatus;
	source?: string;
	meaning?: string;
	nbkMeaning?: string;
	bucket?: string;
};

/** 어근 분해 후 각 part의 분류 (스크립트 출력 형식과 동기). */
export type LectureTerm = {
	/** 영어 의학용어 (표시용). */
	term: string;
	/** morpheme id 배열. terms.ts 의 Term.parts 와 동일 의미. */
	parts: string[];
	/** 항상 false (수확 단계는 미검수). */
	verified: false;
	/** terms.ts 에 이미 있는 용어인가. */
	already_in_terms: boolean;
	/** 모든 parts 가 morphemes.ts 검수된 어근인가. true 면 자동 합류 자격. */
	all_parts_verified: boolean;
	/** 출처 없는 새 어근이 있어 검수자 결정 필요한가. */
	needs_curator: boolean;
	/** 각 part 의 NBK 대조 결과 (표시·필터링용). */
	classified: LectureClassifiedPart[];
};

export type LectureCandidate = {
	id: string;
	bucket?: string;
	source: string;
	verified: false;
	nbkMeaning: string;
	usedIn: string[];
};

export type LectureNeedsCurator = {
	id: string;
	usedIn: string[];
};

export type LectureSet = {
	_meta: {
		generated: string;
		fixture: string;
		pipeline: string;
		llm_runtime: string;
		llm_hook: string;
		next_step: string;
	};
	fixture: {
		title: string;
		source: string;
		body: string;
	};
	extracted_terms: string[];
	eval: {
		extraction_precision: number;
		extraction_recall: number;
		decomposition_coverage: number;
		citation_coverage: number;
		auto_merge_rate: number | null;
		counts: {
			extracted: number;
			already_in_terms: number;
			auto_mergeable: number;
			after_candidate_promotion: number;
			blocked_on_curator: number;
		};
	};
	terms: LectureTerm[];
	candidate_morphemes: LectureCandidate[];
	needs_curator: LectureNeedsCurator[];
};

/** 앱이 보여줄 강의 1건. lecture-set JSON 의 얇은 wrapper. */
export interface Lecture {
	id: string;
	/** 표시용 제목. 짧은 라벨 (캠퍼스 카드용). */
	shortLabel: string;
	/** body system 태그. CATEGORIES 키. */
	system: string;
	set: LectureSet;
}

export const lectures: Lecture[] = [
	{
		id: 'cardiology-week-3',
		shortLabel: 'Cardiology · Week 3',
		system: 'cardiology',
		set: cardiologyWeek3 as LectureSet
	}
];

export function lectureById(id: string): Lecture | undefined {
	return lectures.find((l) => l.id === id);
}

/** 한 강의에서 자동 합류된(이미 terms.ts에 있는) 용어 id 목록 — 학습 큐 부스트용. */
export function mergedTermsFromLecture(lec: Lecture): string[] {
	return lec.set.terms.filter((t) => t.already_in_terms || t.all_parts_verified).map((t) => t.term);
}

/** 한 강의가 가져온 *새* 어근 id 목록 (자동 합류된 새 용어가 사용하는 어근). */
export function mergedMorphemesFromLecture(lec: Lecture): string[] {
	const ids = new Set<string>();
	for (const t of lec.set.terms) {
		if (t.already_in_terms || t.all_parts_verified) {
			for (const p of t.parts) ids.add(p);
		}
	}
	return [...ids];
}
