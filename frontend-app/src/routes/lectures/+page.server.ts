import type { PageServerLoad } from './$types';
import { availableEngines, defaultEngine } from '$lib/server/lecture-engines';

// 입력창 안내·엔진 전환·일일 사용량 표시를 위해 서버 설정(env)을 화면에 내려보낸다.
// (API 키 자체는 절대 노출하지 않음 — 활성 여부·일일 사용량만.)
export const load: PageServerLoad = () => {
	const def = defaultEngine();
	// extractMode = 안내 문구용 기본 엔진 라벨(기존 호환).
	return { extractMode: def, engines: availableEngines(), defaultEngine: def };
};
