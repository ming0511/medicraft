// 강의 추출 엔진(provider) 가용성 — 서버 env 기준.
// 설정/업로드 화면이 "어떤 엔진을 고를 수 있는지"를 알아야 전환 UI를 그릴 수 있다.
// API 키 자체는 절대 내려보내지 않고, 활성 여부만 노출.

import { env } from '$env/dynamic/private';
import { usageFor } from './llm-usage';

export type EngineId = 'deterministic' | 'gemini' | 'claude';

// UI 에서 숨길 엔진(서버 로직·폴백은 유지, 화면 노출만 제거). 'claude' 재노출 = 이 배열에서 빼면 됨.
const HIDDEN_IN_UI: EngineId[] = ['claude'];

export type EngineInfo = {
	id: EngineId;
	label: string;
	desc: string;
	free: boolean; // 무료(외부 비용 0)인가
	available: boolean; // 서버에 키가 있어 실제로 켤 수 있나
	isDefault: boolean; // env.LECTURE_LLM 기본 엔진인가
	/** 오늘 사용량(LLM 만). deterministic 은 null. */
	usage: { used: number; limit: number | null; remaining: number | null } | null;
};

/** env.LECTURE_LLM + 키 존재 여부로 기본 엔진을 결정 (extractAndDecompose 와 동일 규칙). */
export function defaultEngine(): EngineId {
	if (env.LECTURE_LLM === 'claude' && env.ANTHROPIC_API_KEY) return 'claude';
	if (env.LECTURE_LLM === 'gemini' && env.GEMINI_API_KEY) return 'gemini';
	return 'deterministic';
}

/** 켤 수 있는 엔진 목록(+가용/기본/사용량). 화면이 이걸로 토글을 그린다.
 *  HIDDEN_IN_UI 의 엔진은 제외 — 현재 claude 비노출. */
export function availableEngines(): EngineInfo[] {
	const def = defaultEngine();
	const geminiOn = !!env.GEMINI_API_KEY;
	const claudeOn = !!env.ANTHROPIC_API_KEY;
	const all: EngineInfo[] = [
		{
			id: 'deterministic',
			label: '결정적 (AI 없음)',
			desc: '이미 익힌 어근으로만 분해. 외부 호출 0 · 무제한 · 처음 보는 어근은 못 찾음.',
			free: true,
			available: true,
			isDefault: def === 'deterministic',
			usage: null
		},
		{
			id: 'gemini',
			label: 'Gemini (무료 AI)',
			desc: '처음 보는 어근까지 LLM이 추출·분해. 무료 티어 일일 한도 있음. 텍스트가 Google로 전송됨.',
			free: true,
			available: geminiOn,
			isDefault: def === 'gemini',
			usage: usageFor('gemini')
		},
		{
			id: 'claude',
			label: 'Claude (유료 AI)',
			desc: '처음 보는 어근까지 LLM이 추출·분해. 정확도 우선 · 호출당 과금.',
			free: false,
			available: claudeOn,
			isDefault: def === 'claude',
			usage: null
		}
	];
	return all.filter((e) => !HIDDEN_IN_UI.includes(e.id));
}

/** 요청된 provider 를 실제 적용 가능한 엔진으로 검증·정규화. 못 켜면 기본으로 폴백. */
export function resolveEngine(requested: string | null | undefined): EngineId {
	if (requested === 'deterministic') return 'deterministic';
	if (requested === 'gemini' && env.GEMINI_API_KEY) return 'gemini';
	if (requested === 'claude' && env.ANTHROPIC_API_KEY) return 'claude';
	return defaultEngine();
}
