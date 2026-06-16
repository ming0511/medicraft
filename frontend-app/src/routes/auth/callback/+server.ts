import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	// next = 로그인 후 원래 가려던 곳(딥링크). 기본은 앱 홈.
	const next = url.searchParams.get('next') ?? '/campus';

	if (code && supabase) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			// 재방문자(온보딩 완료)는 이전 상태로 바로, 신규는 온보딩으로.
			// 가입 시 트리거가 빈 프로필 행을 만들므로 '행 존재'가 아니라 'nickname 채워짐'으로 판정.
			const {
				data: { user }
			} = await supabase.auth.getUser();
			let onboarded = false;
			if (user) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('nickname')
					.eq('id', user.id)
					.maybeSingle();
				onboarded = Boolean(profile?.nickname?.trim());
			}
			throw redirect(303, onboarded ? next : '/onboarding');
		}
	}

	throw redirect(303, '/?auth_error=1');
};
