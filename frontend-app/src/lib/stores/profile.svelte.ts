import type { SupabaseClient } from '@supabase/supabase-js';

export type Profile = {
	nickname: string;
	school: string;
	character: 0 | 1 | 2 | 3;
};

const KEY = 'medicraft.profile';

export function loadProfile(): Profile | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		return JSON.parse(raw) as Profile;
	} catch {
		return null;
	}
}

export function saveProfile(p: Profile) {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
	} catch {
		// ignore
	}
}

export async function syncProfileToServer(
	p: Profile,
	supabase: SupabaseClient | null
): Promise<void> {
	if (!supabase) return;
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return;
	await supabase.from('profiles').upsert(
		{
			id: user.id,
			nickname: p.nickname,
			school: p.school || null,
			character: p.character,
			updated_at: new Date().toISOString()
		},
		{ onConflict: 'id' }
	);
}
