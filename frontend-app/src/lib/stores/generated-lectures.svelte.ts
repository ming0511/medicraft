// 사용자가 업로드/추출한 강의자료 = 클라이언트 로컬 저장(백엔드 없음).
// /api/lectures/extract 가 만든 LectureSet 을 localStorage 에 보관 →
// /lectures, /lectures/[id], /lectures/[id]/{classroom,library} 가 정적 lecture 와 함께 해소.

import { browser } from '$app/environment';
import { lectureById, type Lecture } from '$lib/data/lectures';

const KEY = 'medicraft.lectures.generated';
// 내장(정적) 강의는 지울 수 없으니 "숨긴" id 만 따로 보관 → 목록에서 제외.
const HIDDEN_KEY = 'medicraft.lectures.hiddenBuiltins';

let generated = $state<Lecture[]>([]);
let hiddenBuiltins = $state<string[]>([]);
let loaded = false;

function load() {
	if (loaded || !browser) return;
	loaded = true;
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) generated = JSON.parse(raw) as Lecture[];
	} catch {
		generated = [];
	}
	try {
		const raw = localStorage.getItem(HIDDEN_KEY);
		if (raw) hiddenBuiltins = JSON.parse(raw) as string[];
	} catch {
		hiddenBuiltins = [];
	}
}

function persist() {
	if (browser) localStorage.setItem(KEY, JSON.stringify(generated));
}

function persistHidden() {
	if (browser) localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenBuiltins));
}

/** 사용자가 추출해 모은 강의들 (최신순). */
export function generatedLectures(): Lecture[] {
	load();
	return generated;
}

export function addGeneratedLecture(lec: Lecture) {
	load();
	generated = [lec, ...generated.filter((l) => l.id !== lec.id)];
	persist();
}

export function removeGeneratedLecture(id: string) {
	load();
	generated = generated.filter((l) => l.id !== id);
	persist();
}

/** 숨긴 내장 강의 id 목록. */
export function hiddenBuiltinIds(): string[] {
	load();
	return hiddenBuiltins;
}

/** 내장(정적) 강의를 목록에서 숨김. */
export function hideBuiltinLecture(id: string) {
	load();
	if (!hiddenBuiltins.includes(id)) {
		hiddenBuiltins = [...hiddenBuiltins, id];
		persistHidden();
	}
}

/** id → Lecture. 생성된 것 우선, 없으면 정적(내장) lecture. */
export function resolveLecture(id: string): Lecture | undefined {
	load();
	return generated.find((l) => l.id === id) ?? lectureById(id);
}
