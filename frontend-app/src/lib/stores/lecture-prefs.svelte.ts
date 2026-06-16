// 강의별 사용자 설정 — 데일리 학습 풀에 합류할지 토글.
// PRD 시나리오 B: "통과분이 그물에 합류". 사용자가 끄면 그 강의에서 처음 들어온 어근/용어가
// 데일리 SRS 큐에서 빠짐. 강의 페이지 내 학습은 그대로 가능.

const STORAGE_KEY = 'medicraft.lectures.dailyMerge';

function load(): Record<string, boolean> {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
	} catch {
		return {};
	}
}

function persist(map: Record<string, boolean>) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

let dailyMergeMap = $state<Record<string, boolean>>(load());

/** 기본값 = true. 강의 추가 = 자동 글로벌 합류 (PRD 원안). 사용자가 끄면 false. */
export function isDailyMergeEnabled(lectureId: string): boolean {
	return dailyMergeMap[lectureId] !== false;
}

export function setDailyMergeEnabled(lectureId: string, enabled: boolean) {
	dailyMergeMap = { ...dailyMergeMap, [lectureId]: enabled };
	persist(dailyMergeMap);
}

/** 어떤 lecture에서 합류한 term/morpheme이 데일리 풀에 포함되는지.
 *  - fromLectures 비어있음 → 큐레이션 원본 = 항상 포함
 *  - fromLectures 있음 → 그 중 *하나라도* daily-merge ON이면 포함
 */
export function isFromActiveLecture(fromLectures: string[] | undefined): boolean {
	if (!fromLectures || fromLectures.length === 0) return true;
	return fromLectures.some((id) => isDailyMergeEnabled(id));
}
