<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadProfile } from '$lib/stores/profile.svelte';
	import { loadProgress, type Progress } from '$lib/stores/progress.svelte';
	import { morphemeById } from '$lib/data/morphemes';
	import { decodeBreakdown } from '$lib/data/decode-state';
	import { isMorphemeMastered, reviewQueueCount } from '$lib/stores/srs.svelte';
	import {
		loadScope,
		saveScope,
		scopeTerms,
		scopeLabel,
		practiceRoutes,
		scopeEquals,
		type Scope
	} from '$lib/stores/scope';
	import { lectures } from '$lib/data/lectures';
	import { generatedLectures, hiddenBuiltinIds } from '$lib/stores/generated-lectures.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let progress = $state<Progress>(loadProgress());
	let nickname = $state('');
	let charIdx = $state<0 | 1 | 2 | 3>(0);
	let scope = $state<Scope>({ kind: 'bojeongsa' });
	let scopePickerOpen = $state(false);

	onMount(() => {
		const p = loadProfile();
		if (!p) {
			goto('/onboarding');
			return;
		}
		nickname = p.nickname;
		charIdx = p.character;
		progress = loadProgress();
		scope = loadScope();
	});

	// ── 활성 범위 대비 즉답 진척 ──────────────────────────────
	const collected = $derived(new Set(progress.collectedRoots.filter((r) => morphemeById[r])));
	const items = $derived(scopeTerms(scope));
	const bd = $derived(
		decodeBreakdown(
			items,
			(id) => collected.has(id),
			(id) => isMorphemeMastered(id)
		)
	);
	const total = $derived(bd.total || 1);
	const instantPct = $derived((bd.instant / total) * 100);
	const readablePct = $derived((bd.readable / total) * 100);

	const routes = $derived(practiceRoutes(scope));
	const reviewCnt = $derived(reviewQueueCount());

	// 범위 스위처 옵션 = 보정사 + 내 강의들.
	const lectureOpts = $derived([
		...generatedLectures(),
		...lectures.filter((l) => !hiddenBuiltinIds().includes(l.id))
	]);

	function pickScope(next: Scope) {
		scope = next;
		saveScope(next);
		scopePickerOpen = false;
	}
</script>

