import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, cookies }) => {
	const { session, user } = await safeGetSession();

	// 로그인 사용자면 서버 프로필 + 학습 상태를 함께 내려보낸다.
	// 클라이언트(+layout.svelte)가 localStorage 가 비어있거나 오래됐을 때 이걸로 복원.
	let serverProfile: {
		nickname: string | null;
		school: string | null;
		character: number | null;
	} | null = null;
	let serverState: Record<string, unknown> | null = null;
	let serverStateUpdatedAt: string | null = null;

	if (user && supabase) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('nickname, school, character')
			.eq('id', user.id)
			.maybeSingle();
		serverProfile = profile ?? null;

		const { data: stateRow } = await supabase
			.from('user_state')
			.select('state, updated_at')
			.eq('id', user.id)
			.maybeSingle();
		if (stateRow) {
			serverState = (stateRow.state ?? null) as Record<string, unknown> | null;
			serverStateUpdatedAt = stateRow.updated_at ?? null;
		}
	}

	return {
		session,
		user,
		cookies: cookies.getAll(),
		serverProfile,
		serverState,
		serverStateUpdatedAt
	};
};
