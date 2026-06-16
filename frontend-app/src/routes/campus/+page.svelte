<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadProfile } from '$lib/stores/profile.svelte';
	import {
		loadProgress,
		levelProgress,
		xpForLevel,
		xpToNext,
		todayLearnedCount,
		DAILY_GOAL,
		type Progress
	} from '$lib/stores/progress.svelte';
	import { dailyPoolTerms, unlockedTermIds } from '$lib/data/terms';
	import { morphemes, morphemeById } from '$lib/data/morphemes';
	import { overallCoverage } from '$lib/data/bojeongsa';
	import { lectures } from '$lib/data/lectures';
	import { isDailyMergeEnabled } from '$lib/stores/lecture-prefs.svelte';
	import { reviewQueueCount } from '$lib/stores/srs.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	type Difficulty = 'easy' | 'normal' | 'hard';
	const DIFFICULTY_OPTS: { d: Difficulty; label: string }[] = [
		{ d: 'easy', label: '쉬움' },
		{ d: 'normal', label: '보통' },
		{ d: 'hard', label: '하드' }
	];

	let progress = $state<Progress>(loadProgress());
	let nickname = $state('');
	let charIdx = $state<0 | 1 | 2 | 3>(0);
	let libraryPickerOpen = $state(false);

	onMount(() => {
		const p = loadProfile();
		if (!p) {
			goto('/onboarding');
			return;
		}
		nickname = p.nickname;
		charIdx = p.character;
		progress = loadProgress();
	});

	const pct = $derived(Math.round(levelProgress(progress) * 100));
	const xpInLevel = $derived(progress.xp - xpForLevel(progress.level));
	const xpNeed = $derived(xpToNext(progress.level));
	const today = $derived(todayLearnedCount(progress));
	const dailyPct = $derived(Math.min(100, Math.round((today / DAILY_GOAL) * 100)));
	const goalDone = $derived(today >= DAILY_GOAL);
	const validCollected = $derived(progress.collectedRoots.filter((r) => morphemeById[r]));
	const familiarRoots = $derived(validCollected.length);
	// 데일리 학습 풀 = 큐레이션 원본 + (toggle ON인 강의에서 합류한 용어). 토글 OFF면 그 강의 용어 제외.
	const pool = $derived(dailyPoolTerms());
	const poolIds = $derived(new Set(pool.map((t) => t.id)));
	const unlockedTerms = $derived([...unlockedTermIds(validCollected)].filter((id) => poolIds.has(id)).length);
	// 캠퍼스 카드 = 별표/즐겨찾기 없으니 합류 ON인 강의 수만 표시.
	const activeLectures = $derived(lectures.filter((l) => isDailyMergeEnabled(l.id)));
	// 약점 가중 복습 큐 크기 — due ∪ 약점 임계값 이상. 데일리 루프 진입점.
	const reviewCnt = $derived(reviewQueueCount());
	// 보정사 시험범위 커버율 — 비즈니스 스파인. 누적 자산의 체감 지표.
	const bojeongsa = $derived(overallCoverage(validCollected));
	const bojeongsaPct = $derived(Math.round(bojeongsa.coverage * 100));

	type Mode = {
		key: string;
		icon: IconName;
		tint: string;
		name: string;
		desc: string;
		href: string;
	};
	const modes: Mode[] = [
		{ key: 'classroom', icon: 'cap', tint: '#eef4ff', name: '강의실', desc: '어원 익히기', href: '/classroom' },
		{ key: 'library', icon: 'library', tint: '#fff5e8', name: '도서관', desc: '용어 쪼개 읽기', href: '/library' }
	];

	function openMode(m: Mode) {
		if (m.key === 'library') {
			libraryPickerOpen = true;
			return;
		}
		goto(m.href);
	}

	function pickLibraryDifficulty(d: Difficulty) {
		localStorage.setItem('medicraft.library.difficulty', d);
		libraryPickerOpen = false;
		goto(`/library?d=${d}`);
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
		<!-- 히어로 -->
		<section class="hero">
			<div class="hero-mascot"><Mascot size={116} variant={charIdx} /></div>
			<div class="hero-text">
				<div class="hero-hi">오늘도 한 단어씩</div>
				<div class="hero-xp">
					<div class="bar"><span style="width:{pct}%"></span></div>
					<div class="bar-cap">{xpInLevel} / {xpNeed} XP · 다음 레벨까지</div>
				</div>
			</div>
		</section>

		<!-- 오늘의 학습 -->
		<button class="today card" onclick={() => goto('/classroom')}>
			<span class="td-ic"><Icon name="clipboard" size={20} /></span>
			<span class="td-tx">
				<span class="td-top">
					<b>오늘의 학습</b>
					{#if reviewCnt > 0}<span class="td-review"><Icon name="rotateCcw" size={11} /> 복습 {reviewCnt}</span>{/if}
					{#if goalDone}<span class="td-done">목표 달성</span>{/if}
				</span>
				<span class="td-bar"><span style="width:{dailyPct}%"></span></span>
				<span class="td-cap">
					{#if reviewCnt > 0}
						약한 어원 우선 · {today} / {DAILY_GOAL}장
					{:else}
						{today} / {DAILY_GOAL}장{goalDone ? ' · 추가 학습 가능' : ` · ${DAILY_GOAL - today}장 더 하면 완료`}
					{/if}
				</span>
			</span>
			<span class="td-go"><Icon name="arrowRight" size={18} /></span>
		</button>

		<!-- 스탯 -->
		<div class="stats">
			<div class="stat">
				<span class="st-ic flame"><Icon name="flame" size={18} /></span>
				<b>{progress.streak}</b><span>연속일</span>
			</div>
			<button class="stat" onclick={() => goto('/dex')}>
				<span class="st-ic brandd"><Icon name="puzzle" size={18} /></span>
				<b>{familiarRoots}<small> / {morphemes.length}</small></b><span>친숙 어원</span>
			</button>
			<button class="stat" onclick={() => goto('/dex')}>
				<span class="st-ic brandd"><Icon name="bookCheck" size={18} /></span>
				<b>{unlockedTerms}<small> / {pool.length}</small></b><span>해금 용어</span>
			</button>
		</div>

		<!-- 보정사 시험범위 (비즈니스 스파인) -->
		<button class="bojeong card" onclick={() => goto('/bojeongsa')}>
			<span class="bj-ic"><Icon name="stethoscope" size={20} /></span>
			<span class="bj-tx">
				<span class="bj-top">
					<b>보정사 시험범위</b>
					<span class="bj-pct">{bojeongsaPct}%</span>
				</span>
				<span class="bj-bar"><span style="width:{bojeongsaPct}%"></span></span>
				<span class="bj-cap">친숙 어근 {bojeongsa.familiarRoots} → 읽힌 용어 {bojeongsa.unlockedTerms} · 14계통</span>
			</span>
			<span class="bj-go"><Icon name="arrowRight" size={18} /></span>
		</button>

		<!-- 모드 -->
		<div class="sec-h">배우러 가기</div>
		<div class="modes">
			{#each modes as m (m.key)}
				<button class="mode card" onclick={() => openMode(m)}>
					<span class="mode-ic" style="background:{m.tint}"><Icon name={m.icon} size={22} /></span>
					<span class="mode-name">{m.name}</span>
					<span class="mode-desc">{m.desc}</span>
				</button>
			{/each}
		</div>

		<!-- 내 강의자료 — 캠퍼스에는 한 줄 요약만, 전체는 /lectures 서브 라우트 -->
		<button class="lec-summary card" onclick={() => goto('/lectures')}>
			<span class="lec-ic"><Icon name="book" size={20} /></span>
			<span class="lec-tx">
				<span class="lec-top"><b>내 강의자료</b></span>
				{#if lectures.length === 0}
					<span class="lec-cap">에이전트가 어원 추출 + 그물 합류 — 강의자료 추가하기</span>
				{:else}
					<span class="lec-cap">{lectures.length}개 강의 · 데일리 풀에 {activeLectures.length}개 합류 중</span>
				{/if}
			</span>
			<span class="lec-go"><Icon name="arrowRight" size={18} /></span>
		</button>

		<!-- 응급실 (벼락치기) — WTP 훅. 진입 카드 일시 숨김 (코드·라우트 보존, /emergency 직접 접근은 가능). -->
		<!-- 다시 노출하려면 아래 블록 주석 해제.
		<button class="emerg card" onclick={() => goto('/emergency')}>
			<span class="emerg-ic"><Icon name="siren" size={20} /></span>
			<span class="emerg-tx">
				<span class="emerg-top"><b>응급실 — 벼락치기 모드</b><span class="emerg-lock"><Icon name="lock" size={11} /></span></span>
				<span class="emerg-cap">시험 범위 + 남은 시간 → 시간예산 압축 코스</span>
			</span>
			<span class="lec-go"><Icon name="arrowRight" size={18} /></span>
		</button>
		-->

		<div class="bottom-space"></div>
	</div>

	{#if libraryPickerOpen}
		<div
			class="pmodal-bg"
			role="presentation"
			onclick={() => (libraryPickerOpen = false)}
			onkeydown={(e) => { if (e.key === 'Escape') libraryPickerOpen = false; }}
		>
			<div
				class="pmodal"
				role="dialog"
				aria-modal="true"
				aria-label="도서관 난이도 선택"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<div class="pm-head">
					<h2 class="pm-title">도서관 난이도</h2>
				</div>
				<div class="pm-list">
					{#each DIFFICULTY_OPTS as opt (opt.d)}
						<button
							type="button"
							class="pm-card"
							onclick={() => pickLibraryDifficulty(opt.d)}
						>{opt.label}</button>
					{/each}
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

	.hero {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--brand-grad);
		border-radius: var(--r-lg);
		padding: 16px 18px;
		overflow: hidden;
	}
	.hero-mascot { flex: none; margin: -6px 0 -14px -8px; }
	.hero-text { flex: 1; min-width: 0; }
	.hero-hi { font-size: 16px; font-weight: 800; color: var(--ink); }
	.hero-xp { margin-top: 12px; }
	.bar { height: 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.7); overflow: hidden; }
	.bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); transition: width 0.4s; }
	.bar-cap { margin-top: 6px; font-size: 11.5px; color: var(--brand-d); font-weight: 600; }

	/* 오늘의 학습 CTA */
	.today { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; margin-top: 14px; transition: transform 0.08s; }
	.today:active { transform: scale(0.99); }
	.td-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: var(--brand-l); color: var(--brand-d); border-radius: 13px; }
	.td-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
	.td-top { display: flex; align-items: center; gap: 8px; }
	.td-top b { font-size: 15px; font-weight: 800; }
	.td-done { font-size: 10.5px; font-weight: 700; color: var(--brand-d); background: var(--brand-l); border-radius: 999px; padding: 1px 8px; }
	.td-review { font-size: 10.5px; font-weight: 700; color: #b45309; background: #fef3c7; border-radius: 999px; padding: 1px 8px; display: inline-flex; align-items: center; gap: 3px; }
	.td-bar { display: block; height: 7px; border-radius: 999px; background: var(--card); overflow: hidden; }
	.td-bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); transition: width 0.4s; }
	.td-cap { font-size: 11.5px; color: var(--mut); }
	.td-go { color: var(--mut); flex: none; display: flex; }

	.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
	.stat { background: var(--card); border-radius: var(--r-md); padding: 12px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
	button.stat { font: inherit; transition: transform 0.08s; }
	button.stat:active { transform: scale(0.97); }
	.st-ic { display: flex; align-items: center; justify-content: center; }
	.st-ic.flame { color: #f59e0b; }
	.st-ic.brandd { color: var(--brand-d); }
	.stat b { font-size: 16px; font-weight: 800; margin-top: 1px; }
	.stat b small { font-size: 11px; color: var(--mut); font-weight: 600; }
	.stat span { font-size: 11px; color: var(--mut); }

	/* 보정사 시험범위 (비즈니스 스파인) */
	.bojeong { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; margin-top: 12px; transition: transform 0.08s; }
	.bojeong:active { transform: scale(0.99); }
	.bj-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: var(--brand-l); color: var(--brand-d); border-radius: 13px; }
	.bj-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
	.bj-top { display: flex; align-items: center; gap: 8px; }
	.bj-top b { font-size: 15px; font-weight: 800; }
	.bj-pct { margin-left: auto; font-size: 13px; font-weight: 800; color: var(--brand-d); }
	.bj-bar { display: block; height: 7px; border-radius: 999px; background: var(--card); overflow: hidden; }
	.bj-bar span { display: block; height: 100%; border-radius: 999px; background: var(--brand); transition: width 0.4s; }
	.bj-cap { font-size: 11.5px; color: var(--mut); }
	.bj-go { color: var(--mut); flex: none; display: flex; }

	.sec-h { margin: 22px 2px 10px; font-size: 16px; font-weight: 800; }
	.modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
	.mode { display: flex; flex-direction: column; align-items: flex-start; gap: 7px; padding: 14px; text-align: left; transition: transform 0.08s; }
	.mode:active { transform: scale(0.98); }
	.mode-ic { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 13px; color: var(--ink-2); }
	.mode-name { font-size: 15.5px; font-weight: 800; }
	.mode-desc { font-size: 12px; color: var(--mut); }

	/* 내 강의자료 — 한 줄 요약 진입점 (전체는 /lectures) */
	.lec-summary { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; margin-top: 12px; transition: transform 0.08s; }
	.lec-summary:active { transform: scale(0.99); }
	.lec-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: #eef4ff; color: #3b6dd0; border-radius: 13px; }
	.lec-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
	.lec-top b { font-size: 15px; font-weight: 800; }
	.lec-cap { font-size: 11.5px; color: var(--mut); }
	.lec-go { color: var(--mut); flex: none; display: flex; }

	/* 응급실 카드 스타일 — 진입 카드와 함께 일시 보존 (위 마크업 주석 해제 시 같이 살림).
	.emerg { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; margin-top: 12px; transition: transform 0.08s; }
	.emerg:active { transform: scale(0.99); }
	.emerg-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff8a5b, #e7607a); color: #fff; border-radius: 13px; }
	.emerg-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
	.emerg-top { display: flex; align-items: center; gap: 6px; }
	.emerg-top b { font-size: 15px; font-weight: 800; }
	.emerg-lock { color: var(--mut); display: inline-flex; }
	.emerg-cap { font-size: 11.5px; color: var(--mut); }
	*/

	.bottom-space { height: 16px; }

	/* 난이도 선택 모달 (캠퍼스 위에 가운데로) */
	.pmodal-bg {
		position: absolute;
		inset: 0;
		background: rgba(20, 30, 24, 0.18);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 24px;
		z-index: 80;
		animation: pmfade 0.16s ease-out;
	}
	@keyframes pmfade { from { opacity: 0; } }

	.pmodal {
		width: 100%;
		max-width: 340px;
		background: #fff;
		border-radius: 22px;
		padding: 22px;
		box-shadow: 0 12px 40px rgba(20, 30, 24, 0.18);
		animation: pmpop 0.18s ease-out;
	}
	@keyframes pmpop {
		from { opacity: 0; transform: translateY(-6px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.pm-head { margin-bottom: 14px; }
	.pm-title { font-size: 18px; font-weight: 800; line-height: 1.3; }
	.pm-list { display: flex; flex-direction: column; gap: 8px; }
	.pm-card {
		appearance: none;
		font: inherit;
		font-size: 16px;
		font-weight: 800;
		color: var(--ink);
		background: #fff;
		border: 1.5px solid var(--line);
		border-radius: 14px;
		padding: 14px;
		transition: border-color 0.12s, background 0.12s, transform 0.08s;
		cursor: pointer;
	}
	.pm-card:active { transform: scale(0.99); }
	.pm-card:hover { border-color: var(--brand); }
</style>
