<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { hasEntitlement } from '$lib/stores/entitlements.svelte';
	import { SUPABASE_ENABLED } from '$lib/supabase/env';
	import { PAYMENTS_ENABLED } from '$lib/payments/env';
	import { PRODUCTS } from '$lib/payments/products';
	import { BOJEONGSA_SYSTEMS, termsBySystem } from '$lib/data/bojeongsa';
	import {
		buildCourse,
		scopeOf,
		TIME_PRESETS,
		type CramCourse
	} from '$lib/data/emergency';
	import {
		applyMorphemeRating,
		getMorphemeState,
		weaknessScore,
		type Rating
	} from '$lib/stores/srs.svelte';
	import {
		loadProgress,
		gainXP,
		collectRoot,
		recordCardLearned,
		registerStudyDay,
		checkBadges,
		type Badge,
		type Progress
	} from '$lib/stores/progress.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { data } = $props();

	type Step = 'checking' | 'locked' | 'scope' | 'plan' | 'drill' | 'done';
	let step = $state<Step>('checking');

	let progress = $state<Progress>(loadProgress());
	let collected = $derived(new Set(progress.collectedRoots));

	// 비어있지 않은(그물 보유) 계통만 선택지로. 기본 = 전부 선택.
	const sysOptions = BOJEONGSA_SYSTEMS.filter((s) => (termsBySystem[s.id] ?? []).length > 0);
	let picked = $state<Set<string>>(new Set(sysOptions.map((s) => s.id)));
	let minutes = $state<number>(60);

	onMount(async () => {
		progress = loadProgress();
		const unlocked = SUPABASE_ENABLED && PAYMENTS_ENABLED
			? await hasEntitlement(data.supabase, 'emergency_unlock')
			: true; // 결제 미설정(키 없음) = 데모 모드(전체 기능 열림)
		step = unlocked ? 'scope' : 'locked';
	});

	const weaknessOf = (mid: string) => weaknessScore(getMorphemeState(mid));

	// 선택 범위 진단 (라이브).
	const diag = $derived(scopeOf([...picked], collected));
	const unfamiliarInScope = $derived(diag.unfamiliarRoots.length);
	const lockedTerms = $derived(diag.totalTerms - diag.readableNow);

	function toggleSys(id: string) {
		const next = new Set(picked);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		picked = next;
	}

	let course = $state<CramCourse | null>(null);
	function makeCourse() {
		if (picked.size === 0) return;
		course = buildCourse([...picked], minutes, collected, weaknessOf);
		step = 'plan';
	}

	// ── 드릴 (강의실과 같은 스와이프 카드, 코스 어근만) ──────────────
	const XP_BY_RATING: Record<Rating, number> = { 0: 0, 1: 3, 2: 5, 3: 10 };
	const SWIPE_THRESH = 90;
	let queue = $state<CramCourse['roots']>([]);
	let index = $state(0);
	let flipped = $state(false);
	let xpGained = $state(0);
	let learnedRoots = $state<string[]>([]);
	let newBadges = $state<Badge[]>([]);

	let dragX = $state(0);
	let dragging = $state(false);
	let leaving = $state<null | 'left' | 'right'>(null);
	let startX = 0;
	let moved = false;
	let cardShownAt = Date.now();

	const current = $derived(queue[index]);
	const pct = $derived(queue.length ? Math.round((index / queue.length) * 100) : 0);
	const hardOpacity = $derived(Math.max(0, Math.min(1, -dragX / SWIPE_THRESH)));
	const easyOpacity = $derived(Math.max(0, Math.min(1, dragX / SWIPE_THRESH)));

	function startDrill() {
		if (!course || course.roots.length === 0) return;
		queue = course.roots;
		index = 0;
		flipped = false;
		dragX = 0;
		leaving = null;
		xpGained = 0;
		learnedRoots = [];
		newBadges = [];
		cardShownAt = Date.now();
		step = 'drill';
	}

	function rate(rating: Rating) {
		const m = current;
		if (!m) return;
		applyMorphemeRating(m.id, rating, Date.now() - cardShownAt);
		if (rating >= 2) {
			const before = progress.collectedRoots.length;
			progress = collectRoot(progress, m.id);
			if (progress.collectedRoots.length > before) learnedRoots = [...learnedRoots, m.form];
		}
		xpGained += XP_BY_RATING[rating];
		progress = gainXP(progress, XP_BY_RATING[rating]);
		progress = recordCardLearned(progress);
		dragX = 0;
		leaving = null;
		flipped = false;
		if (index >= queue.length - 1) {
			progress = registerStudyDay(progress);
			const r = checkBadges(progress);
			progress = r.progress;
			newBadges = r.newly;
			// 드릴 후 갱신된 친숙 어근으로 커버리지 재계산.
			if (course) course = buildCourse([...picked], minutes, progress.collectedRoots, weaknessOf);
			step = 'done';
		} else {
			index += 1;
			cardShownAt = Date.now();
		}
	}

	function commitSwipe(d: 'left' | 'right') {
		leaving = d;
		setTimeout(() => rate(d === 'right' ? 3 : 0), 220);
	}

	function onDown(e: PointerEvent) {
		if (leaving) return;
		dragging = true;
		moved = false;
		startX = e.clientX;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}
	function onMove(e: PointerEvent) {
		if (!dragging) return;
		const dx = e.clientX - startX;
		if (!moved && Math.abs(dx) <= 6) return;
		moved = true;
		dragX = dx;
	}
	function onUp() {
		if (!dragging) return;
		dragging = false;
		if (dragX > SWIPE_THRESH) commitSwipe('right');
		else if (dragX < -SWIPE_THRESH) commitSwipe('left');
		else dragX = 0;
	}
	function onCardClick() {
		if (moved) {
			moved = false;
			return;
		}
		flipped = !flipped;
	}
	function onCardKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			flipped = !flipped;
		} else if (!leaving) {
			if (e.key === 'ArrowLeft') commitSwipe('left');
			else if (e.key === 'ArrowRight') commitSwipe('right');
		}
	}

	function toScopeLibrary() {
		const sys = [...picked][0];
		goto(`/library?system=${sys}`);
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">응급실</div>
		<div style="width:36px"></div>
	</header>

	{#if step === 'drill'}<div class="prog"><span style="width:{pct}%"></span></div>{/if}

	<div class="scroll">
		{#if step === 'checking'}
			<div class="loading">확인 중…</div>

		{:else if step === 'locked'}
			<div class="lock-hero card pad">
				<div class="lock-ic"><Icon name="siren" size={30} /></div>
				<h1>응급실 — 벼락치기 모드</h1>
				<p class="lead">
					시험 범위와 남은 시간을 넣으면, 레버리지×약점×범위포함도로 정렬한
					<b>시간예산 압축 코스</b>를 만들어 줍니다. 통째 암기와 달리 어근을 남겨
					다음 벼락치기를 단축해요(복리).
				</p>
				<ul class="perks">
					<li><Icon name="check" size={15} /> "90분: 어근 18개 → 시험범위 64개 커버"</li>
					<li><Icon name="check" size={15} /> 약점 가중 정렬, 런타임 LLM 0</li>
					<li><Icon name="check" size={15} /> 한 번 사면 계속 사용</li>
				</ul>
				<button class="pill-btn pill-btn--primary" onclick={() => goto('/checkout/emergency_unlock')}>
					{PRODUCTS.emergency_unlock.amount.toLocaleString()}원에 해금하기
				</button>
				{#if !data.user}
					<p class="hint">결제하려면 먼저 로그인이 필요해요.</p>
				{/if}
			</div>

		{:else if step === 'scope'}
			<!-- ① 진단 쇼크 + 범위 선택 -->
			<div class="diag card pad">
				<div class="diag-ic"><Icon name="siren" size={26} /></div>
				<h1>벼락치기 진단</h1>
				{#if diag.totalTerms === 0}
					<p class="lead">계통을 하나 이상 선택하세요.</p>
				{:else}
					<p class="lead">
						선택 범위에 용어 <b>{diag.totalTerms}개</b> 중
						아직 못 읽는 게 <b class="warn">{lockedTerms}개</b>.
						안 익힌 어근 <b>{unfamiliarInScope}개</b>를 빠르게 메우면 돼요.
					</p>
				{/if}
			</div>

			<div class="sec-label">시험 범위 (계통)</div>
			<div class="sys-grid">
				{#each sysOptions as s (s.id)}
					{@const cov = scopeOf([s.id], collected)}
					<button class="sys-chip" class:on={picked.has(s.id)} onclick={() => toggleSys(s.id)}>
						<span class="sys-name">{s.nameKo}</span>
						<span class="sys-meta">{cov.readableNow}/{cov.totalTerms}</span>
						{#if picked.has(s.id)}<span class="sys-tick"><Icon name="check" size={12} /></span>{/if}
					</button>
				{/each}
			</div>

			<div class="sec-label">남은 시간</div>
			<div class="time-row">
				{#each TIME_PRESETS as t (t)}
					<button class="time-chip" class:on={minutes === t} onclick={() => (minutes = t)}>{t}분</button>
				{/each}
			</div>

			<button class="pill-btn pill-btn--primary go" disabled={picked.size === 0 || diag.totalTerms === 0} onclick={makeCourse}>
				압축 코스 만들기
			</button>
			<div class="bottom-space"></div>

		{:else if step === 'plan' && course}
			<!-- ② 압축 코스 -->
			<div class="plan-hero card pad">
				<div class="plan-head">{course.minutes}분 압축 코스</div>
				<div class="plan-big">
					어근 <b>{course.roots.length}개</b>
					<Icon name="arrowRight" size={18} />
					시험범위 <b class="ok">{course.projectedReadable}개</b> 커버
				</div>
				<p class="plan-sub">
					지금 {course.readableNow}개 읽힘 → 완주하면 <b class="ok">+{course.newlyReadable}개</b>
					(범위 {course.totalTerms}개 중)
				</p>
				{#if course.truncated}
					<p class="plan-note"><Icon name="flame" size={13} /> 시간이 빠듯해 레버리지 높은 {course.roots.length}개만 담았어요. 남은 {course.candidateCount - course.roots.length}개는 다음에.</p>
				{/if}
			</div>

			<div class="sec-label">학습 순서 (레버리지 높은 순)</div>
			<div class="root-list card">
				{#each course.roots as r, i (r.id)}
					<div class="root-row">
						<span class="root-no">{i + 1}</span>
						<span class="root-form">{r.form}</span>
						<span class="root-mean">{r.meaningKo}</span>
						{#if r.directUnlocks > 0}<span class="root-unlock">용어 {r.directUnlocks}개</span>{/if}
					</div>
				{/each}
			</div>

			{#if course.roots.length === 0}
				<p class="empty-note">이 범위는 이미 다 익혔어요! 도서관에서 디코딩으로 굳혀보세요.</p>
			{/if}

			<div class="plan-actions">
				<button class="pill-btn pill-btn--ghost" onclick={() => (step = 'scope')}>범위 수정</button>
				<button class="pill-btn pill-btn--primary" disabled={course.roots.length === 0} onclick={startDrill}>시작하기</button>
			</div>
			<div class="bottom-space"></div>

		{:else if step === 'drill' && current}
			<!-- ③ 빠른 드릴 -->
			<section class="study">
				<div class="study-top">{index + 1} / {queue.length}</div>
				<div class="stage">
					<div class="edge edge-l" style="opacity:{hardOpacity}"><span class="edge-stamp hard"><Icon name="x" size={16} /> 모름</span></div>
					<div class="edge edge-r" style="opacity:{easyOpacity}"><span class="edge-stamp easy"><Icon name="check" size={16} /> 안다</span></div>
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
							<span class="fc-tag">{flipped ? '뜻' : '이 어원의 뜻은?'}</span>
							{#if !flipped}
								<span class="fc-headline fc-headline--form">{current.form}</span>
								<span class="fc-foot">탭하면 뜻 ▾</span>
							{:else}
								<span class="fc-headline">{current.meaningKo}</span>
								<span class="fc-foot" aria-hidden="true"></span>
							{/if}
							<span class="fc-swipehint">← 모름 &nbsp;·&nbsp; 안다 →</span>
						</div>
					{/key}
				</div>
			</section>

		{:else if step === 'done' && course}
			<!-- ④ 결과 -->
			<div class="done-hero card pad">
				<div class="ok-ic"><Icon name="party" size={28} /></div>
				<h1>벼락치기 완료!</h1>
				<p class="lead">어근 <b>{learnedRoots.length}개</b> 새로 익힘 · <b class="ok">+{xpGained} XP</b></p>
				<div class="cover-box">
					<div class="cover-big">시험범위 <b class="ok">{course.projectedReadable}/{course.totalTerms}</b> 읽힘</div>
					<div class="cover-bar"><span style="width:{course.totalTerms ? (course.projectedReadable / course.totalTerms) * 100 : 0}%"></span></div>
				</div>
				{#if learnedRoots.length}
					<div class="learned-chips">{#each learnedRoots as r (r)}<span class="chip">{r}</span>{/each}</div>
				{/if}
				{#if newBadges.length}
					<div class="learned-chips">{#each newBadges as b (b.id)}<span class="chip badge"><Icon name="award" size={12} /> {b.name}</span>{/each}</div>
				{/if}
			</div>
			<p class="done-tip">익힌 어근은 다음 시험에도 남아요(복리). 이제 도서관에서 범위를 디코딩으로 굳혀보세요.</p>
			<div class="plan-actions">
				<button class="pill-btn pill-btn--ghost" onclick={() => goto('/campus')}>캠퍼스로</button>
				<button class="pill-btn pill-btn--primary" onclick={toScopeLibrary}>범위 디코딩</button>
			</div>
			<div class="bottom-space"></div>
		{/if}
	</div>

	{#if step !== 'drill'}<BottomNav active="campus" />{/if}
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 0; }
	.card.pad { padding: 22px 20px; }
	.loading { text-align: center; color: var(--mut); padding: 40px 0; }
	.prog { height: 4px; background: var(--line); flex: none; }
	.prog span { display: block; height: 100%; background: var(--brand); transition: width 0.3s; }
	.bottom-space { height: 80px; }

	/* 잠금 */
	.lock-hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
	.lock-ic { width: 64px; height: 64px; border-radius: 999px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #ff8a5b, #e7607a); }
	h1 { font-size: 19px; font-weight: 800; color: var(--ink); }
	.lead { font-size: 13.5px; color: var(--mut); line-height: 1.6; text-align: center; }
	.lead b { color: var(--ink-2); }
	.lead b.warn { color: #e2706b; }
	.lead b.ok { color: var(--brand-d); }
	.perks { width: 100%; display: flex; flex-direction: column; gap: 8px; margin: 4px 0 6px; }
	.perks li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); }
	.perks li :global(svg) { color: var(--brand); flex: none; }
	.pill-btn { width: 100%; }
	.hint { font-size: 12px; color: var(--mut); }

	/* 진단 */
	.diag { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
	.diag-ic { width: 56px; height: 56px; border-radius: 999px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #ff8a5b, #e7607a); }

	.sec-label { font-size: 12px; font-weight: 700; color: var(--mut); margin: 16px 4px 8px; }
	.sys-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.sys-chip { position: relative; text-align: left; background: var(--card); border: 1.5px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; transition: all 0.15s; }
	.sys-chip.on { border-color: var(--brand); background: var(--brand-l); }
	.sys-name { font-size: 13px; font-weight: 700; color: var(--ink); }
	.sys-meta { font-size: 11.5px; color: var(--mut); font-weight: 600; }
	.sys-tick { position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 999px; background: var(--brand); color: #fff; display: grid; place-items: center; }

	.time-row { display: flex; gap: 8px; }
	.time-chip { flex: 1; background: var(--card); border: 1.5px solid var(--line); border-radius: var(--r-md); padding: 10px 0; font-size: 14px; font-weight: 700; color: var(--ink-2); transition: all 0.15s; }
	.time-chip.on { border-color: var(--brand); background: var(--brand-l); color: var(--brand-d); }
	.go { margin-top: 18px; }

	/* 압축 코스 */
	.plan-hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; background: linear-gradient(135deg, #effaf3, #fff); }
	.plan-head { font-size: 12.5px; font-weight: 700; color: var(--brand-d); background: #fff; border-radius: 999px; padding: 5px 12px; }
	.plan-big { font-size: 19px; font-weight: 800; color: var(--ink); display: flex; align-items: center; gap: 6px; }
	.plan-big b { color: var(--ink); }
	.plan-big b.ok { color: var(--brand-d); }
	.plan-big :global(svg) { color: var(--mut); }
	.plan-sub { font-size: 13px; color: var(--mut); }
	.plan-sub b.ok { color: var(--brand-d); }
	.plan-note { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #d97706; }

	.root-list { padding: 4px 0; }
	.root-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px solid var(--line); }
	.root-row:last-child { border-bottom: none; }
	.root-no { width: 20px; font-size: 12px; font-weight: 700; color: var(--mut); flex: none; }
	.root-form { font-size: 14px; font-weight: 800; color: var(--brand-d); min-width: 64px; flex: none; }
	.root-mean { flex: 1; font-size: 13px; color: var(--ink-2); }
	.root-unlock { font-size: 11px; font-weight: 700; color: var(--brand-d); background: var(--brand-l); border-radius: 999px; padding: 3px 8px; flex: none; }
	.empty-note { text-align: center; font-size: 13px; color: var(--mut); padding: 16px; }
	.plan-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 18px; }

	/* 드릴 (강의실 카드 재사용) */
	.study { display: flex; flex-direction: column; gap: 12px; height: calc(100dvh - 56px - 4px - 24px); }
	.study-top { text-align: center; font-size: 13px; font-weight: 600; color: var(--mut); }
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
		user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; outline: none;
	}
	.flashcard:focus-visible { outline: 2px solid var(--brand); outline-offset: -4px; }
	.flashcard.dragging { transition: none; cursor: grabbing; }
	.flashcard.leaving-left { transform: translateX(-130%) rotate(-22deg); opacity: 0; transition: transform 0.22s ease-in, opacity 0.22s ease-in; }
	.flashcard.leaving-right { transform: translateX(130%) rotate(22deg); opacity: 0; transition: transform 0.22s ease-in, opacity 0.22s ease-in; }
	.fc-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); height: 16px; line-height: 16px; }
	.fc-headline { font-size: 34px; font-weight: 800; margin-top: 12px; line-height: 1; height: 48px; display: flex; align-items: center; justify-content: center; overflow-wrap: anywhere; color: var(--ink); }
	.fc-headline--form { color: var(--brand-d); }
	.fc-foot { font-size: 13px; color: var(--mut); margin-top: 20px; height: 18px; line-height: 18px; }
	.fc-swipehint { margin-top: 16px; font-size: 12px; color: var(--mut); font-weight: 600; height: 16px; line-height: 16px; }

	/* 결과 */
	.done-hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
	.ok-ic { width: 60px; height: 60px; border-radius: 999px; display: grid; place-items: center; color: #fff; background: var(--brand); }
	.cover-box { width: 100%; margin-top: 4px; }
	.cover-big { font-size: 14px; font-weight: 700; color: var(--ink-2); margin-bottom: 8px; }
	.cover-big b.ok { color: var(--brand-d); }
	.cover-bar { height: 10px; background: var(--line); border-radius: 999px; overflow: hidden; }
	.cover-bar span { display: block; height: 100%; background: var(--brand); border-radius: 999px; transition: width 0.5s; }
	.learned-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
	.chip.badge { display: inline-flex; align-items: center; gap: 4px; background: #fff8ec; }
	.done-tip { text-align: center; font-size: 12.5px; color: var(--mut); line-height: 1.6; margin: 14px 4px 0; }
</style>
