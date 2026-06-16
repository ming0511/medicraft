<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { termsUsingMorpheme, unlockedTermIds, CATEGORIES } from '$lib/data/terms';
	import { morphemeById, TYPE_LABEL_KO, UNITS } from '$lib/data/morphemes';
	import { loadProgress, masteryStar, type Progress } from '$lib/stores/progress.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let progress = $state<Progress>(loadProgress());
	onMount(() => {
		progress = loadProgress();
	});

	const mid = $derived(decodeURIComponent(page.params.root ?? ''));
	const m = $derived(morphemeById[mid]);
	const collected = $derived(new Set(progress.collectedRoots).has(mid));
	const encounters = $derived(progress.rootMastery[mid] ?? 0);
	const stars = $derived(masteryStar(encounters));
	const matchingTerms = $derived(m ? termsUsingMorpheme(mid) : []);
	const unlocked = $derived(unlockedTermIds(progress.collectedRoots));
	const categoryLabel = (id: string) => CATEGORIES[id] ?? id;
	const categoriesSet = $derived(new Set(matchingTerms.flatMap((t) => t.systems)));
	const starStr = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
	const NEXT = [3, 6, 10, 15, 999];
	const unitTitle = $derived(m ? UNITS.find((u) => u.n === m.unit)?.title ?? '' : '');
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/dex')} aria-label="도감"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">{m ? m.form : mid}</div>
		<div class="hdr-star">{m ? (collected ? starStr(stars) : '미수집') : ''}</div>
	</header>

	<div class="scroll">
		{#if !m}
			<div class="card hint">없는 어원이에요. <button class="link" onclick={() => goto('/dex')}>도감으로</button></div>
		{:else}
			<!-- Hero -->
			<section class="hero" class:gold={stars === 5}>
				{#if collected}
					<div class="hero-emoji"><Icon name="dna" size={34} /></div>
					<div class="hero-part">{m.form}</div>
					<div class="hero-mean">{m.meaning} · {m.meaningKo}</div>
				{:else}
					<div class="hero-emoji muted">?</div>
					<div class="hero-locked">미수집 어원</div>
				{/if}
			</section>

			{#if collected}
				<div class="card info">
					<div class="info-part">{m.form} <span class="info-type">{TYPE_LABEL_KO[m.type]}</span></div>
					<div class="info-mean"><b>{m.meaning}</b> · {m.meaningKo}</div>
					<div class="info-orig">{m.origin}{m.variants?.length ? ` · 이형태 ${m.variants.join(', ')}` : ''}</div>
					{#if m.note}<div class="info-note">{m.note}</div>{/if}
				</div>

				<div class="card mastery">
					<span class="tag">마스터 등급</span>
					<div class="m-row">
						<span class="m-stars" class:gold={stars === 5}>{starStr(stars)}</span>
						<span class="m-cnt">정답 누적 {encounters}회</span>
					</div>
					<div class="m-next">
						{stars === 5 ? '최고 등급 — 골드 프레임' : `다음 등급까지 ${NEXT[stars] - encounters}회`}
					</div>
				</div>

				<div class="sec-h">단원 · 출현 영역</div>
				<div class="catpills">
					<span class="chip chip-unit">Unit {m.unit}{unitTitle ? ` · ${unitTitle}` : ''}</span>
					{#each [...categoriesSet] as cat (cat)}<span class="chip">{categoryLabel(cat)}</span>{/each}
				</div>
			{:else}
				<div class="card hint">아직 친숙해지지 않은 어원이에요.<br />강의실 · 도서관 · 병동에서 정답으로 만나면 도감에 등록돼요.</div>
			{/if}

			<div class="sec-h">이 어원이 든 용어 <span class="sec-sub">{matchingTerms.length}</span></div>
			<div class="terms">
				{#each matchingTerms as t (t.id)}
					{@const ok = unlocked.has(t.id)}
					<div class="tcell" class:learned={ok}>
						<span class="tterm">{ok ? t.term : '???'}</span>
						<span class="tko">{ok ? t.korean : '어원 미수집'}</span>
					</div>
				{/each}
			</div>

			<div class="acts">
				<button class="pill-btn pill-btn--ghost" onclick={() => goto('/library')}><Icon name="library" size={17} /> 도서관</button>
				<button class="pill-btn pill-btn--primary" onclick={() => goto('/classroom')}><Icon name="clipboard" size={17} /> 카드로 학습</button>
			</div>
		{/if}
		<div class="bottom-space"></div>
	</div>
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.hdr-star { font-size: 12px; color: var(--mut); font-weight: 600; letter-spacing: -0.5px; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 0; }

	.hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 24px 16px; border-radius: var(--r-lg); background: var(--brand-l); }
	.hero.gold { background: #fffaf0; }
	.hero-emoji { display: flex; justify-content: center; color: var(--brand-d); font-size: 34px; }
	.hero.gold .hero-emoji { color: #c8901a; }
	.hero-emoji.muted { color: var(--mut); opacity: 0.6; }
	.hero-part { font-size: 20px; font-weight: 800; margin-top: 4px; }
	.hero-mean { font-size: 13px; color: var(--ink-2); }
	.hero-locked { font-size: 12px; color: var(--mut); margin-top: 4px; }

	.card { padding: 14px; margin-top: 12px; }
	.info-part { font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
	.info-type { font-size: 11px; font-weight: 700; color: var(--brand-d); background: var(--brand-l); border-radius: 999px; padding: 2px 8px; }
	.info-mean { font-size: 13.5px; color: var(--ink-2); margin-top: 4px; }
	.info-orig { font-size: 12px; color: var(--mut); margin-top: 3px; }
	.info-note { font-size: 12px; color: var(--ink-2); margin-top: 8px; padding: 8px 10px; background: var(--card); border-radius: 10px; }

	.mastery .tag { display: block; }
	.m-row { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; }
	.m-stars { font-size: 19px; letter-spacing: -1px; color: #d4a017; }
	.m-stars.gold { color: #c8901a; }
	.m-cnt { font-size: 12px; color: var(--mut); }
	.m-next { font-size: 12px; color: var(--ink-2); margin-top: 6px; }

	.hint { font-size: 13px; color: var(--ink-2); line-height: 1.55; background: var(--card); border: none; }
	.link { font: inherit; color: var(--brand-d); font-weight: 700; background: none; text-decoration: underline; }

	.sec-h { margin: 20px 2px 10px; font-size: 15px; font-weight: 800; }
	.sec-sub { font-size: 12px; color: var(--mut); font-weight: 600; }
	.catpills { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip-unit { background: var(--brand-l); color: var(--brand-d); }

	.terms { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.tcell { display: flex; flex-direction: column; gap: 1px; padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--card); opacity: 0.7; }
	.tcell.learned { background: #fff; border-color: var(--brand-l); opacity: 1; box-shadow: var(--shadow-card); }
	.tterm { font-size: 13.5px; font-weight: 800; }
	.tko { font-size: 11.5px; color: var(--mut); }

	.acts { margin-top: 20px; display: grid; grid-template-columns: 1fr 1.3fr; gap: 10px; }
	.bottom-space { height: 18px; }
</style>
