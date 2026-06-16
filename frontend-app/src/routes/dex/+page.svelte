<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadProfile, type Profile } from '$lib/stores/profile.svelte';
	import { loadProgress, BADGES, masteryStar, type Progress } from '$lib/stores/progress.svelte';
	import { terms, CATEGORIES, termsUsingMorpheme, unlockedTermIds, type MedicalTerm } from '$lib/data/terms';
	import { morphemes, morphemeById, UNITS, TYPE_LABEL_KO, type Morpheme } from '$lib/data/morphemes';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	let progress = $state<Progress>(loadProgress());
	let profile = $state<Profile | null>(null);
	let tab = $state<'roots' | 'terms'>('roots');
	let activeUnit = $state<number | 'all'>('all');
	let activeCat = $state<string>('all');
	let openTerm = $state<string | null>(null);
	let q = $state('');

	onMount(() => {
		const p = loadProfile();
		if (!p) {
			goto('/onboarding');
			return;
		}
		profile = p;
		progress = loadProgress();
	});

	const validCollected = $derived(progress.collectedRoots.filter((r) => morphemeById[r]));
	const collected = $derived(new Set(validCollected));
	const unlocked = $derived(unlockedTermIds(validCollected));
	const familiar = $derived(collected.size);
	const unlockedCount = $derived(unlocked.size);
	const rootPct = $derived(morphemes.length ? Math.round((familiar / morphemes.length) * 100) : 0);

	const rootCollected = (id: string) => collected.has(id);
	const rootStars = (id: string) => masteryStar(progress.rootMastery[id] ?? 0);
	const termCount = (id: string) => termsUsingMorpheme(id).length;
	const termRevealed = (id: string) => unlocked.has(id);
	const starStr = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

	const nrm = (s: string) => s.toLowerCase().replace(/[\s/,-]+/g, '');

	const unitTabs = [{ id: 'all' as const, label: '전체' }, ...UNITS.map((u) => ({ id: u.n, label: `Unit ${u.n}` }))];
	const catList = Object.entries(CATEGORIES);
	const catTabs = [{ id: 'all', label: '전체' }, ...catList.map(([id, label]) => ({ id, label }))];

	const rootGroups = $derived(
		UNITS.filter((u) => activeUnit === 'all' || u.n === activeUnit).map((u) => ({
			...u,
			items: morphemes
				.filter((m) => m.unit === u.n)
				.sort((a, b) => termCount(b.id) - termCount(a.id) || a.id.localeCompare(b.id))
		}))
	);

	const termGroups = $derived(
		(activeCat === 'all' ? catList : catList.filter(([id]) => id === activeCat))
			.map(([id, label]) => ({ id, label, items: terms.filter((t) => t.systems.includes(id)) }))
			.filter((g) => g.items.length > 0)
	);

	const searchRootHits = $derived.by(() => {
		const qq = nrm(q.trim());
		if (!qq) return null as Morpheme[] | null;
		return morphemes.filter((m) => nrm(m.form).includes(qq) || nrm(m.meaning).includes(qq) || nrm(m.meaningKo).includes(qq));
	});
	const searchTermHits = $derived.by(() => {
		const qq = nrm(q.trim());
		if (!qq) return null as MedicalTerm[] | null;
		return terms.filter(
			(t) => nrm(t.term).includes(qq) || nrm(t.korean).includes(qq) || t.morphemes.some((m) => nrm(m.form).includes(qq) || nrm(m.meaningKo).includes(qq))
		);
	});

	function toggleTerm(t: MedicalTerm) {
		if (!termRevealed(t.id)) return;
		openTerm = openTerm === t.id ? null : t.id;
	}
	const openRoot = (id: string) => goto(`/dex/${encodeURIComponent(id)}`);
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="캠퍼스"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">도감</div>
		<div class="hdr-count">{familiar}/{morphemes.length}</div>
	</header>

	<div class="scroll">
		{#snippet rootRow(m: Morpheme, divider: boolean)}
			{@const got = rootCollected(m.id)}
			<button class="mrow" class:divider class:locked={!got} onclick={() => openRoot(m.id)}>
				<span class="minfo">
					<span class="mform">{got ? m.form : '???'}{#if m.verified === false}<span class="mcand">후보</span>{/if}</span>
					<span class="mmean">
						{#if got}{m.meaningKo || '뜻 미정'} · {TYPE_LABEL_KO[m.type]}{:else}미수집 · {TYPE_LABEL_KO[m.type]}{/if}
						· <Icon name="bookCheck" size={11} /> {termCount(m.id)}
					</span>
				</span>
				{#if got}
					<span class="mstar" class:gold={rootStars(m.id) === 5}>{starStr(rootStars(m.id))}</span>
				{:else}
					<span class="mlock"><Icon name="lock" size={13} /></span>
				{/if}
			</button>
		{/snippet}

		{#snippet termRow(t: MedicalTerm, divider: boolean, showCat: boolean)}
			{@const ok = termRevealed(t.id)}
			<div class="tgroup" class:divider>
				<button class="trow" class:locked={!ok} onclick={() => toggleTerm(t)}>
					<span class="tinfo">
						<span class="tterm">{ok ? t.term : '???'}</span>
						<span class="tko">{ok ? t.korean : '어원 미수집'}{showCat ? ' · ' + (CATEGORIES[t.systems[0]] ?? t.systems[0]) : ''}</span>
					</span>
					{#if ok}<span class="texpand" class:open={openTerm === t.id}><Icon name="chevronDown" size={16} /></span>
					{:else}<span class="tlock"><Icon name="lock" size={14} /></span>{/if}
				</button>
				{#if ok && openTerm === t.id}
					<div class="tdetail">
						<p class="td-def">{t.definitionKo}</p>
						<div class="td-roots">
							{#each t.morphemes as m (m.id)}
								<button class="td-root" onclick={() => openRoot(m.id)}><b>{m.form}</b> {m.meaningKo}</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/snippet}

		<!-- 진행도 -->
		<section class="prog card">
			<div class="prog-row">
				<span class="prog-num">{familiar}<small> / {morphemes.length}</small></span>
				<span class="prog-pct">{rootPct}%</span>
			</div>
			<div class="prog-bar"><span style="width:{rootPct}%"></span></div>
			<div class="prog-cap">친숙 어원 · <Icon name="bookCheck" size={12} /> 읽히는 용어 {unlockedCount}/{terms.length} · <Icon name="flame" size={12} /> {progress.streak}일</div>
		</section>

		<!-- 검색 -->
		<div class="searchbar">
			<span class="search-ic"><Icon name="search" size={16} /></span>
			<input class="search" bind:value={q} placeholder="어원 · 뜻 · 용어 검색" />
			{#if q}<button class="search-x" onclick={() => (q = '')} aria-label="지우기"><Icon name="x" size={13} /></button>{/if}
		</div>

		{#if searchRootHits || searchTermHits}
			<div class="sec-h">어근 <span class="sec-sub">{searchRootHits?.length ?? 0}</span></div>
			{#if searchRootHits?.length}
				<div class="mlist card">{#each searchRootHits as m, i (m.id)}{@render rootRow(m, i > 0)}{/each}</div>
			{:else}<div class="empty">일치하는 어원 없음</div>{/if}
			<div class="sec-h">용어 <span class="sec-sub">{searchTermHits?.length ?? 0}</span></div>
			{#if searchTermHits?.length}
				<div class="tlist card">{#each searchTermHits as t, i (t.id)}{@render termRow(t, i > 0, true)}{/each}</div>
			{:else}<div class="empty">일치하는 용어 없음</div>{/if}
		{:else}
			<!-- 탭 -->
			<div class="tabs">
				<button class="tab" class:on={tab === 'roots'} onclick={() => (tab = 'roots')}>어근 <span>{morphemes.length}</span></button>
				<button class="tab" class:on={tab === 'terms'} onclick={() => (tab = 'terms')}>용어 <span>{terms.length}</span></button>
			</div>

			{#if tab === 'roots'}
				<div class="cats">
					{#each unitTabs as u (u.id)}
						<button class="cat" class:on={activeUnit === u.id} onclick={() => (activeUnit = u.id)}>{u.label}</button>
					{/each}
				</div>
				{#each rootGroups as g (g.n)}
					<div class="sec-h">Unit {g.n} · {g.title} <span class="sec-sub">{g.items.filter((m) => rootCollected(m.id)).length}/{g.items.length}</span></div>
					<div class="mlist card">{#each g.items as m, i (m.id)}{@render rootRow(m, i > 0)}{/each}</div>
				{/each}
			{:else}
				<div class="cats">
					{#each catTabs as c (c.id)}
						<button class="cat" class:on={activeCat === c.id} onclick={() => (activeCat = c.id)}>{c.label}</button>
					{/each}
				</div>
				{#each termGroups as g (g.id)}
					<div class="sec-h">{g.label} <span class="sec-sub">{g.items.filter((t) => termRevealed(t.id)).length}/{g.items.length}</span></div>
					<div class="tlist card">{#each g.items as t, i (t.id)}{@render termRow(t, i > 0, false)}{/each}</div>
				{/each}
			{/if}
		{/if}

		<!-- 뱃지 -->
		<div class="sec-h">뱃지 <span class="sec-sub">{progress.earnedBadges.length}/{BADGES.length}</span></div>
		<div class="badges">
			{#each BADGES as b (b.id)}
				{@const earned = progress.earnedBadges.includes(b.id)}
				<div class="bcell" class:earned title={`${b.name} — ${b.desc}`}>
					<span class="bem"><Icon name={earned ? (b.icon as IconName) : 'lock'} size={21} /></span>
					<span class="bname">{earned ? b.name : '???'}</span>
				</div>
			{/each}
		</div>
		<div class="bottom-space"></div>
	</div>

	<BottomNav active="dex" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.hdr-count { font-size: 13px; color: var(--mut); font-weight: 600; min-width: 44px; text-align: right; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 16px 0; }

	.prog { padding: 16px; }
	.prog-row { display: flex; justify-content: space-between; align-items: baseline; }
	.prog-num { font-size: 26px; font-weight: 800; }
	.prog-num small { font-size: 14px; color: var(--mut); font-weight: 600; }
	.prog-pct { font-size: 15px; font-weight: 800; color: var(--brand-d); }
	.prog-bar { height: 9px; border-radius: 999px; background: var(--card); margin-top: 10px; overflow: hidden; }
	.prog-bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); transition: width 0.4s; }
	.prog-cap { margin-top: 9px; font-size: 12px; color: var(--mut); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

	.searchbar { position: relative; display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 0 12px; height: 44px; border-radius: 13px; border: 1.5px solid var(--line); background: #fff; }
	.search-ic { display: flex; align-items: center; opacity: 0.5; flex: none; color: var(--ink-2); }
	.search { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font: inherit; font-size: 14.5px; color: var(--ink); }
	.search::placeholder { color: #b5beb8; }
	.search-x { flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--card); color: var(--mut); display: flex; align-items: center; justify-content: center; }

	.tabs { display: flex; gap: 8px; margin-top: 14px; }
	.tab { flex: 1; height: 40px; border-radius: 12px; border: 1.5px solid var(--line); background: #fff; font: inherit; font-size: 14px; font-weight: 800; color: var(--ink-2); display: flex; align-items: center; justify-content: center; gap: 6px; }
	.tab span { font-size: 11.5px; color: var(--mut); font-weight: 600; }
	.tab.on { background: var(--brand); border-color: var(--brand); color: #fff; }
	.tab.on span { color: rgba(255, 255, 255, 0.85); }

	.cats { display: flex; flex-wrap: wrap; gap: 7px; padding: 14px 0 2px; }
	.cat { border-radius: 999px; border: 1.5px solid var(--line); background: #fff; padding: 6px 12px; font: inherit; font-size: 12.5px; font-weight: 700; color: var(--ink-2); white-space: nowrap; }
	.cat.on { background: var(--brand); border-color: var(--brand); color: #fff; }

	.sec-h { margin: 20px 2px 9px; font-size: 15px; font-weight: 800; }
	.sec-sub { font-size: 12px; color: var(--mut); font-weight: 600; }
	.empty { text-align: center; font-size: 12.5px; color: var(--mut); padding: 24px 0; }

	/* 어근 행 */
	.mlist { padding: 2px 6px; }
	.mrow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 11px 10px; background: transparent; }
	.mrow.divider { border-top: 1px solid var(--line); }
	.mrow:active { background: #f7faf8; }
	.minfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
	.mform { font-size: 14.5px; font-weight: 800; }
	.mcand { font-size: 9.5px; font-weight: 700; color: var(--mut); background: var(--card); border-radius: 999px; padding: 1px 6px; margin-left: 6px; vertical-align: middle; }
	.mmean { font-size: 11.5px; color: var(--mut); display: flex; align-items: center; gap: 3px; }
	.mrow.locked .mform { color: var(--mut); }
	.mstar { flex: none; font-size: 13px; letter-spacing: -1px; color: #d4a017; }
	.mstar.gold { color: #c8901a; }
	.mlock { flex: none; display: flex; align-items: center; color: var(--mut); }

	/* 용어 행 */
	.tlist { padding: 2px 6px; }
	.tgroup.divider { border-top: 1px solid var(--line); }
	.trow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 11px 10px; background: transparent; }
	.trow:active { background: #f7faf8; }
	.tinfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
	.tterm { font-size: 14.5px; font-weight: 800; }
	.tko { font-size: 12px; color: var(--mut); }
	.trow.locked .tterm { color: var(--mut); }
	.texpand { flex: none; color: var(--mut); display: flex; align-items: center; transition: transform 0.18s; }
	.texpand.open { transform: rotate(180deg); }
	.tlock { flex: none; display: flex; align-items: center; color: var(--mut); }
	.tdetail { padding: 0 10px 12px 10px; }
	.td-def { font-size: 12.5px; color: var(--ink-2); line-height: 1.5; }
	.td-roots { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
	.td-root { font-size: 11.5px; background: var(--brand-l); color: var(--brand-d); border-radius: 999px; padding: 3px 9px; font: inherit; }
	.td-root b { font-weight: 800; }
	.td-root:active { filter: brightness(0.95); }

	.badges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
	.bcell { aspect-ratio: 1; border-radius: var(--r-md); border: 1.5px solid var(--line); background: var(--card); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 4px; opacity: 0.65; }
	.bcell.earned { background: #fff; border-color: var(--brand-l); opacity: 1; box-shadow: var(--shadow-card); }
	.bem { display: flex; align-items: center; justify-content: center; color: var(--brand-d); }
	.bcell:not(.earned) .bem { color: var(--mut); }
	.bname { font-size: 9.5px; font-weight: 700; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.bottom-space { height: 16px; }
</style>
