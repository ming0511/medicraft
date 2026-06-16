// 학습 상태 크로스기기 동기화 (JSONB 블롭 미러 + last-write-wins).
//
// 여러 localStorage 키를 유저당 한 행(user_state.state)에 미러링한다.
// - 로그인 시: 서버가 더 최신이면 localStorage 로 복원(hydrateFromServer).
// - 저장 시: 추적 키가 바뀌면 디바운스 후 서버로 push(scheduleSync → pushNow).
// 로그인 안 했거나 Supabase 미설정이면 전부 no-op → localStorage 단독 동작(기존과 동일).
//
// profile/consents 는 전용 테이블이 따로 있어 여기서 다루지 않는다.

import type { SupabaseClient } from '@supabase/supabase-js';

// 동기화 대상 = 학습 상태 키. (profile/consents 제외 — 전용 테이블)
const TRACKED_KEYS = [
	'mediflash_srs',
	'mediflash_settings',
	'medicraft.progress',
	'mediflash_root_stats',
	'mediflash_badges',
	'mediflash_wrong',
	'mediflash_day_streak',
	'medicraft.lectures.generated',
	'medicraft.lectures.hiddenBuiltins',
	'medicraft.lectures.dailyMerge',
	'medicraft.scope'
] as const;

// 로컬 미러의 마지막 갱신 시각(ISO). 서버 updated_at 과 비교해 충돌 해결.
const META_KEY = 'medicraft.sync.updatedAt';

let client: SupabaseClient | null = null;
let userId: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function lsAvailable(): boolean {
	return typeof localStorage !== 'undefined';
}

/** 추적 키들의 현재 로컬 값을 하나의 객체로 스냅샷. */
function snapshotLocal(): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (!lsAvailable()) return out;
	for (const key of TRACKED_KEYS) {
		const raw = localStorage.getItem(key);
		if (raw == null) continue;
		try {
			out[key] = JSON.parse(raw);
		} catch {
			// 깨진 값은 건너뜀
		}
	}
	return out;
}

/** 서버 블롭을 localStorage 로 적용(복원). */
function applyServerState(state: Record<string, unknown>) {
	if (!lsAvailable() || !state) return;
	for (const key of TRACKED_KEYS) {
		if (!(key in state)) continue;
		try {
			localStorage.setItem(key, JSON.stringify(state[key]));
		} catch {
			// ignore
		}
	}
}

function localUpdatedAt(): string {
	if (!lsAvailable()) return '';
	return localStorage.getItem(META_KEY) ?? '';
}

function setLocalUpdatedAt(iso: string) {
	if (lsAvailable()) localStorage.setItem(META_KEY, iso);
}

/** 로그인 컨텍스트 등록 — 이후 scheduleSync/pushNow 가 활성화된다. */
export function setSyncContext(supabase: SupabaseClient | null, uid: string | null) {
	client = supabase;
	userId = uid;
}

/** 로그아웃 — push 중단, 컨텍스트 해제. (로컬 데이터는 건드리지 않음) */
export function clearSyncContext() {
	client = null;
	userId = null;
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
}

/** 추적 키가 바뀌었을 때 호출 — 디바운스 후 서버에 push. */
export function scheduleSync() {
	if (!client || !userId) return;
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		timer = null;
		void pushNow();
	}, 1500);
}

/** 즉시 서버에 push (visibilitychange/beforeunload 등에서 사용). */
export async function pushNow(): Promise<void> {
	if (!client || !userId) return;
	const iso = new Date().toISOString();
	const { error } = await client
		.from('user_state')
		.upsert({ id: userId, state: snapshotLocal(), updated_at: iso }, { onConflict: 'id' });
	if (!error) setLocalUpdatedAt(iso);
}

/**
 * "모든 데이터 초기화" — 서버의 학습 상태 + 프로필 행까지 삭제.
 * (consents 는 법적 동의 기록이라 남긴다.) 이걸 안 하면 재로그인 시 서버가 다시 복원해버림.
 */
export async function wipeServerState(supabase: SupabaseClient | null): Promise<void> {
	const uid = userId;
	clearSyncContext();
	if (lsAvailable()) localStorage.removeItem(META_KEY);
	if (supabase && uid) {
		await supabase.from('user_state').delete().eq('id', uid);
		await supabase.from('profiles').delete().eq('id', uid);
	}
}

/**
 * 회원 탈퇴/완전 초기화용 — 추적 학습상태 키 + 동기화 메타를 로컬에서 제거.
 * (profile/progress 등 비추적 키는 호출부에서 별도 정리.)
 */
export function wipeLocalState() {
	clearSyncContext();
	if (!lsAvailable()) return;
	for (const key of TRACKED_KEYS) localStorage.removeItem(key);
	localStorage.removeItem(META_KEY);
}

/**
 * 로그인 직후 서버 상태로 복원할지 결정.
 * 서버 updated_at 이 로컬 미러보다 새로우면 적용(다른 기기에서 진행). 아니면 로컬 유지.
 * 로컬에 미러 기록이 없으면(이 기기 첫 로그인) 서버 값을 받아온다.
 */
export function hydrateFromServer(
	serverState: Record<string, unknown> | null,
	serverUpdatedAt: string | null
) {
	if (!serverState || !serverUpdatedAt) return;
	const local = localUpdatedAt();
	if (local && local >= serverUpdatedAt) return; // 로컬이 같거나 더 최신 → 유지
	applyServerState(serverState);
	setLocalUpdatedAt(serverUpdatedAt);
}
