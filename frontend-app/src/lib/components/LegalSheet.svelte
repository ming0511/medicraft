<script lang="ts">
	import Icon from './Icon.svelte';
	import TermsContent from './legal/TermsContent.svelte';
	import PrivacyContent from './legal/PrivacyContent.svelte';
	import type { ConsentDoc } from '$lib/supabase/types';

	type Props = {
		open: boolean;
		doc: ConsentDoc | null;
		onClose: () => void;
	};
	let { open, doc, onClose }: Props = $props();

	const TITLES: Record<string, string> = {
		terms: '이용약관',
		privacy: '개인정보 처리방침'
	};

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKey} />

{#if open && doc}
	<div class="overlay" role="dialog" aria-modal="true" aria-label={TITLES[doc] ?? '약관'}>
		<button class="backdrop" aria-label="닫기" onclick={onClose}></button>
		<div class="sheet">
			<header class="bar">
				<div class="title">{TITLES[doc] ?? '약관'}</div>
				<button class="close" onclick={onClose} aria-label="닫기">
					<Icon name="x" size={20} />
				</button>
			</header>
			<div class="content">
				{#if doc === 'terms'}
					<TermsContent />
				{:else if doc === 'privacy'}
					<PrivacyContent />
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(20, 30, 50, 0.4);
		border: 0;
		padding: 0;
		cursor: pointer;
		animation: fadeIn 0.15s ease-out;
	}
	.sheet {
		position: relative;
		width: 100%;
		max-width: 420px;
		height: 86%;
		background: #fff;
		border-radius: var(--r-lg) var(--r-lg) 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slideUp 0.22s ease-out;
		box-shadow: 0 -10px 30px rgba(20, 30, 50, 0.18);
	}
	.bar {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--line);
		background: #fff;
	}
	.title {
		font-size: 15px;
		font-weight: 700;
		color: var(--ink);
	}
	.close {
		width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		background: transparent;
		color: var(--ink);
		border-radius: 999px;
		cursor: pointer;
	}
	.close:hover { background: var(--card); }

	.content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 16px 22px 32px;
	}
	.content :global(h1) {
		font-size: 22px;
		font-weight: 800;
		margin-top: 12px;
	}
	.content :global(h2) {
		font-size: 16px;
		font-weight: 700;
		margin-top: 22px;
	}
	.content :global(p),
	.content :global(li) {
		font-size: 14px;
		line-height: 1.65;
		color: var(--ink);
	}
	.content :global(ul) {
		padding-left: 18px;
		margin-top: 6px;
	}
	.content :global(.disclaimer) {
		margin: 10px 0 18px;
		padding: 12px 14px;
		background: #fff8e1;
		border: 1px solid #ffe0a3;
		border-radius: var(--r-md);
		font-size: 13px;
		color: #8a6300;
	}
	.content :global(.version) {
		font-size: 12px;
		color: var(--mut);
		margin-top: 4px;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
</style>
