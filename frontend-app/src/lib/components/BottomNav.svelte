<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	type Tab = 'campus' | 'dex' | 'ranking' | 'settings';
	let { active }: { active: Tab } = $props();

	const TABS: { id: Tab; icon: IconName; label: string; href: string }[] = [
		{ id: 'campus', icon: 'home', label: '캠퍼스', href: '/campus' },
		{ id: 'dex', icon: 'collection', label: '도감', href: '/dex' },
		{ id: 'ranking', icon: 'trophy', label: '랭킹', href: '/ranking' },
		{ id: 'settings', icon: 'settings', label: '설정', href: '/settings' }
	];

	function tap(tab: (typeof TABS)[number]) {
		// 이미 그 탭의 루트 경로에 있을 때만 no-op. 서브 경로(/lectures 등)에서는
		// 같은 탭이 active로 표시되더라도 탭 루트로 돌아갈 수 있어야 함.
		if (page.url.pathname === tab.href) return;
		goto(tab.href);
	}
</script>

<nav class="bnav">
	{#each TABS as tab (tab.id)}
		<button
			type="button"
			class="bnav__item"
			class:active={active === tab.id}
			onclick={() => tap(tab)}
		>
			<span class="bnav__icon"><Icon name={tab.icon} size={20} /></span>
			<span class="bnav__label">{tab.label}</span>
		</button>
	{/each}
</nav>

<style>
	.bnav {
		display: flex;
		padding: 6px 6px calc(8px + env(safe-area-inset-bottom, 0px));
		border-top: 1px solid var(--line);
		background: #fff;
		flex: none;
	}
	.bnav__item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 5px 0;
		background: transparent;
		color: var(--mut);
		font: inherit;
	}
	.bnav__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 16px;
		border-radius: 999px;
		transition: background 0.15s ease;
	}
	.bnav__label {
		font-size: 11px;
		font-weight: 600;
	}
	.bnav__item.active {
		color: var(--brand-d);
	}
	.bnav__item.active .bnav__icon {
		background: var(--brand-l);
	}
	.bnav__item.active .bnav__label {
		font-weight: 800;
	}
	.bnav__item:active .bnav__icon {
		background: var(--card);
	}
</style>
