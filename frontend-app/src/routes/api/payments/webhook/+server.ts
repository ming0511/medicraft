import { json, type RequestHandler } from '@sveltejs/kit';
import { getAdminClient } from '$lib/server/supabase-admin';

// 토스 웹훅 — 결제 상태 변경(취소/환불) 동기화용.
// 토스 개발자센터 → 웹훅 에 이 URL(.../api/payments/webhook) 등록.
// 운영 전환 시: 수신 IP 화이트리스트 또는 paymentKey 재조회로 위변조 검증 권장.
export const POST: RequestHandler = async ({ request }) => {
	const admin = getAdminClient();
	if (!admin) return json({ ok: false }, { status: 503 });

	let payload: any;
	try {
		payload = await request.json();
	} catch {
		return json({ ok: false }, { status: 400 });
	}

	const eventType: string = payload?.eventType ?? '';
	const data = payload?.data ?? {};
	const orderId: string | undefined = data?.orderId;
	const tossStatus: string | undefined = data?.status;

	// 감사 로그.
	await admin.from('payments').insert({
		order_id: orderId ?? 'unknown',
		payment_key: data?.paymentKey ?? null,
		amount: data?.totalAmount ?? null,
		status: tossStatus === 'DONE' ? 'confirmed' : 'requested',
		raw: payload
	});

	// 취소/부분취소 → 해당 권한 회수.
	if (
		orderId &&
		(eventType === 'PAYMENT_STATUS_CHANGED' || eventType === 'CANCEL') &&
		(tossStatus === 'CANCELED' || tossStatus === 'PARTIAL_CANCELED')
	) {
		await admin.from('entitlements').update({ status: 'refunded' }).eq('order_id', orderId);
	}

	return json({ ok: true });
};
