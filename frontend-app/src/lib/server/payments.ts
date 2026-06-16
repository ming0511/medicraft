// 서버 전용 토스 결제 승인 + 권한 부여 로직.
import { env } from '$env/dynamic/private';
import { getProduct } from '$lib/payments/products';
import { getAdminClient } from './supabase-admin';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

export type ConfirmResult =
	| { ok: true; product: string; amount: number; alreadyGranted: boolean }
	| { ok: false; code: string; message: string };

function authHeader(): string | null {
	const secret = env.TOSS_SECRET_KEY ?? '';
	if (!secret) return null;
	// 토스 인증: Basic base64(secretKey + ":") — 비밀번호 없는 Basic 인증.
	return 'Basic ' + Buffer.from(secret + ':').toString('base64');
}

/**
 * 토스 결제 승인 → 검증 → entitlements 삽입.
 * 멱등: order_id unique 제약으로 중복 승인/새로고침은 alreadyGranted 로 흡수.
 */
export async function confirmAndGrant(params: {
	userId: string;
	paymentKey: string;
	orderId: string;
	amount: number;
	productId: string;
}): Promise<ConfirmResult> {
	const { userId, paymentKey, orderId, amount, productId } = params;

	const product = getProduct(productId);
	if (!product) {
		return { ok: false, code: 'INVALID_PRODUCT', message: '알 수 없는 상품입니다.' };
	}
	// 금액 위변조 방지: 클라이언트가 보낸 금액이 카탈로그와 일치해야 함.
	if (amount !== product.amount) {
		return { ok: false, code: 'AMOUNT_MISMATCH', message: '결제 금액이 상품 가격과 일치하지 않습니다.' };
	}

	const admin = getAdminClient();
	if (!admin) {
		return { ok: false, code: 'NO_ADMIN', message: '서버 결제 설정이 누락되었습니다(service_role).' };
	}

	// 이미 같은 주문이 승인됐으면 멱등 반환 (새로고침/중복 콜백).
	const { data: existing } = await admin
		.from('entitlements')
		.select('id')
		.eq('order_id', orderId)
		.maybeSingle();
	if (existing) {
		return { ok: true, product: productId, amount, alreadyGranted: true };
	}

	const auth = authHeader();
	if (!auth) {
		return { ok: false, code: 'NO_SECRET', message: '서버 결제 설정이 누락되었습니다(secret key).' };
	}

	// 결제 시도 기록(requested → confirmed/failed).
	await admin.from('payments').insert({
		user_id: userId,
		order_id: orderId,
		payment_key: paymentKey,
		product: productId,
		amount,
		status: 'requested'
	});

	let tossRes: Response;
	try {
		tossRes = await fetch(TOSS_CONFIRM_URL, {
			method: 'POST',
			headers: { Authorization: auth, 'Content-Type': 'application/json' },
			body: JSON.stringify({ paymentKey, orderId, amount })
		});
	} catch (e) {
		await admin.from('payments').insert({
			user_id: userId,
			order_id: orderId,
			payment_key: paymentKey,
			product: productId,
			amount,
			status: 'failed',
			raw: { error: String(e) }
		});
		return { ok: false, code: 'NETWORK', message: '결제 서버 연결에 실패했습니다.' };
	}

	const body = await tossRes.json();

	if (!tossRes.ok) {
		await admin.from('payments').insert({
			user_id: userId,
			order_id: orderId,
			payment_key: paymentKey,
			product: productId,
			amount,
			status: 'failed',
			raw: body
		});
		return {
			ok: false,
			code: body?.code ?? 'TOSS_ERROR',
			message: body?.message ?? '결제 승인에 실패했습니다.'
		};
	}

	// 승인 성공 — 권한 부여 + 결제 confirmed 기록.
	const expiresAt =
		product.kind === 'subscription' && product.durationDays
			? new Date(Date.now() + product.durationDays * 86400_000).toISOString()
			: null;

	const { error: grantErr } = await admin.from('entitlements').insert({
		user_id: userId,
		product: productId,
		order_id: orderId,
		payment_key: paymentKey,
		amount,
		status: 'active',
		expires_at: expiresAt
	});

	// unique(order_id) 충돌 = 동시 콜백 경쟁 → 이미 부여된 것으로 간주(멱등).
	if (grantErr && grantErr.code !== '23505') {
		await admin.from('payments').insert({
			user_id: userId,
			order_id: orderId,
			payment_key: paymentKey,
			product: productId,
			amount,
			status: 'failed',
			raw: { grantError: grantErr.message, toss: body }
		});
		return { ok: false, code: 'GRANT_FAILED', message: '권한 부여에 실패했습니다.' };
	}

	await admin.from('payments').insert({
		user_id: userId,
		order_id: orderId,
		payment_key: paymentKey,
		product: productId,
		amount,
		status: 'confirmed',
		raw: body
	});

	return { ok: true, product: productId, amount, alreadyGranted: false };
}