<div class="page">
	<header class="topbar">
		<button class="who" onclick={() => goto('/settings')}>
			<span class="who-av"><Mascot size={32} variant={charIdx} float={false} /></span>
			<span class="who-text">
				<span class="who-name">{nickname || 'Guest'}</span>
				<span class="who-lv">Lv.{progress.level}</span>
			</span>
		</button>
		<button class="app-bar__btn" onclick={() => goto('/ranking')} aria-label="랭킹"><Icon name="trophy" size={19} /></button>
	</header>

	<div class="scroll">
		<!-- 히어로 = 활성 범위 + 즉답 진척 -->
		<section class="hero">
			<div class="hero-head">
				<button class="scope-sw" onclick={() => (scopePickerOpen = true)}>
					<Icon name="layers" size={14} />
					<span class="scope-name">{scopeLabel(scope)}</span>
					<Icon name="chevronDown" size={15} />
				</button>
				{#if progress.streak > 0}
					<span class="streak-chip"><Icon name="flame" size={12} /> {progress.streak}</span>
				{/if}
			</div>

			<div class="hero-num">
				<span class="hn-big">{bd.instant}</span>
				<span class="hn-cap">/ {bd.total} 용어가<br />바로 떠올라요</span>
			</div>

			<div class="pipe">
				<span class="pp-seg instant" style="width:{instantPct}%"></span>
				<span class="pp-seg readable" style="width:{readablePct}%"></span>
			</div>
			<div class="pipe-legend">
				<span class="lg"><i class="dot instant"></i>즉답 {bd.instant}</span>
				<span class="lg"><i class="dot readable"></i>읽힘 {bd.readable}</span>
				<span class="lg"><i class="dot locked"></i>잠김 {bd.locked}</span>
			</div>
		</section>

		<!-- 연습 (복습·데일리) -->
		<div class="sec-h">연습하기</div>
		<button class="prac card" onclick={() => goto(routes.library)}>
			<span class="prac-ic lib"><Icon name="library" size={22} /></span>
			<span class="prac-tx">
				<span class="prac-name">도서관 · 디코딩</span>
				<span class="prac-desc">
					{#if bd.readable > 0}읽힘 {bd.readable}개를 즉답으로 굳히기{:else}용어를 쪼개 뜻 읽어내기{/if}
				</span>
			</span>
			<span class="prac-go"><Icon name="arrowRight" size={18} /></span>
		</button>
		<button class="prac card" onclick={() => goto(routes.classroom)}>
			<span class="prac-ic cls"><Icon name="cap" size={22} /></span>
			<span class="prac-tx">
				<span class="prac-name">
					강의실 · 어원 복습
					{#if reviewCnt > 0}<span class="prac-badge"><Icon name="rotateCcw" size={11} /> {reviewCnt}</span>{/if}
				</span>
				<span class="prac-desc">
					{#if reviewCnt > 0}약한 어원 우선 · 어근 익히기{:else}어근을 익혀 더 많은 용어 열기{/if}
				</span>
			</span>
			<span class="prac-go"><Icon name="arrowRight" size={18} /></span>
		</button>

		<!-- 내 범위 -->
		<div class="sec-h">내 범위</div>
		<button class="lec-summary card" onclick={() => goto('/lectures')}>
			<span class="lec-ic"><Icon name="book" size={20} /></span>
			<span class="lec-tx">
				<span class="lec-top"><b>강의 추출 → 나만의 용어집</b></span>
				<span class="lec-cap">강의자료 올리면 에이전트가 어원 분해 → 내 시험범위로 등록</span>
			</span>
			<span class="lec-go"><Icon name="arrowRight" size={18} /></span>
		</button>

		<div class="bottom-space"></div>
	</div>

	{#if scopePickerOpen}
		<div
			class="pmodal-bg"
			role="presentation"
			onclick={() => (scopePickerOpen = false)}
			onkeydown={(e) => { if (e.key === 'Escape') scopePickerOpen = false; }}
		>
			<div
				class="pmodal"
				role="dialog"
				aria-modal="true"
				aria-label="공부 범위 선택"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<div class="pm-head"><h2 class="pm-title">공부 범위</h2></div>
				<div class="pm-list">
					<button
						type="button"
						class="pm-card"
						class:sel={scopeEquals(scope, { kind: 'bojeongsa' })}
						onclick={() => pickScope({ kind: 'bojeongsa' })}
					>
						<Icon name="stethoscope" size={18} />
						<span>보정사 시험범위<small>14계통 빌트인</small></span>
						{#if scopeEquals(scope, { kind: 'bojeongsa' })}<Icon name="check" size={16} />{/if}
					</button>
					{#each lectureOpts as lec (lec.id)}
						<button
							type="button"
							class="pm-card"
							class:sel={scopeEquals(scope, { kind: 'lecture', lectureId: lec.id })}
							onclick={() => pickScope({ kind: 'lecture', lectureId: lec.id })}
						>
							<Icon name="book" size={18} />
							<span>{lec.shortLabel}<small>내 강의</small></span>
							{#if scopeEquals(scope, { kind: 'lecture', lectureId: lec.id })}<Icon name="check" size={16} />{/if}
						</button>
					{/each}
					<button type="button" class="pm-add" onclick={() => { scopePickerOpen = false; goto('/lectures'); }}>
						<Icon name="plus" size={16} /> 강의자료로 범위 추가
					</button>
				</div>
			</div>
		</div>
	{/if}

	<BottomNav active="campus" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }

	.topbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px 6px; flex: none; }
	.who { display: flex; align-items: center; gap: 8px; padding: 4px 11px 4px 4px; border-radius: 999px; background: transparent; }
	.who:active { background: var(--card); }
	.who-av { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: var(--brand-l); display: flex; align-items: center; justify-content: center; }
	.who-av :global(.mw) { margin-top: 2px; }
	.who-text { display: flex; align-items: baseline; gap: 7px; }
	.who-name { font-weight: 800; font-size: 15px; }
	.who-lv { font-size: 12px; color: var(--brand-d); font-weight: 700; }

	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 16px 0; }

	/* 히어로 = 즉답 진척 */
	.hero { background: var(--brand-grad); border-radius: var(--r-lg); padding: 16px 18px 18px; }
	.hero-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.scope-sw { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px 6px 11px; border-radius: 999px; background: rgba(255, 255, 255, 0.72); color: var(--brand-d); font-weight: 800; font-size: 13px; }
	.scope-sw:active { background: rgba(255, 255, 255, 0.9); }
	.scope-name { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.streak-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 800; color: #d97706; }

	.hero-num { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
	.hn-big { font-size: 44px; font-weight: 900; line-height: 1; color: var(--ink); letter-spacing: -1px; }
	.hn-cap { font-size: 13px; font-weight: 700; color: var(--brand-d); line-height: 1.35; }

	.pipe { display: flex; gap: 2px; height: 10px; margin-top: 16px; border-radius: 999px; overflow: hidden; background: rgba(255, 255, 255, 0.55); }
	.pp-seg { display: block; height: 100%; transition: width 0.4s; }
	.pp-seg.instant { background: var(--brand); }
	.pp-seg.readable { background: #fbbf24; }
	.pipe-legend { display: flex; gap: 12px; margin-top: 9px; }
	.lg { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: var(--brand-d); }
	.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
	.dot.instant { background: var(--brand); }
	.dot.readable { background: #fbbf24; }
	.dot.locked { background: #cbd5e1; }

	.sec-h { margin: 22px 2px 10px; font-size: 16px; font-weight: 800; }

	/* 연습 카드 */
	.prac { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; margin-bottom: 10px; transition: transform 0.08s; }
	.prac:active { transform: scale(0.99); }
	.prac-ic { width: 46px; height: 46px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 13px; }
	.prac-ic.lib { background: #fff5e8; color: #c2740c; }
	.prac-ic.cls { background: #eef4ff; color: #3b6dd0; }
	.prac-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
	.prac-name { font-size: 15.5px; font-weight: 800; display: flex; align-items: center; gap: 7px; }
	.prac-badge { font-size: 10.5px; font-weight: 700; color: #b45309; background: #fef3c7; border-radius: 999px; padding: 1px 7px; display: inline-flex; align-items: center; gap: 3px; }
	.prac-desc { font-size: 12px; color: var(--mut); }
	.prac-go { color: var(--mut); flex: none; display: flex; }

	/* 내 강의자료 */
	.lec-summary { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; transition: transform 0.08s; }
	.lec-summary:active { transform: scale(0.99); }
	.lec-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: var(--brand-l); color: var(--brand-d); border-radius: 13px; }
	.lec-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
	.lec-top b { font-size: 15px; font-weight: 800; }
	.lec-cap { font-size: 11.5px; color: var(--mut); }
	.lec-go { color: var(--mut); flex: none; display: flex; }

	.bottom-space { height: 16px; }

	/* 범위 선택 모달 */
	.pmodal-bg { position: absolute; inset: 0; background: rgba(20, 30, 24, 0.18); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 0 24px; z-index: 80; animation: pmfade 0.16s ease-out; }
	@keyframes pmfade { from { opacity: 0; } }
	.pmodal { width: 100%; max-width: 340px; background: #fff; border-radius: 22px; padding: 22px; box-shadow: 0 12px 40px rgba(20, 30, 24, 0.18); animation: pmpop 0.18s ease-out; }
	@keyframes pmpop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
	.pm-head { margin-bottom: 14px; }
	.pm-title { font-size: 18px; font-weight: 800; line-height: 1.3; }
	.pm-list { display: flex; flex-direction: column; gap: 8px; }
	.pm-card { appearance: none; font: inherit; display: flex; align-items: center; gap: 11px; color: var(--ink); background: #fff; border: 1.5px solid var(--line); border-radius: 14px; padding: 13px 14px; transition: border-color 0.12s, background 0.12s, transform 0.08s; cursor: pointer; text-align: left; }
	.pm-card:active { transform: scale(0.99); }
	.pm-card.sel { border-color: var(--brand); background: var(--brand-l); }
	.pm-card > span { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 15px; font-weight: 800; }
	.pm-card small { font-size: 11px; font-weight: 600; color: var(--mut); }
	.pm-card :global(.lucide), .pm-card > :global(svg) { color: var(--brand-d); }
	.pm-add { appearance: none; font: inherit; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13.5px; font-weight: 700; color: var(--brand-d); background: transparent; border: 1.5px dashed var(--line); border-radius: 14px; padding: 12px; cursor: pointer; margin-top: 2px; }
	.pm-add:active { background: var(--card); }
</style>
