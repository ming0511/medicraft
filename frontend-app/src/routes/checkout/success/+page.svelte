<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import { getProduct } from '$lib/payments/products';

	let { data } = $props();
	const product = $derived(getProduct(data.product));
</script>

<div class="page">
	<div class="center">
		{#if data.ok}
			<div class="badge ok"><Icon name="check" size={36} /></div>
			<h1>{data.message}</h1>
			{#if product}<p class="sub">{product.name} 해금 완료</p>{/if}
			<button class="pill-btn pill-btn--primary" onclick={() => goto('/emergency')}>응급실로 가기</button>
			<button class="pill-btn pill-btn--ghost" onclick={() => goto('/campus')}>캠퍼스로</button>
		{:else}
			<div class="badge fail"><Icon name="frown" size={36} /></div>
			<h1>결제를 완료하지 못했어요</h1>
			<p class="sub">{data.message}</p>
			{#if product}
				<button class="pill-btn pill-btn--primary" onclick={() => goto(`/checkout/${product.id}`)}>다시 시도</button>
			{/if}
			<button class="pill-btn pill-btn--ghost" onclick={() => goto('/campus')}>캠퍼스로</button>
		{/if}
	</div>
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; background: #fff; }
	.center { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; text-align: center; width: 100%; max-width: 320px; }
	.badge { width: 76px; height: 76px; border-radius: 999px; display: grid; place-items: center; color: #fff; margin-bottom: 6px; }
	.badge.ok { background: var(--brand); }
	.badge.fail { background: #e7607a; }
	h1 { font-size: 19px; font-weight: 800; color: var(--ink); }
	.sub { font-size: 13.5px; color: var(--mut); line-height: 1.5; margin-bottom: 8px; }
	.pill-btn { width: 100%; }
</style>
