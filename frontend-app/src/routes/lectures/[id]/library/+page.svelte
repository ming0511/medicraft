<script lang="ts">
	// 강의 전용 도서관 — /library 의 UX를 그대로 두고 큐 소스만 이 강의의 용어로 한정.
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { terms, type MedicalTerm, type DecodingCandidate, type DecodingTier } from '$lib/data/terms';
	import { morphemeById } from '$lib/data/morphemes';
	import { resolveLecture } from '$lib/stores/generated-lectures.svelte';
	import { isDailyMergeEnabled } from '$lib/stores/lecture-prefs.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
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
	import { applyMorphemeRating } from '$lib/stores/srs.svelte';
	import { loadProfile } from '$lib/stores/profile.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	const SESSION_SIZE = 8;
	const XP_CORRECT = 30;
	const DIFFICULTY_KEY = 'medicraft.library.difficulty';
	type Difficulty = 'easy' | 'normal' | 'hard';
	const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };
	const DIFFICULTY_DESC: Record<Difficulty, string> = {
		easy: '분해 + 조각 뜻 다 보여줘요',
		normal: '분해는 보여주고 뜻은 숨겨요 (탭으로 확인)',
		hard: '통째로 보여줘요. 답 본 뒤 분해 공개.'
	};
	const TIER_ORDER: Record<DecodingTier, number> = { A: 0, B: 1, C: 2 };

	const lec = $derived(page.params.id ? resolveLecture(page.params.id) : undefined);
	// 토글 OFF면 이 세션은 격리된 연습 — XP/SRS/마스터/뱃지/카운터 전부 글로벌에 안 반영.
	const dailyMerged = $derived(lec ? isDailyMergeEnabled(lec.id) : true);

	// 이 강의의 *학습 가능한* MedicalTerm 들 (이미 그물 || 자동 합류).
	const termByLabel = $derived(new Map(terms.map((t) => [t.term.toLowerCase(), t])));
	const lectureTerms = $derived.by<MedicalTerm[]>(() => {
		if (!lec) return [];
		const out: MedicalTerm[] = [];
		for (const lt of lec.set.terms) {
			if (!(lt.already_in_terms || lt.all_parts_verified)) continue;
			const t = termByLabel.get(lt.term.toLowerCase());
			if (t) out.push(t);
		}
		return out;
	});

	type Round = {
		candidate: DecodingCandidate;
		choices: { ko: string; correct: boolean }[];
	};

	let queue = $state<Round[]>([]);
	let index = $state(0);
	let difficulty = $state<Difficulty>('normal');
	let started = $state(false);
	let ready = $state(false);
	let revealed = $state<boolean[]>([]);
	let selected = $state<number | null>(null);
	let result = $state<'pending' | 'correct' | 'wrong'>('pending');
	let cardShownAt = Date.now();

	let progress = $state<Progress>(loadProgress());
	let xpGained = $state(0);
	let correctCount = $state(0);
	let cardsDone = $state(0);
	let done = $state(false);
	let newRoots = $state<string[]>([]);
	let newBadges = $state<Badge[]>([]);
	let charIdx = $state<0 | 1 | 2 | 3>(0);

	const current = $derived(queue[index]);
	const currentTerm = $derived(current?.candidate.term);
	const isLast = $derived(index >= queue.length - 1);

	onMount(() => {
		progress = loadProgress();
		const p = loadProfile();
		if (p) charIdx = p.character;
		const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(DIFFICULTY_KEY) : null;
		if (saved === 'easy' || saved === 'normal' || saved === 'hard') difficulty = saved;
		ready = true;
	});

	function shuffle<T>(arr: T[]): T[] {
		return [...arr].sort(() => Math.random() - 0.5);
	}

	function buildChoices(term: MedicalTerm): { ko: string; correct: boolean }[] {
		const sys = term.systems[0];
		const samePool = terms.filter((t) => t.id !== term.id && t.korean !== term.korean && t.systems[0] === sys);
		const distractors: string[] = [];
		for (const t of shuffle(samePool)) {
			if (distractors.length >= 3) break;
			if (!distractors.includes(t.korean)) distractors.push(t.korean);
		}
		if (distractors.length < 3) {
			const restPool = terms.filter(
				(t) => t.id !== term.id && t.korean !== term.korean && t.systems[0] !== sys && !distractors.includes(t.korean)
			);
			for (const t of shuffle(restPool)) {
				if (distractors.length >= 3) break;
				distractors.push(t.korean);
			}
		}
		return shuffle([
			{ ko: term.korean, correct: true },
			...distractors.map((ko) => ({ ko, correct: false }))
		]);
	}

	/** 강의 한정 디코딩 큐 — lectureTerms 만 대상으로 tier 분류. */
	function lectureDecodingQueue(): DecodingCandidate[] {
		const c = new Set(progress.collectedRoots);
		return lectureTerms
			.filter((t) => t.parts.length > 0 && t.parts.every((p) => morphemeById[p]))
			.map((t) => {
				const nr = t.parts.filter((p) => !c.has(p));
				const tier: DecodingTier = nr.length === 0 ? 'A' : nr.length === 1 ? 'B' : 'C';
				return { term: t, tier, newRoots: nr };
			})
			.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
	}

	function startSession(d: Difficulty) {
		difficulty = d;
		if (typeof localStorage !== 'undefined') localStorage.setItem(DIFFICULTY_KEY, d);

		const all = lectureDecodingQueue();
		const aTier = all.filter((c) => c.tier === 'A');
		const bTier = all.filter((c) => c.tier === 'B');
		const cTier = all.filter((c) => c.tier === 'C');
		const pool: DecodingCandidate[] = [...shuffle(aTier), ...shuffle(bTier)];
		if (pool.length < SESSION_SIZE) pool.push(...shuffle(cTier).slice(0, SESSION_SIZE - pool.length));

		const picked = pool.slice(0, SESSION_SIZE);
		queue = picked.map((cand) => ({ candidate: cand, choices: buildChoices(cand.term) }));
		index = 0;
		started = true;
		xpGained = 0;
		correctCount = 0;
		cardsDone = 0;
		done = false;
		newRoots = [];
		newBadges = [];
		setupRound();
	}

	function setupRound() {
		if (!queue[index]) return;
		const term = queue[index].candidate.term;
		revealed = Array(term.parts.length).fill(false);
		selected = null;
		result = 'pending';
		cardShownAt = Date.now();
	}

	function revealPart(i: number) {
		if (result !== 'pending') return;
		if (difficulty !== 'normal') return;
		revealed = revealed.map((r, idx) => (idx === i ? true : r));
	}

	function choose(choiceIdx: number) {
		if (result !== 'pending') return;
		const round = queue[index];
		if (!round) return;
		const responseMs = Date.now() - cardShownAt;
		selected = choiceIdx;
		const ok = round.choices[choiceIdx].correct;
		result = ok ? 'correct' : 'wrong';
		cardsDone += 1;

		const rating: 0 | 2 = ok ? 2 : 0;
		if (dailyMerged) {
			for (const mid of round.candidate.term.parts) {
				if (!morphemeById[mid]) continue;
				applyMorphemeRating(mid, rating, responseMs);
			}
		}

		if (ok) {
			correctCount += 1;
			xpGained += XP_CORRECT;
			if (dailyMerged) {
				progress = gainXP(progress, XP_CORRECT);
				for (const mid of round.candidate.term.parts) {
					const before = progress.collectedRoots.length;
					progress = collectRoot(progress, mid);
					if (progress.collectedRoots.length > before) {
						newRoots = [...newRoots, morphemeById[mid]?.form ?? mid];
					}
				}
			}
		}
		if (dailyMerged) progress = recordCardLearned(progress);
	}

	function next() {
		if (isLast) {
			if (dailyMerged) {
				progress = registerStudyDay(progress);
				const r = checkBadges(progress);
				progress = r.progress;
				newBadges = r.newly;
			}
			done = true;
		} else {
			index += 1;
			setupRound();
		}
	}

	const exit = () => goto(`/lectures/${lec?.id ?? ''}`);

	const queuePreview = $derived.by(() => {
		const all = lectureDecodingQueue();
		return {
			a: all.filter((c) => c.tier === 'A').length,
			b: all.filter((c) => c.tier === 'B').length,
			c: all.filter((c) => c.tier === 'C').length,
			total: all.length
		};
	});

	function partIsNewInTerm(mid: string, candidate: DecodingCandidate): boolean {
		return candidate.newRoots.includes(mid);
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={exit} aria-label="나가기"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">도서관</div>
		{#if started && !done}
			<div class="count">{Math.min(index + 1, queue.length)}/{queue.length}</div>
		{:else}
			<div style="width:36px"></div>
		{/if}
	</header>
	{#if started && !done}
		<div class="prog"><span style="width:{queue.length ? (index / queue.length) * 100 : 0}%"></span></div>
	{/if}

	{#if !lec}
		<div class="empty">강의를 찾을 수 없습니다.</div>
	{:else if ready && !started}
		<section class="picker">
			<div class="lec-badge"><Icon name="book" size={13} /> {lec.set.fixture.title}</div>
			{#if !dailyMerged}
				<div class="iso-chip"><Icon name="lightbulb" size={12} /> 데일리 풀에서 제외됨 — 이 세션 결과는 글로벌 진척에 안 쌓여요</div>
			{/if}
			<div class="pk-mascot"><Mascot size={104} variant={charIdx} /></div>
			<h1 class="pk-title">이 강의 용어 읽어내기</h1>
			<p class="pk-sub">
				이 강의자료의 용어를 어원으로 *쪼개 읽어내는* 차분한 퍼즐.<br />
				{#if dailyMerged}강의실에서 익힌 어원이 그대로 무기예요.
				{:else}격리된 연습 모드 — XP/마스터/뱃지는 안 쌓여요.{/if}
			</p>

			<div class="pk-preview card">
				<div class="pk-prev-row"><span class="pk-dot pk-dot--a"></span>모두 친숙 <b>{queuePreview.a}</b></div>
				<div class="pk-prev-row"><span class="pk-dot pk-dot--b"></span>1조각만 신규 <b>{queuePreview.b}</b></div>
				{#if queuePreview.c > 0}
					<div class="pk-prev-row pk-prev-row--mut"><span class="pk-dot pk-dot--c"></span>2조각+ 신규 {queuePreview.c}</div>
				{/if}
			</div>

			{#if queuePreview.total === 0}
				<div class="pk-empty">학습 가능한 용어가 아직 없어요. 결산표에서 자동 합류 항목을 확인하세요.</div>
			{:else}
				<div class="pk-diff">
					<div class="pk-diff-h">난이도</div>
					{#each ['easy', 'normal', 'hard'] as d (d)}
						<button type="button" class="pk-diff-card" class:active={difficulty === d} onclick={() => startSession(d as Difficulty)}>
							<span class="pkd-label">{DIFFICULTY_LABEL[d as Difficulty]}</span>
							<span class="pkd-desc">{DIFFICULTY_DESC[d as Difficulty]}</span>
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{:else if done}
		<section class="result">
			<div class="r-inner">
				<div class="r-mascot"><Mascot size={112} variant={charIdx} /></div>
				<h1 class="r-title"><Icon name="library" size={20} /> 도서관 종료</h1>
				<p class="r-sub">{correctCount} / {queue.length} 정답 · <b>+{xpGained} XP</b></p>
				<div class="r-stats">
					<span class="r-stat"><Icon name="bookCheck" size={14} /> {cardsDone}장</span>
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
			<div class="r-actions"><button class="pill-btn pill-btn--primary" onclick={exit}>강의로</button></div>
		</section>
	{:else if current && currentTerm}
		<section class="play">
			<div class="prompt card">
				<span class="prompt-q">이 용어의 뜻은?</span>
				<span class="prompt-en" class:prompt-en--big={difficulty === 'hard'}>{currentTerm.term}</span>
				{#if difficulty !== 'hard'}
					<div class="prompt-parts">
						{#each currentTerm.parts as mid, i (i)}
							{@const m = morphemeById[mid]}
							{@const isNewInTerm = partIsNewInTerm(mid, current.candidate)}
							{#if m}
								<button
									type="button"
									class="ppart"
									class:isnew={isNewInTerm}
									class:revealed={revealed[i] || difficulty === 'easy'}
									onclick={() => revealPart(i)}
									disabled={result !== 'pending' || difficulty === 'easy'}
								>
									<span class="ppart-form">{m.form}</span>
									{#if difficulty === 'easy' || revealed[i]}
										<span class="ppart-mean">{m.meaningKo}</span>
									{:else}
										<span class="ppart-mean ppart-mean--hidden">탭=뜻</span>
									{/if}
								</button>
								{#if i < currentTerm.parts.length - 1}<span class="ppart-op">+</span>{/if}
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<div class="choices">
				{#each current.choices as c, i (i)}
					<button
						type="button"
						class="choice"
						class:selected={selected === i}
						class:correct={result !== 'pending' && c.correct}
						class:wrong={result !== 'pending' && selected === i && !c.correct}
						onclick={() => choose(i)}
						disabled={result !== 'pending'}
					>
						{c.ko}
						{#if result !== 'pending' && c.correct}<Icon name="check" size={16} />{/if}
					</button>
				{/each}
			</div>
		</section>

		{#if result !== 'pending'}
			<div class="msheet-bg" role="presentation" onclick={next} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') next(); }}>
				<div class="msheet" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
					<div class="ms-emoji" class:good={result === 'correct'} class:bad={result === 'wrong'}>
						{#if result === 'correct'}<Icon name="sparkles" size={28} />{:else}<Icon name="frown" size={28} />{/if}
					</div>
					<div class="ms-title">{result === 'correct' ? '정답!' : '아쉬워요'}</div>

					<div class="ms-term">
						<b class="ms-en">{currentTerm.term}</b>
						<span class="ms-ko">{currentTerm.korean}</span>
					</div>

					<div class="ms-decomp">
						{#each currentTerm.parts as mid, i (i)}
							{@const m = morphemeById[mid]}
							{@const isNewInTerm = partIsNewInTerm(mid, current.candidate)}
							{#if m}
								<span class="dpart" class:isnew={isNewInTerm}>
									<span class="dpart-form">{m.form}</span>
									<span class="dpart-mean">{m.meaningKo}</span>
								</span>
								{#if i < currentTerm.parts.length - 1}<span class="dpart-op">+</span>{/if}
							{/if}
						{/each}
					</div>
					{#if current.candidate.newRoots.length > 0}
						<div class="ms-legend"><span class="dot dot--new"></span> 새 어원 {current.candidate.newRoots.length}개</div>
					{/if}

					{#if result === 'correct'}
						<div class="ms-rewards">
							<span class="rw">+{XP_CORRECT} XP</span>
							{#if current.candidate.newRoots.length > 0}
								<span class="rw rw-brand"><Icon name="sparkles" size={12} /> 신규 친숙 +{current.candidate.newRoots.length}</span>
							{/if}
						</div>
					{/if}

					<div class="ms-acts ms-acts--one">
						<button class="pill-btn pill-btn--primary" onclick={next}>{isLast ? '결과 보기' : '다음'}</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
	<BottomNav active="campus" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.count { font-size: 13px; color: var(--mut); font-weight: 600; min-width: 40px; text-align: right; }
	.prog { height: 4px; background: var(--line); flex: none; }
	.prog span { display: block; height: 100%; background: var(--brand); transition: width 0.3s; }
	.empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--mut); }

	.picker { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: stretch; padding: 14px 20px 22px; gap: 14px; overflow-y: auto; }
	.lec-badge { align-self: center; display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; font-size: 12px; font-weight: 700; color: var(--brand-d); background: var(--brand-l); border-radius: 999px; }
	.iso-chip { align-self: center; display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; font-size: 11.5px; font-weight: 600; color: #92400e; background: #fef3c7; border-radius: 999px; line-height: 1.4; }
	.pk-mascot { display: flex; justify-content: center; padding: 6px 0 0; }
	.pk-title { font-size: 22px; font-weight: 800; text-align: center; margin: 2px 0 -4px; }
	.pk-sub { font-size: 13.5px; color: var(--ink-2); line-height: 1.55; text-align: center; }
	.pk-preview { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
	.pk-prev-row { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--ink); }
	.pk-prev-row b { margin-left: auto; color: var(--brand-d); font-size: 15px; }
	.pk-prev-row--mut { color: var(--mut); font-weight: 600; }
	.pk-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
	.pk-dot--a { background: var(--brand); }
	.pk-dot--b { background: #f59e0b; }
	.pk-dot--c { background: var(--line); }
	.pk-empty { padding: 14px; border: 1.5px dashed var(--line); border-radius: 12px; font-size: 13px; color: var(--mut); text-align: center; }

	.pk-diff { display: flex; flex-direction: column; gap: 8px; }
	.pk-diff-h { font-size: 12px; font-weight: 800; color: var(--mut); letter-spacing: 0.06em; text-transform: uppercase; padding: 0 2px; }
	.pk-diff-card {
		appearance: none; font: inherit; text-align: left; cursor: pointer;
		background: #fff; border: 1.5px solid var(--line); border-radius: 14px;
		padding: 13px 14px; display: flex; flex-direction: column; gap: 3px;
		transition: border-color 0.12s, transform 0.08s;
	}
	.pk-diff-card:active { transform: scale(0.99); }
	.pk-diff-card:hover { border-color: var(--brand); }
	.pkd-label { font-size: 15.5px; font-weight: 800; color: var(--ink); }
	.pkd-desc { font-size: 12px; color: var(--mut); line-height: 1.45; }

	.play { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 16px; gap: 16px; overflow-y: auto; }

	.prompt {
		display: flex; flex-direction: column; align-items: center; text-align: center;
		gap: 14px; padding: 22px 16px; background: var(--brand-l); border: none;
	}
	.prompt-q { font-size: 12px; font-weight: 800; color: var(--brand-d); letter-spacing: 0.06em; text-transform: uppercase; }
	.prompt-en { font-size: 24px; font-weight: 800; color: var(--ink); letter-spacing: -0.01em; }
	.prompt-en--big { font-size: 32px; }

	.prompt-parts { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; }
	.ppart {
		appearance: none; font: inherit; cursor: pointer;
		display: flex; flex-direction: column; align-items: center; gap: 2px;
		background: #fff; border: 1.5px solid var(--line); border-radius: 13px;
		padding: 9px 13px; min-width: 78px; transition: transform 0.07s;
	}
	.ppart:disabled { cursor: default; }
	.ppart:not(:disabled):active { transform: scale(0.97); }
	.ppart.isnew { background: #fff7ed; border-color: #fdba74; }
	.ppart-form { font-size: 15px; font-weight: 800; color: var(--brand-d); }
	.ppart.isnew .ppart-form { color: #c2410c; }
	.ppart-mean { font-size: 11.5px; color: var(--ink-2); font-weight: 600; }
	.ppart-mean--hidden { color: var(--mut); font-weight: 500; font-style: italic; }
	.ppart-op { font-size: 16px; color: var(--mut); font-weight: 700; padding: 0 2px; }

	.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
	.choice {
		appearance: none; font: inherit; cursor: pointer;
		background: #fff; border: 1.5px solid var(--line); border-radius: 14px;
		padding: 16px 12px; font-size: 15px; font-weight: 700; color: var(--ink);
		min-height: 56px; display: flex; align-items: center; justify-content: center; gap: 6px;
		transition: border-color 0.12s, background 0.12s, transform 0.08s;
		text-align: center; line-height: 1.3;
	}
	.choice:not(:disabled):active { transform: scale(0.98); }
	.choice:not(:disabled):hover { border-color: var(--brand); }
	.choice.selected { border-color: var(--brand); }
	.choice.correct { background: var(--brand-l); border-color: var(--brand); color: var(--brand-d); }
	.choice.wrong { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; }
	.choice:disabled { cursor: default; }

	.msheet-bg {
		position: fixed; inset: 0;
		background: rgba(20, 30, 24, 0.4);
		display: flex; align-items: flex-end; justify-content: center;
		z-index: 100; animation: fade 0.16s ease-out;
	}
	.msheet {
		width: 100%; max-width: 420px;
		background: #fff; border-radius: 22px 22px 0 0;
		padding: 22px 22px calc(22px + env(safe-area-inset-bottom, 0px));
		display: flex; flex-direction: column; align-items: center; text-align: center;
		animation: rise 0.22s cubic-bezier(0.2, 1.1, 0.4, 1);
	}
	@keyframes fade { from { opacity: 0; } }
	@keyframes rise { from { transform: translateY(40px); opacity: 0; } }

	.ms-emoji { display: flex; justify-content: center; }
	.ms-emoji.good { color: var(--brand); }
	.ms-emoji.bad { color: #ef5350; }
	.ms-title { font-size: 22px; font-weight: 800; margin-top: 4px; }

	.ms-term { margin-top: 14px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.ms-en { font-size: 19px; font-weight: 800; }
	.ms-ko { font-size: 13px; color: var(--ink-2); }

	.ms-decomp {
		margin-top: 16px; width: 100%; padding: 12px;
		background: var(--card); border-radius: var(--r-md);
		display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px;
	}
	.dpart {
		display: flex; flex-direction: column; align-items: center; gap: 2px;
		background: #fff; border: 1.5px solid var(--line); border-radius: 11px;
		padding: 7px 10px; min-width: 70px;
	}
	.dpart.isnew { background: #fff7ed; border-color: #fdba74; }
	.dpart-form { font-size: 13.5px; font-weight: 800; color: var(--brand-d); }
	.dpart.isnew .dpart-form { color: #c2410c; }
	.dpart-mean { font-size: 11.5px; color: var(--ink-2); font-weight: 600; }
	.dpart-op { font-size: 14px; color: var(--mut); font-weight: 700; }

	.ms-legend { margin-top: 8px; font-size: 11.5px; color: var(--mut); display: inline-flex; align-items: center; gap: 5px; }
	.dot { width: 8px; height: 8px; border-radius: 50%; }
	.dot--new { background: #fdba74; }

	.ms-rewards { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
	.rw { background: var(--card); border-radius: 999px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
	.rw-brand { background: var(--brand-l); color: var(--brand-d); }
	.ms-acts { margin-top: 16px; width: 100%; display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }
	.ms-acts--one { grid-template-columns: 1fr; }

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
	.r-actions { flex: none; padding-top: 16px; }
</style>
