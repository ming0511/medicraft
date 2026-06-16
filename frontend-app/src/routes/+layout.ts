import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { LayoutLoad } from './$types';
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from '$lib/supabase/env';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	if (!SUPABASE_ENABLED) {
		return {
			supabase: null,
			session: null,
			user: null,
			serverProfile: null,
			serverState: null,
			serverStateUpdatedAt: null
		};
	}

	const supabase = isBrowser()
		? createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
				global: { fetch }
		  })
		: createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: {
					getAll: () => data.cookies ?? []
				}
		  });

	const {
		data: { session }
	} = await supabase.auth.getSession();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	// 서버 load(+layout.server.ts)가 내려준 프로필/학습상태를 컴포넌트로 통과시킨다.
	return {
		supabase,
		session,
		user,
		serverProfile: data.serverProfile,
		serverState: data.serverState,
		serverStateUpdatedAt: data.serverStateUpdatedAt
	};
};
