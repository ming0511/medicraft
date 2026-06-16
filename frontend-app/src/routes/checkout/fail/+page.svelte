<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	// 토스 failUrl 은 ?code=...&message=...&orderId=... 로 복귀.
	const message = $derived(page.url.searchParams.get('message') ?? '결제가 취소되었거나 실패했습니다.');
	const code = $derived(page.url.searchParams.get('code') ?? '');
</script>

<div class="page">
	<div class="center">
		<div class="badge"><Icon name="frown" size={36} /></div>
		<h1>결제가 진행되지 않았어요</h1>
		<p class="sub">{message}{#if code}<br /><span class="code">({code})</span>{/if}</p>
		<button class="pill-btn pill-btn--primary" onclick={() => history.back()}>다시 시도</button>
		<button class="pill-btn pill-btn--ghost" onclick={() => goto('/campus')}>캠퍼스로</button>
	</div>
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; background: #fff; }
	.center { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; text-align: center; width: 100%; max-width: 320px; }
	.badge { width: 76px; height: 76px; border-radius: 999px; display: grid; place-items: center; color: #fff; background: #e7607a; margin-bottom: 6px; }
	h1 { font-size: 19px; font-weight: 800; color: var(--ink); }
	.sub { font-size: 13.5px; color: var(--mut); line-height: 1.5; margin-bottom: 8px; }
	.code { font-size: 11.5px; color: var(--mut); }
	.pill-btn { width: 100%; }
</style>
