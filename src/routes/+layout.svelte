<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';

	let { children } = $props();
	let sidebarOpen = $state(false);

	const navItems = [
		{
			href: '/puzzle',
			label: '퍼즐',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" /></svg>`
		},
		{
			href: '/etymology',
			label: '어원 사전',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>`
		},
		{
			href: '/statistics',
			label: '통계',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>`
		},
		{
			href: '/settings',
			label: '설정',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`
		}
	];

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	const pageTitles: Record<string, string> = {
		'/puzzle': '퍼즐', '/etymology': '어원 사전', '/statistics': '통계', '/settings': '설정'
	};
	function getTitle() {
		return pageTitles[Object.keys(pageTitles).find(k => page.url.pathname.startsWith(k)) ?? ''] ?? 'MediCraft';
	}
</script>

<div class="flex h-screen overflow-hidden" style="background:var(--bg);">

	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<button class="fixed inset-0 z-20 md:hidden" style="background:rgba(0,0,0,0.2);"
			onclick={() => (sidebarOpen = false)} aria-label="Close sidebar"></button>
	{/if}

	<!-- Sidebar (Apple macOS style) -->
	<aside
		class="fixed md:static z-30 h-full w-52 flex-shrink-0 flex flex-col transition-transform duration-200 md:translate-x-0"
		class:translate-x-0={sidebarOpen}
		class:-translate-x-full={!sidebarOpen}
		style="background:#F2F2F7; border-right:1px solid var(--border);"
	>
		<!-- Logo -->
		<div class="flex items-center gap-2.5 px-4 py-5">
			<div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
				style="background:linear-gradient(135deg,#007AFF,#5AC8FA);">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-4 h-4">
					<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
				</svg>
			</div>
			<div>
				<p class="font-semibold text-sm leading-tight" style="color:var(--text);">MediCraft</p>
				<p class="text-xs leading-tight" style="color:var(--muted);">어원 조합 퍼즐</p>
			</div>
		</div>

		<!-- Nav -->
		<nav class="flex-1 px-2 space-y-0.5 overflow-y-auto">
			{#each navItems as item}
				<a
					href={item.href}
					onclick={() => (sidebarOpen = false)}
					class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100"
					style={isActive(item.href)
						? 'background:#007AFF;color:white;font-weight:500;box-shadow:0 1px 3px rgba(0,122,255,.3);'
						: 'color:var(--text);'}
				>
					<span class="flex-shrink-0" style={isActive(item.href) ? 'opacity:1;' : 'opacity:0.5;'}>
						{@html item.icon}
					</span>
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- Bottom -->
		<div class="px-4 py-4">
			<p class="text-xs" style="color:var(--muted);">의생명 전공자용 학습 도구</p>
		</div>
	</aside>

	<!-- Main -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Top bar -->
		<header class="flex items-center gap-3 px-5 py-3 flex-shrink-0"
			style="background:rgba(255,255,255,0.8); border-bottom:1px solid var(--border); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);">
			<button class="md:hidden p-1.5 rounded-lg transition-colors" style="color:var(--muted);"
				onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle sidebar">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
				</svg>
			</button>
			<span class="text-sm font-semibold" style="color:var(--text);">{getTitle()}</span>
		</header>

		<!-- Content -->
		<main class="flex-1 overflow-y-auto">
			<div class="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
				{@render children()}
			</div>
		</main>
	</div>
</div>
