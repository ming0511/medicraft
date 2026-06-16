<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadProgress, type Progress } from '$lib/stores/progress.svelte';
	import { morphemeById } from '$lib/data/morphemes';
	import { overallCoverage, type SystemCoverage } from '$lib/data/bojeongsa';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Icon from '$lib/components/Icon.svelte';

	// 보정사 시험범위 스파인 — 14 신체계통을 1급 커리큘럼으로.
	// 그물이 각 계통을 어디까지 보유했는지(정직한 갭) + 사용자가 어디까지 읽어내는지(커버율).
	// 계통 카드 탭 → 그 계통으로 디코딩 세션(/library?system=).

	let progress = $state<Progress>(loadProgress());

	onMount(() => {
		progress = loadProgress();
	});

	const validCollected = $derived(progress.collectedRoots.filter((r) => morphemeById[r]));
	const cov = $derived(overallCoverage(validCollected));
	const pct = $derived(Math.round(cov.coverage * 100));

	function openSystem(s: SystemCoverage) {
		if (s.totalTerms === 0) return; // 빈 계통 = 보강 타겟, 아직 학습 불가
		goto(`/library?system=${s.system.id}`);
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">보정사 시험범위</div>
		<div style="width:36px"></div>
	</header>

	<div class="scroll">
		<!-- 커버율 히어로 -->
		<section class="hero card">
			<div class="hero-top">
				<span class="hero-tag">보건의료정보관리사 · 의학용어</span>
			</div>
			<div class="hero-pct">
				<b>{pct}<small>%</small></b>
				<span class="hero-pct-cap">시험범위 커버율</span>
			</div>
			<div class="hero-bar"><span style="width:{pct}%"></span></div>
			<div class="hero-lev">
				친숙 어근 <b>{cov.familiarRoots}</b>개 → 읽히는 용어 <b>{cov.unlockedTerms}</b>개
			</div>
			<div class="hero-sub">
				14계통 중 <b>{cov.systemsWithContent}</b>계통 그물 보유 · 보유 용어 {cov.totalTerms}개 / 어근 {cov.totalRoots}개
			</div>
		</section>

		<div class="sec-h">신체계통 14</div>

		<div class="syslist">
			{#each cov.perSystem as s (s.system.id)}
				{@const cpct = Math.round(s.coverage * 100)}
				<button
					class="sys card"
					class:empty={s.totalTerms === 0}
					onclick={() => openSystem(s)}
					disabled={s.totalTerms === 0}
				>
					<span class="sys-no">{s.system.no}</span>
					<span class="sys-tx">
						<span class="sys-top">
							<b class="sys-name">{s.system.nameKo}</b>
							{#if s.totalTerms === 0}
								<span class="sys-badge sys-badge--empty">준비 중</span>
							{:else if cpct === 100}
								<span class="sys-badge sys-badge--done">완독</span>
							{/if}
						</span>
						{#if s.totalTerms === 0}
							<span class="sys-cap sys-cap--mut">{s.system.blurb} · 어근 0 (보강 예정)</span>
						{:else}
							<span class="sys-barwrap"><span class="sys-bar"><span style="width:{cpct}%"></span></span></span>
							<span class="sys-cap">
								읽힌 용어 <b>{s.unlockedTerms}</b>/{s.totalTerms} · 친숙 어근 {s.familiarRoots}/{s.totalRoots}
							</span>
						{/if}
					</span>
					{#if s.totalTerms > 0}
						<span class="sys-go"><Icon name="arrowRight" size={17} /></span>
					{/if}
				</button>
			{/each}
		</div>

		<p class="foot">
			<Icon name="book" size={13} /> 빈 계통은 <b>내 강의자료</b>를 올리면 어원이 추출돼 그물에 채워져요.
		</p>

		<div class="bottom-space"></div>
	</div>

	<BottomNav active="campus" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 16px 0; }

	/* 히어로 */
	.hero { background: var(--brand-grad); border: none; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
	.hero-top { display: flex; }
	.hero-tag { font-size: 11.5px; font-weight: 800; color: var(--brand-d); background: rgba(255, 255, 255, 0.6); border-radius: 999px; padding: 4px 10px; }
	.hero-pct { display: flex; align-items: baseline; gap: 8px; }
	.hero-pct b { font-size: 40px; font-weight: 800; line-height: 1; color: var(--ink); }
	.hero-pct b small { font-size: 20px; font-weight: 800; }
	.hero-pct-cap { font-size: 13px; font-weight: 700; color: var(--brand-d); }
	.hero-bar { height: 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.7); overflow: hidden; }
	.hero-bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); transition: width 0.4s; }
	.hero-lev { font-size: 14px; font-weight: 700; color: var(--ink); }
	.hero-lev b { color: var(--brand-d); }
	.hero-sub { font-size: 11.5px; color: var(--brand-d); font-weight: 600; }

	.sec-h { margin: 20px 2px 10px; font-size: 16px; font-weight: 800; }

	.syslist { display: flex; flex-direction: column; gap: 8px; }
	.sys {
		appearance: none; font: inherit; text-align: left; cursor: pointer;
		display: flex; align-items: center; gap: 12px; padding: 13px 14px;
		transition: transform 0.08s, border-color 0.12s;
	}
	.sys:not(:disabled):active { transform: scale(0.99); }
	.sys.empty { cursor: default; opacity: 0.62; }
	.sys-no {
		flex: none; width: 28px; height: 28px; border-radius: 9px;
		display: flex; align-items: center; justify-content: center;
		background: var(--brand-l); color: var(--brand-d); font-size: 13px; font-weight: 800;
	}
	.sys.empty .sys-no { background: var(--card); color: var(--mut); }
	.sys-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
	.sys-top { display: flex; align-items: center; gap: 7px; }
	.sys-name { font-size: 15px; font-weight: 800; }
	.sys-badge { font-size: 10px; font-weight: 800; border-radius: 999px; padding: 1px 7px; }
	.sys-badge--empty { color: var(--mut); background: var(--card); }
	.sys-badge--done { color: var(--brand-d); background: var(--brand-l); }
	.sys-barwrap { display: block; }
	.sys-bar { display: block; height: 6px; border-radius: 999px; background: var(--card); overflow: hidden; }
	.sys-bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); transition: width 0.4s; }
	.sys-cap { font-size: 11.5px; color: var(--mut); }
	.sys-cap b { color: var(--brand-d); font-weight: 700; }
	.sys-cap--mut { color: var(--mut); }
	.sys-go { flex: none; color: var(--mut); display: flex; }

	.foot { margin: 16px 2px 0; font-size: 12px; color: var(--mut); line-height: 1.5; display: flex; align-items: flex-start; gap: 6px; }
	.foot b { color: var(--ink-2); font-weight: 700; }

	.bottom-space { height: 16px; }
</style>
