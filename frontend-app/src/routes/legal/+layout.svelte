<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	let { children } = $props();

	function goBack() {
		if (typeof history === 'undefined') return;
		if (history.length > 1) {
			history.back();
		} else {
			goto('/');
		}
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={goBack} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">약관</div>
		<div style="width:36px"></div>
	</header>
	<div class="body">
		{@render children()}
	</div>
</div>

<style>
	.page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 16px 22px 32px;
	}
	.body :global(h1) {
		font-size: 22px;
		font-weight: 800;
		margin-top: 12px;
	}
	.body :global(h2) {
		font-size: 16px;
		font-weight: 700;
		margin-top: 24px;
	}
	.body :global(p),
	.body :global(li) {
		font-size: 14px;
		line-height: 1.65;
		color: var(--ink);
	}
	.body :global(ul) {
		padding-left: 18px;
		margin-top: 6px;
	}
	.body :global(.disclaimer) {
		margin: 10px 0 18px;
		padding: 12px 14px;
		background: #fff8e1;
		border: 1px solid #ffe0a3;
		border-radius: var(--r-md);
		font-size: 13px;
		color: #8a6300;
	}
	.body :global(.version) {
		font-size: 12px;
		color: var(--mut);
		margin-top: 4px;
	}
</style>
