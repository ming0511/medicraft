import { json, error } from '@sveltejs/kit';
import { getAdminClient } from '$lib/server/supabase-admin';
import type { RequestHandler } from './$types';

// 회원 탈퇴 — 계정과 연관 데이터 영구 삭제.
// auth.users 행을 지우면 FK(on delete cascade)로 profiles·consents·entitlements·user_state 가
// 함께 삭제된다. payments 만 on delete set null (정산·감사 로그라 user_id 만 끊고 보존).
export const DELETE: RequestHandler = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, '로그인 상태가 아닙니다');

	const admin = getAdminClient();
	if (!admin) throw error(503, '탈퇴 처리를 사용할 수 없습니다');

	const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
	if (delErr) throw error(500, delErr.message);

	// 현재 브라우저 세션 쿠키 무효화 (계정은 이미 삭제됨 — 로컬 정리 목적)
	await supabase?.auth.signOut();

	return json({ ok: true });
};
