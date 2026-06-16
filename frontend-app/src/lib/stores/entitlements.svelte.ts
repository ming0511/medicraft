import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductId } from '$lib/payments/products';

// 권한(해금) 조회 — 서버가 source of truth. 게스트/로그아웃 상태면 항상 미보유.
// RLS 로 자기 행만 읽히므로 클라이언트에서 직접 select 해도 안전.

export async function hasEntitlement(
	supabase: SupabaseClient | null,
	product: ProductId
): Promise<boolean> {
	if (!supabase) return false;
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return false;

	const { data, error } = await supabase
		.from('entitlements')
		.select('id, expires_at')
		.eq('user_id', user.id)
		.eq('product', product)
		.eq('status', 'active')
		.limit(1);

	if (error || !data || data.length === 0) return false;

	// 구독 만료 체크(단건결제는 expires_at = null = 영구).
	const row = data[0] as { expires_at: string | null };
	if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false;
	return true;
}
