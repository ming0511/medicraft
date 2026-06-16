import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from './profile.svelte';
import type { Progress } from './progress.svelte';

// 랭킹(리더보드) — Supabase profiles 행을 source of truth 로 사용.
// 로그인 사용자만 점수가 서버에 쌓이고 서로의 순위를 봄.
// 게스트/Supabase 미설정 시에는 랭킹 페이지가 로컬 시뮬레이션으로 폴백.

export type LeaderboardEntry = {
	id: string;
	nick: string;
	school: string;
	char: 0 | 1 | 2 | 3;
	xp: number;
	me?: boolean;
};

type ProfileRow = {
	id: string;
	nickname: string | null;
	school: string | null;
	character: number | null;
	xp: number | null;
};

/** 내 점수를 서버에 반영 (로그인 상태에서만). profiles 행을 upsert 해 항상 완전한 행 유지. */
export async function syncStatsToServer(
	profile: Profile,
	progress: Progress,
	supabase: SupabaseClient | null
): Promise<void> {
	if (!supabase) return;
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return;
	const now = new Date().toISOString();
	await supabase.from('profiles').upsert(
		{
			id: user.id,
			nickname: profile.nickname,
			school: profile.school || null,
			character: profile.character,
			xp: progress.xp,
			stats_updated_at: now,
			updated_at: now
		},
		{ onConflict: 'id' }
	);
}

/**
 * 전체 랭킹을 가져옴. 로그인 사용자만 가능(RLS).
 * 로그인 안 했거나 Supabase 미설정이면 null 반환 → 호출부에서 폴백.
 */
export async function fetchLeaderboard(
	supabase: SupabaseClient | null
): Promise<LeaderboardEntry[] | null> {
	if (!supabase) return null;
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return null;

	const { data, error } = await supabase
		.from('profiles')
		.select('id, nickname, school, character, xp')
		.order('xp', { ascending: false })
		.limit(200);

	if (error || !data) return null;

	return (data as ProfileRow[])
		.filter((r) => r.nickname) // 온보딩 미완료(닉네임 없음) 행 제외
		.map((r) => ({
			id: r.id,
			nick: r.nickname as string,
			school: r.school || '학교 미입력',
			char: ((r.character ?? 0) as 0 | 1 | 2 | 3),
			xp: r.xp ?? 0,
			me: r.id === user.id
		}));
}
