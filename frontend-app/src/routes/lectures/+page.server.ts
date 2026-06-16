import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

// 입력창 안내 문구를 실제 동작 모드에 맞추기 위해 서버 설정(env)을 모드 라벨로만 내려보낸다.
// (API 키 자체는 절대 노출하지 않음 — 활성 여부만.)
export const load: PageServerLoad = () => {
	const provider = env.LECTURE_LLM;
	let extractMode: 'deterministic' | 'claude' | 'gemini' = 'deterministic';
	if (provider === 'claude' && env.ANTHROPIC_API_KEY) extractMode = 'claude';
	else if (provider === 'gemini' && env.GEMINI_API_KEY) extractMode = 'gemini';
	return { extractMode };
};
