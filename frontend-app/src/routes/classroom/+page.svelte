<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { termsUsingMorpheme } from '$lib/data/terms';
	import { BOJEONGSA_SYSTEMS, termsBySystem, systemRootIds, bojeongsaSystemById } from '$lib/data/bojeongsa';
	import { learnableMorphemes, morphemeById, type Morpheme } from '$lib/data/morphemes';
	import {
		applyMorphemeRating,
		getReviewQueue,
		isMorphemeNew,
		isMorphemeWeak,
		reviewQueueCount,
		type Rating
	} from '$lib/stores/srs.svelte';
	import {
		loadProgress,
		gainXP,
		collectRoot,
		recordCardLearned,
		todayLearnedCount,
		registerStudyDay,
		checkBadges,
		DAILY_GOAL,
		type Badge,
		type Progress
	} from '$lib/stores/progress.svelte';
	import { loadProfile } from '$lib/stores/profile.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	// 강의실 = 어근(어원 조각) 플래시카드. 카드 = 어근 하나. 앞: 어근 / 뒤: 뜻 + 쓰이는 용어.
	// 좌/우 스와이프로 자가평가, morpheme SRS가 간격 조절. (용어 조합/디코드는 도서관·병동)
	const EXTRA_BATCH = 8; // "더 하기" 한 묶음
	const MAX_NEW = 8; // 한 세션에 새로 등장시키는 어근 상한
	const MIN_NEW = 3; // 세션당 새 어근 최소 보장 — 복습이 독점해 레버리지 체감이 멈추지 않게
	const REVIEW_FRAC = 0.6; // 복습 상한 비율 (나머지는 새 어근 몫)
	const XP_BY_RATING: Record<Rating, number> = { 0: 0, 1: 3, 2: 5, 3: 10 };
	const SWIPE_THRESH = 90;

	let queue = $state<Morpheme[]>([]);
	let index = $state(0);
	let flipped = $state(false);
	let started = $state(false);
	let progress = $state<Progress>(loadProgress());
	let xpGained = $state(0);
	let cardsDone = $state(0);
	let done = $state(false);
	let newBadges = $state<Badge[]>([]);
	let newRoots = $state<string[]>([]);
	let charIdx = $state<0 | 1 | 2 | 3>(0);

	// 범위(보정사 계통) 스코프 — 그 계통 용어에 쓰이는 어근만 드릴. null = 전체.
	let systemFilter = $state<string | null>(null);
	const scopeOptions = BOJEONGSA_SYSTEMS.filter((s) => (termsBySystem[s.id]?.length ?? 0) > 0);

	// 스와이프 상태
	let dragX = $state(0);
	let dragging = $state(false);
	let leaving = $state<null | 'left' | 'right'>(null);
	let startX = 0;
	let moved = false;

	// 약점 점수의 "응답속도" 신호용 — 카드 등장 시점.
	let cardShownAt = Date.now();

	onMount(() => {
		progress = loadProgress();
		const p = loadProfile();
		if (p) charIdx = p.character;
		const sys = new URL(window.location.href).searchParams.get('system');
		if (sys && bojeongsaSystemById[sys]) systemFilter = sys;
	});

	const doneToday = $derived(todayLearnedCount(progress));
	const remainingToday = $derived(Math.max(0, DAILY_GOAL - doneToday));
	const goalReached = $derived(doneToday >= DAILY_GOAL);
	const reviewCount = $derived(reviewQueueCount());
	const termCnt = (mid: string) => termsUsingMorpheme(mid).length;

	function shuffle<T>(arr: T[]): T[] {
		return [...arr].sort(() => Math.random() - 0.5);
	}

	/**
	 * 세션 큐: 약점 가중 복습(due ∪ 약점 임계값 이상, 점수순) → 새 어근(단원 낮은 순 → 용어 多 순), target까지.
	 * 약점 큐는 의도적으로 셔플하지 않음 — 약한 게 앞에 와야 PRD 의도("약한 어근을 앞으로").
	 */
	function buildSession(size: number) {
		const target = Math.max(1, size);

		// 범위 스코프: 선택 계통 용어에 쓰이는 어근만. null = 전체.
		const scopeRoots = systemFilter ? new Set(systemRootIds(systemFilter)) : null;
		const inScope = (m: Morpheme) => !scopeRoots || scopeRoots.has(m.id);

		const reviewAll = getReviewQueue().map((q) => q.morpheme).filter(inScope);
		const fresh = learnableMorphemes
			.filter((m) => isMorphemeNew(m.id) && inScope(m))
			.sort((a, b) => a.unit - b.unit || termCnt(b.id) - termCnt(a.id) || a.id.localeCompare(b.id));

		// 새 어근 슬롯을 먼저 확보 → 복습이 세션을 독점해 레버리지 체감이 멈추는 걸 막음.
		const maxNew = Math.min(MAX_NEW, fresh.length);
		const guaranteedNew = Math.min(MIN_NEW, maxNew);
		const reviewCount = Math.min(reviewAll.length, Math.floor(target * REVIEW_FRAC), target - guaranteedNew);

		const cards: Morpheme[] = [];
		const seen = new Set<string>();
		for (const m of reviewAll.slice(0, Math.max(0, reviewCount))) {
			cards.push(m);
			seen.add(m.id);
		}
		// 새 어근 채우기 (Unit↑ → 용어수↓ = 빈도+레버리지), maxNew 한도까지 target 채움.
		let added = 0;
		for (const m of fresh) {
			if (cards.length >= target || added >= maxNew) break;
			if (seen.has(m.id)) continue;
			cards.push(m);
			seen.add(m.id);
			added++;
		}
		// 새 어근이 모자라면 남은 복습으로 채움.
		if (cards.length < target) {
			for (const m of reviewAll) {
				if (cards.length >= target) break;
				if (seen.has(m.id)) continue;
				cards.push(m);
				seen.add(m.id);
			}
		}
		// 그래도 모자라면 이미 한 번 본(친숙) 어근 추가 복습
		if (cards.length < target) {
			for (const m of shuffle(learnableMorphemes.filter((m) => !seen.has(m.id) && inScope(m)))) {
				if (cards.length >= target) break;
				cards.push(m);
				seen.add(m.id);
			}
		}
		queue = cards.length > target ? cards.slice(0, target) : cards;
		index = 0;
		flipped = false;
		dragX = 0;
		leaving = null;
		done = false;
		xpGained = 0;
		cardsDone = 0;
		newRoots = [];
		newBadges = [];
		cardShownAt = Date.now();
	}

	const current = $derived(queue[index] as Morpheme | undefined);
	const isNew = $derived(current ? isMorphemeNew(current.id) : false);
	const isWeak = $derived(current && !isNew ? isMorphemeWeak(current.id) : false);
	const pct = $derived(queue.length ? Math.round((index / queue.length) * 100) : 0);
	const hardOpacity = $derived(Math.max(0, Math.min(1, -dragX / SWIPE_THRESH)));
	const easyOpacity = $derived(Math.max(0, Math.min(1, dragX / SWIPE_THRESH)));

	function noteCollected(mid: string) {
		const before = progress.collectedRoots.length;
		progress = collectRoot(progress, mid);
		if (progress.collectedRoots.length > before) newRoots = [...newRoots, morphemeById[mid]?.form ?? mid];
	}

	function rate(rating: Rating) {
		const m = current;
		if (!m) return;
		const responseMs = Date.now() - cardShownAt;
		applyMorphemeRating(m.id, rating, responseMs);
		if (rating >= 2) noteCollected(m.id);
		const xp = XP_BY_RATING[rating];
		xpGained += xp;
		cardsDone += 1;
		progress = gainXP(progress, xp);
		progress = recordCardLearned(progress);
		dragX = 0;
		leaving = null;
		flipped = false;
		if (index >= queue.length - 1) {
			progress = registerStudyDay(progress);
			const r = checkBadges(progress);
			progress = r.progress;
			newBadges = r.newly;
			done = true;
		} else {
			index += 1;
			cardShownAt = Date.now();
		}
	}

	function commitSwipe(d: 'left' | 'right') {
		leaving = d;
		setTimeout(() => rate(d === 'right' ? 3 : 0), 220);
	}

	function flip() {
		flipped = !flipped;
	}

	// ── pointer drag ──
	function onDown(e: PointerEvent) {
		if (leaving || done) return;
		dragging = true;
		moved = false;
		startX = e.clientX;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}
	function onMove(e: PointerEvent) {
		if (!dragging) return;
		const dx = e.clientX - startX;
		// 6px 이하 미세 떨림은 무시 — 그렇지 않으면 탭만 해도 카드가 살짝 움직였다 돌아오면서 "울렁".
		if (!moved && Math.abs(dx) <= 6) return;
		moved = true;
		dragX = dx;
	}
	function onUp() {
		if (!dragging) return;
		dragging = false;
		const dx = dragX;
		if (dx > SWIPE_THRESH) commitSwipe('right');
		else if (dx < -SWIPE_THRESH) commitSwipe('left');
		else dragX = 0;
	}
	function onCardClick() {
		if (moved) {
			moved = false;
			return;
		}
		flip();
	}
	function onCardKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			flip();
		} else if (!leaving) {
			if (e.key === 'ArrowLeft') commitSwipe('left');
			else if (e.key === 'ArrowRight') commitSwipe('right');
		}
	}

	function start() {
		buildSession(remainingToday > 0 ? Math.max(remainingToday, 8) : EXTRA_BATCH);
		started = true;
	}
	function moreCards() {
		buildSession(EXTRA_BATCH);
	}
	const exit = () => goto('/campus');
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={exit} aria-label="나가기"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">강의실</div>
		<div class="count">{started && !done ? `${Math.min(index + 1, queue.length)}/${queue.length}` : ''}</div>
	</header>
	{#if started && !done}<div class="prog"><span style="width:{pct}%"></span></div>{/if}

	{#if !started}
		<section class="picker">
			<div class="pk-mascot"><Mascot size={104} variant={charIdx} /></div>
			{#if goalReached}
				<div class="pk-goal done"><Icon name="check" size={13} /> 오늘 목표 {DAILY_GOAL}장 완료! 추가로 더?</div>
			{:else}
				<div class="pk-goal">오늘 <b>{doneToday}</b> / {DAILY_GOAL}장 · {remainingToday}장 하면 목표 달성</div>
			{/if}
			<h1 class="pk-title">어원 익히기</h1>
			<p class="pk-sub">의학용어를 이루는 어원 조각(어근·접두사·접미사) 플래시카드예요.<br />여기서 어근에 익숙해지면 도서관·병동에서 용어가 술술 읽혀요.</p>

			<div class="pk-scopepick">
				<div class="pk-scope-h"><Icon name="stethoscope" size={12} /> 학습 범위 (보정사 계통)</div>
				<div class="pk-scope-row">
					<button type="button" class="pk-chip" class:active={!systemFilter} onclick={() => (systemFilter = null)}>전체</button>
					{#each scopeOptions as s (s.id)}
						<button type="button" class="pk-chip" class:active={systemFilter === s.id} onclick={() => (systemFilter = s.id)}>{s.nameKo}</button>
					{/each}
				</div>
			</div>

			{#if reviewCount > 0}<div class="pk-due"><Icon name="rotateCcw" size={13} /> 복습할 어원 {reviewCount}개 대기 중</div>{/if}
			<button class="pk-start pill-btn pill-btn--primary" onclick={start}>시작하기</button>
		</section>
	{:else if done}
		<section class="result">
			<div class="r-inner">
				<div class="r-mascot"><Mascot size={112} variant={charIdx} /></div>
				<h1 class="r-title">
					{#if goalReached}<Icon name="party" size={20} /> 오늘 목표 달성!{:else}세션 완료!{/if}
				</h1>
				<p class="r-sub">{cardsDone}개 어원 학습 · <b>+{xpGained} XP</b></p>
				<div class="r-stats">
					<span class="r-stat"><Icon name="bookCheck" size={14} /> 오늘 {doneToday}{doneToday >= DAILY_GOAL ? '장' : ` / ${DAILY_GOAL}`}</span>
					<span class="r-stat"><Icon name="flame" size={14} /> {progress.streak}일 연속</span>
					<span class="r-stat">Lv.{progress.level}</span>
				</div>
				{#if newRoots.length}
					<div class="r-card">
						<div class="tag"><Icon name="sparkles" size={12} /> 친숙해진 어원</div>
						<div class="r-chips">{#each newRoots as r (r)}<span class="chip">{r}</span>{/each}</div>
					</div>
				{/if}
				{#if newBadges.length}
					<div class="r-card r-card--badge">
						<div class="tag"><Icon name="award" size={12} /> 뱃지 획득</div>
						<div class="r-chips">{#each newBadges as b (b.id)}<span class="r-badge"><Icon name={b.icon as IconName} size={13} /> {b.name}</span>{/each}</div>
					</div>
				{/if}
			</div>
			<div class="r-actions">
				<button class="pill-btn pill-btn--ghost" onclick={moreCards}>+{EXTRA_BATCH}개 더</button>
				<button class="pill-btn pill-btn--primary" onclick={exit}>캠퍼스로</button>
			</div>
		</section>
	{:else if current}
		<section class="study">
			<div class="stage">
				<div class="edge edge-l" style="opacity:{hardOpacity}"><span class="edge-stamp hard"><Icon name="x" size={16} /> 못 떠올렸다</span></div>
				<div class="edge edge-r" style="opacity:{easyOpacity}"><span class="edge-stamp easy"><Icon name="check" size={16} /> 떠올렸다</span></div>

				{#key index}
					<div
						class="flashcard card"
						class:dragging
						class:flipped
						class:leaving-left={leaving === 'left'}
						class:leaving-right={leaving === 'right'}
						style="--dx:{dragX}px; --dr:{(dragX * 0.04).toFixed(2)}deg"
						role="button"
						tabindex="0"
						onpointerdown={onDown}
						onpointermove={onMove}
						onpointerup={onUp}
						onpointercancel={onUp}
						onclick={onCardClick}
						onkeydown={onCardKey}
					>
						<span class="fc-tag" class:isnew={isNew} class:isweak={isWeak}>{isNew ? '처음 보는 어원' : isWeak ? '최근 약한 어원' : '이 어원의 뜻은?'}</span>
						{#if !flipped}
							<span class="fc-headline fc-headline--form">{current.form}</span>
							<span class="fc-foot">탭하면 뜻 ▾</span>
						{:else}
							<span class="fc-headline">{current.meaningKo}</span>
							<span class="fc-foot" aria-hidden="true"></span>
						{/if}
						<span class="fc-swipehint">← 못 떠올렸다 &nbsp;·&nbsp; 떠올렸다 →</span>
					</div>
				{/key}
			</div>
		</section>
	{/if}
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.count { font-size: 13px; color: var(--mut); font-weight: 600; min-width: 40px; text-align: right; }
	.prog { height: 4px; background: var(--line); flex: none; }
	.prog span { display: block; height: 100%; background: var(--brand); transition: width 0.3s; }

	/* 시작 화면 */
	.picker { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 18px 24px 24px; gap: 10px; overflow-y: auto; }
	.pk-mascot { display: flex; justify-content: center; padding: 8px 0 2px; }
	.pk-goal { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--ink-2); background: var(--card); border-radius: 999px; padding: 6px 12px; }
	.pk-goal b { color: var(--brand-d); }
	.pk-goal.done { background: var(--brand-l); color: var(--brand-d); }
	.pk-title { font-size: 23px; font-weight: 800; margin: 6px 0 2px; }
	.pk-sub { font-size: 13.5px; color: var(--ink-2); line-height: 1.6; }
	.pk-due { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--brand-d); background: var(--brand-l); border-radius: 999px; padding: 6px 12px; }
	.pk-scopepick { width: 100%; display: flex; flex-direction: column; gap: 7px; margin-top: 4px; }
	.pk-scope-h { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 800; color: var(--mut); letter-spacing: 0.04em; }
	.pk-scope-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
	.pk-chip {
		appearance: none; font: inherit; cursor: pointer;
		background: #fff; border: 1.5px solid var(--line); border-radius: 999px;
		padding: 6px 12px; font-size: 12.5px; font-weight: 700; color: var(--ink-2);
		transition: border-color 0.12s, background 0.12s, color 0.12s;
	}
	.pk-chip:active { transform: scale(0.97); }
	.pk-chip.active { background: var(--brand-l); border-color: var(--brand); color: var(--brand-d); }
	.pk-start { margin-top: auto; width: 100%; }

	.study { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 16px 16px; gap: 12px; }

	/* 스와이프 카드 */
	.stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: stretch; justify-content: center; }
	.edge { position: absolute; top: 0; bottom: 0; width: 44%; display: flex; align-items: center; pointer-events: none; z-index: 1; }
	.edge-l { left: 0; justify-content: flex-start; padding-left: 8px; }
	.edge-r { right: 0; justify-content: flex-end; padding-right: 8px; }
	.edge-stamp { display: inline-flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 800; padding: 8px 12px; border-radius: 14px; border: 2.5px solid; }
	.edge-stamp.hard { color: #e2706b; border-color: #e2706b; transform: rotate(-10deg); }
	.edge-stamp.easy { color: var(--brand-d); border-color: var(--brand-d); transform: rotate(10deg); }

	.flashcard {
		position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
		padding: 26px 18px; touch-action: pan-y; cursor: grab;
		transform: translateX(var(--dx)) rotate(var(--dr));
		transition: transform 0.2s cubic-bezier(0.2, 1, 0.4, 1); will-change: transform;
		user-select: none; -webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}
	.flashcard:focus-visible { outline: 2px solid var(--brand); outline-offset: -4px; }
	.flashcard.dragging { transition: none; cursor: grabbing; }
	.flashcard.leaving-left { transform: translateX(-130%) rotate(-22deg); opacity: 0; transition: transform 0.22s ease-in, opacity 0.22s ease-in; }
	.flashcard.leaving-right { transform: translateX(130%) rotate(22deg); opacity: 0; transition: transform 0.22s ease-in, opacity 0.22s ease-in; }

	/* 앞/뒤 뒤집을 때 위치가 튀지 않도록 각 줄을 고정 높이로. */
	.fc-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); height: 16px; line-height: 16px; }
	.fc-tag.isnew { color: var(--brand-d); }
	.fc-tag.isweak { color: #d97706; }
	.fc-headline { font-size: 34px; font-weight: 800; margin-top: 12px; line-height: 1; height: 48px; display: flex; align-items: center; justify-content: center; overflow-wrap: anywhere; color: var(--ink); }
	.fc-headline--form { color: var(--brand-d); }
	.fc-foot { font-size: 13px; color: var(--mut); margin-top: 20px; height: 18px; line-height: 18px; }
	.fc-swipehint { margin-top: 16px; font-size: 12px; color: var(--mut); font-weight: 600; height: 16px; line-height: 16px; }

	/* 결과 */
	.result { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 0 22px 22px; overflow-y: auto; }
	.r-inner { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px 0; }
	.r-mascot { display: flex; margin-bottom: 4px; }
	.r-title { font-size: 23px; font-weight: 800; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; line-height: 1.25; }
	.r-sub { margin-top: 10px; font-size: 14px; color: var(--ink-2); }
	.r-sub b { color: var(--brand-d); }
	.r-stats { margin-top: 14px; display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
	.r-stat { display: inline-flex; align-items: center; gap: 4px; background: var(--card); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; color: var(--ink-2); }
	.r-card { margin-top: 18px; width: 100%; max-width: 340px; background: var(--card); border-radius: var(--r-md); padding: 12px 14px; text-align: left; }
	.r-card--badge { background: #fff8ec; }
	.r-chips { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
	.r-badge { font-size: 12.5px; font-weight: 700; background: #fff; border-radius: 999px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px; }
	.r-actions { flex: none; padding-top: 16px; display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }
</style>
