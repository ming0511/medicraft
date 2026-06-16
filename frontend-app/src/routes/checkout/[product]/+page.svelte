<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { TOSS_CLIENT_KEY, PAYMENTS_ENABLED } from '$lib/payments/env';
	import { getProduct } from '$lib/payments/products';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	const product = $derived(getProduct(page.params.product ?? ''));
	const user = $derived(data.user);

	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let errMsg = $state('');
	let paying = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let widgets = $state<any>(null);

	function newOrderId(productId: string): string {
		// 토스 orderId: 6~64자 영숫자/-/_. 멱등 키로 서버가 그대로 사용.
		const rand =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
		return `${productId}-${rand}`.slice(0, 64);
	}

	onMount(async () => {
		if (!product) {
			status = 'error';
			errMsg = '존재하지 않는 상품입니다.';
			return;
		}
		if (!PAYMENTS_ENABLED) {
			status = 'error';
			errMsg = '결제가 아직 설정되지 않았습니다. (PUBLIC_TOSS_CLIENT_KEY 누락)';
			return;
		}
		if (!user) {
			// 로그인해야 권한을 계정에 귀속 가능.
			status = 'error';
			errMsg = '결제하려면 로그인이 필요합니다.';
			return;
		}

		try {
			const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk');
			const toss = await loadTossPayments(TOSS_CLIENT_KEY);
			widgets = toss.widgets({ customerKey: user.id ?? ANONYMOUS });
			await widgets.setAmount({ currency: 'KRW', value: product.amount });
			await Promise.all([
				widgets.renderPaymentMethods({ selector: '#toss-methods', variantKey: 'DEFAULT' }),
				widgets.renderAgreement({ selector: '#toss-agreement', variantKey: 'AGREEMENT' })
			]);
			status = 'ready';
		} catch (e) {
			status = 'error';
			errMsg = '결제창을 불러오지 못했습니다.';
			console.error(e);
		}
	});

	async function pay() {
		if (!widgets || !product || paying) return;
		paying = true;
		try {
			await widgets.requestPayment({
				orderId: newOrderId(product.id),
				orderName: product.name,
				successUrl: `${page.url.origin}/checkout/success?product=${product.id}`,
				failUrl: `${page.url.origin}/checkout/fail`
			});
		} catch (e) {
			// 사용자 취소 등 — 결제창이 닫힘.
			paying = false;
			console.error(e);
		}
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">결제</div>
		<div style="width:36px"></div>
	</header>

	<div class="scroll">
		{#if product}
			<div class="card pad summary">
				<div class="s-name">{product.name}</div>
				<div class="s-desc">{product.desc}</div>
				<div class="s-amount">{product.amount.toLocaleString()}<small>원</small></div>
			</div>
		{/if}

		{#if status === 'error'}
			<div class="card pad err">
				<Icon name="frown" size={20} />
				<p>{errMsg}</p>
				{#if !user}
					<button class="pill-btn pill-btn--primary" onclick={() => goto('/')}>로그인하러 가기</button>
				{/if}
			</div>
		{:else}
			{#if status === 'loading'}<div class="loading">결제창 불러오는 중…</div>{/if}
			<div id="toss-methods"></div>
			<div id="toss-agreement"></div>
			{#if status === 'ready'}
				<button class="pill-btn pill-btn--primary pay-btn" onclick={pay} disabled={paying}>
					{paying ? '처리 중…' : `${product?.amount.toLocaleString()}원 결제하기`}
				</button>
				<p class="test-note">토스 테스트 모드 — 실제 결제가 발생하지 않습니다.</p>
			{/if}
		{/if}
		<div class="bottom-space"></div>
	</div>
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 0; }
	.card.pad { padding: 18px; }
	.summary { margin-bottom: 12px; }
	.s-name { font-size: 16px; font-weight: 800; color: var(--ink); }
	.s-desc { font-size: 13px; color: var(--mut); line-height: 1.5; margin-top: 6px; }
	.s-amount { margin-top: 14px; font-size: 28px; font-weight: 900; color: var(--brand-d); }
	.s-amount small { font-size: 15px; font-weight: 700; margin-left: 2px; }
	.loading { text-align: center; color: var(--mut); padding: 28px 0; font-size: 14px; }
	.err { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: var(--ink-2); }
	.err p { font-size: 14px; line-height: 1.5; }
	.pay-btn { width: 100%; margin-top: 16px; }
	.test-note { text-align: center; font-size: 11.5px; color: var(--mut); margin-top: 10px; }
	.bottom-space { height: 40px; }
</style>
