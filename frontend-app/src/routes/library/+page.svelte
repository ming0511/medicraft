<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { terms, decodingQueue, termsUsingMorpheme, type MedicalTerm, type DecodingCandidate } from '$lib/data/terms';
	import { morphemeById } from '$lib/data/morphemes';
	import { bojeongsaSystemOf, bojeongsaSystemById, BOJEONGSA_SYSTEMS, termsBySystem } from '$lib/data/bojeongsa';
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
	import { applyMorphemeRating, morphemeWeakness } from '$lib/stores/srs.svelte';
	import { loadProfile } from '$lib/stores/profile.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	// 도서관 = ②용어 추론 (디코딩, 차분한 퍼즐).
	// 영어 용어 → (난이도별 분해) → 한국어 뜻 4지선다 → 답 후 분해 공개.
	// 평가는 용어를 구성하는 *모든 어근*의 SRS에 push → 강의실 큐가 약점으로 끌어옴 (닫힌 루프).

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

	type Round = {
		candidate: DecodingCandidate;
		choices: { ko: string; correct: boolean }[]; // 4지선다
	};

	let queue = $state<Round[]>([]);
	let index = $state(0);
	let difficulty = $state<Difficulty>('normal');
	let started = $state(false);
	let ready = $state(false);
	let revealed = $state<boolean[]>([]); // 보통 난이도, 각 조각 뜻 펼침
	let selected = $state<number | null>(null);
	let result = $state<'pending' | 'correct' | 'wrong'>('pending');
	let cardShownAt = Date.now();

	// 보정사 계통 필터 (?system=) — 보정사 스파인에서 진입 시 그 계통 용어만 출제.
	let systemFilter = $state<string | null>(null);
	// 범위 피커: 그물에 용어가 있는 계통만 (빈 계통은 출제 불가).
	const scopeOptions = BOJEONGSA_SYSTEMS.filter((s) => (termsBySystem[s.id]?.length ?? 0) > 0);

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
		const params = new URL(window.location.href).searchParams;
		const sys = params.get('system');
		if (sys && bojeongsaSystemById[sys]) systemFilter = sys;
		const fromUrl = params.get('d');
		if (fromUrl === 'easy' || fromUrl === 'normal' || fromUrl === 'hard') {
			startSession(fromUrl);
		}
		ready = true;
	});

	function shuffle<T>(arr: T[]): T[] {
		return [...arr].sort(() => Math.random() - 0.5);
	}

	// 티어 내 정렬 = 구성 어근의 약점 합 ↓ → 레버리지(어근이 여는 용어 수 합) ↓.
	// 흔들리는 어근이 든 용어를 먼저 풀게 해 닫는 루프를 세게 닫고, 고레버리지 어근부터 굳힘.
	// (셔플 대신 결정적 우선순위 — 매 답마다 SRS가 갱신돼 다음 세션 순서는 자연히 달라짐.)
	function tierSortKey(c: DecodingCandidate): { weak: number; lev: number } {
		let weak = 0;
		let lev = 0;
		for (const mid of c.term.parts) {
			weak += morphemeWeakness(mid);
			lev += termsUsingMorpheme(mid).length;
		}
		return { weak, lev };
	}
	function byWeaknessThenLeverage(a: DecodingCandidate, b: DecodingCandidate): number {
		const ka = tierSortKey(a);
		const kb = tierSortKey(b);
		return kb.weak - ka.weak || kb.lev - ka.lev;
	}

	/** 같은 시스템(category) 내 다른 용어의 한국어 뜻에서 오답 3개. 부족하면 전체에서 보완. */
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

	function startSession(d: Difficulty) {
		difficulty = d;
		if (typeof localStorage !== 'undefined') localStorage.setItem(DIFFICULTY_KEY, d);

		const all = decodingQueue(progress.collectedRoots).filter(
			(c) => !systemFilter || bojeongsaSystemOf(c.term) === systemFilter
		);
		// 친숙도 티어 + 난이도 필터.
		// PRD: "친숙 어근 ⊂ 용어 우선". A 먼저, 부족하면 B, 어려움이라도 C는 안 넣음 (디코딩 부담 너무 큼).
		const aTier = all.filter((c) => c.tier === 'A').sort(byWeaknessThenLeverage);
		const bTier = all.filter((c) => c.tier === 'B').sort(byWeaknessThenLeverage);
		const cTier = all.filter((c) => c.tier === 'C');
		const pool: DecodingCandidate[] = [...aTier, ...bTier];
		// 아직 그물이 너무 얇아 A+B로도 못 채우면 C 어쩔 수 없이 일부 사용.
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

		// 닫힌 루프: 평가를 용어 구성 어근 *모두*의 SRS에 push.
		// 정답 = Good(2) — 강의실에서 본인이 "쉬웠다(3)"고 한 것보다는 보수적.
		// 오답 = Again(0) — 약점 신호.
		const rating: 0 | 2 = ok ? 2 : 0;
		for (const mid of round.candidate.term.parts) {
			if (!morphemeById[mid]) continue;
			applyMorphemeRating(mid, rating, responseMs);
		}

		if (ok) {
			correctCount += 1;
			xpGained += XP_CORRECT;
			progress = gainXP(progress, XP_CORRECT);
			// 정답 맞춘 용어의 신규 어근은 "친숙해진" 것으로 collected에 추가.
			for (const mid of round.candidate.term.parts) {
				const before = progress.collectedRoots.length;
				progress = collectRoot(progress, mid);
				if (progress.collectedRoots.length > before) {
					newRoots = [...newRoots, morphemeById[mid]?.form ?? mid];
				}
			}
		}
		progress = recordCardLearned(progress);
	}

	function next() {
		if (isLast) {
			progress = registerStudyDay(progress);
			const r = checkBadges(progress);
			progress = r.progress;
			newBadges = r.newly;
			done = true;
		} else {
			index += 1;
			setupRound();
		}
	}

	const exit = () => goto('/campus');

	// 큐 티어 미리보기 (시작 화면)
	const queuePreview = $derived.by(() => {
		const all = decodingQueue(progress.collectedRoots).filter(
			(c) => !systemFilter || bojeongsaSystemOf(c.term) === systemFilter
		);
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

	{#if ready && !started}
		<!-- 시작 화면: 큐 미리보기 + 난이도 picker -->
		<section class="picker">
			<div class="pk-mascot"><Mascot size={104} variant={charIdx} /></div>
			<h1 class="pk-title">용어 읽어내기</h1>
			<p class="pk-sub">영어 의학용어를 어원으로 *쪼개 읽어내는* 차분한 퍼즐.<br />강의실에서 익힌 어원이 그대로 무기예요.</p>

			<div class="pk-scopepick">
				<div class="pk-diff-h"><Icon name="stethoscope" size={12} /> 출제 범위 (보정사 계통)</div>
				<div class="pk-scope-row">
					<button type="button" class="pk-chip" class:active={!systemFilter} onclick={() => (systemFilter = null)}>전체</button>
					{#each scopeOptions as s (s.id)}
						<button type="button" class="pk-chip" class:active={systemFilter === s.id} onclick={() => (systemFilter = s.id)}>{s.nameKo}</button>
					{/each}
				</div>
			</div>

			<div class="pk-preview card">
				<div class="pk-prev-row"><span class="pk-dot pk-dot--a"></span>모두 친숙 <b>{queuePreview.a}</b></div>
				<div class="pk-prev-row"><span class="pk-dot pk-dot--b"></span>1조각만 신규 <b>{queuePreview.b}</b></div>
				{#if queuePreview.c > 0}
					<div class="pk-prev-row pk-prev-row--mut"><span class="pk-dot pk-dot--c"></span>2조각+ 신규 {queuePreview.c}</div>
				{/if}
			</div>

			<div class="pk-diff">
				<div class="pk-diff-h">난이도</div>
				{#each ['easy', 'normal', 'hard'] as d (d)}
					<button type="button" class="pk-diff-card" class:active={difficulty === d} onclick={() => startSession(d as Difficulty)}>
						<span class="pkd-label">{DIFFICULTY_LABEL[d as Difficulty]}</span>
						<span class="pkd-desc">{DIFFICULTY_DESC[d as Difficulty]}</span>
					</button>
				{/each}
			</div>
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
			<div class="r-actions"><button class="pill-btn pill-btn--primary" onclick={exit}>캠퍼스로</button></div>
		</section>
	{:else if current && currentTerm}
		<section class="play">
			<!-- 제시어 — 원본 용어는 항상, 분해는 쉬움·보통에서만 -->
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

			<!-- 4지선다 -->
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

		<!-- Result sheet (분해 피드백) -->
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
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.count { font-size: 13px; color: var(--mut); font-weight: 600; min-width: 40px; text-align: right; }
	.prog { height: 4px; background: var(--line); flex: none; }
	.prog span { display: block; height: 100%; background: var(--brand); transition: width 0.3s; }

	/* 시작 화면 */
	.picker { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: stretch; padding: 14px 20px 22px; gap: 14px; overflow-y: auto; }
	.pk-mascot { display: flex; justify-content: center; padding: 6px 0 0; }
	.pk-scopepick { display: flex; flex-direction: column; gap: 7px; }
	.pk-scope-row { display: flex; flex-wrap: wrap; gap: 6px; }
	.pk-chip {
		appearance: none; font: inherit; cursor: pointer;
		background: #fff; border: 1.5px solid var(--line); border-radius: 999px;
		padding: 6px 12px; font-size: 12.5px; font-weight: 700; color: var(--ink-2);
		transition: border-color 0.12s, background 0.12s, color 0.12s;
	}
	.pk-chip:active { transform: scale(0.97); }
	.pk-chip.active { background: var(--brand-l); border-color: var(--brand); color: var(--brand-d); }
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

	/* 플레이 화면 */
	.play { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 16px; gap: 16px; overflow-y: auto; }

	.prompt {
		display: flex; flex-direction: column; align-items: center; text-align: center;
		gap: 14px; padding: 22px 16px; background: var(--brand-l); border: none;
	}
	.prompt-q { font-size: 12px; font-weight: 800; color: var(--brand-d); letter-spacing: 0.06em; text-transform: uppercase; }
	.prompt-en { font-size: 24px; font-weight: 800; color: var(--ink); letter-spacing: -0.01em; }
	.prompt-en--big { font-size: 32px; }

	/* 분해 표시 (쉬움·보통) */
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

	/* 4지선다 */
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

	/* result sheet */
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

	/* 결과 페이지 */
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
