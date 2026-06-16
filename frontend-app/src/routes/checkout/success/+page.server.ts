import type { PageServerLoad } from './$types';
import { confirmAndGrant } from '$lib/server/payments';

export const load: PageServerLoad = async ({ url, locals }) => {
	const paymentKey = url.searchParams.get('paymentKey');
	const orderId = url.searchParams.get('orderId');
	const amountRaw = url.searchParams.get('amount');
	const product = url.searchParams.get('product') ?? '';
	const amount = amountRaw ? Number(amountRaw) : NaN;

	if (!paymentKey || !orderId || !Number.isFinite(amount)) {
		return { ok: false, code: 'BAD_PARAMS', message: '결제 정보가 올바르지 않습니다.', product };
	}

	const { user } = await locals.safeGetSession();
	if (!user) {
		return { ok: false, code: 'NO_SESSION', message: '로그인이 만료되었습니다. 다시 로그인해 주세요.', product };
	}

	const result = await confirmAndGrant({
		userId: user.id,
		paymentKey,
		orderId,
		amount,
		productId: product
	});

	if (result.ok) {
		return { ok: true, product, message: result.alreadyGranted ? '이미 결제된 상품입니다.' : '결제가 완료되었습니다.' };
	}
	return { ok: false, code: result.code, message: result.message, product };
};
