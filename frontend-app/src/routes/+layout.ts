import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { LayoutLoad } from './$types';
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from '$lib/supabase/env';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	if (!SUPABASE_ENABLED) {
		return { supabase: null, session: null, user: null };
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

	return { supabase, session, user };
};
