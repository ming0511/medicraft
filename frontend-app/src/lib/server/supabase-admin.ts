// 서버 전용 Supabase 클라이언트 (service_role). RLS 우회 — 결제 승인 후 entitlements 삽입용.
// 절대 클라이언트 번들에 들어가면 안 됨 ($lib/server/* 는 SvelteKit 이 서버 전용 보장).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { SUPABASE_URL } from '$lib/supabase/env';

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient | null {
	const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
	if (!SUPABASE_URL || !key) return null;
	if (cached) return cached;
	cached = createClient(SUPABASE_URL, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	return cached;
}
