<script lang="ts">
	import { getDueCards, getCardsByCategory, applyRating, getNextInterval, intervalLabel, cardStates } from '$lib/stores/srs.svelte';
	import { terms, CATEGORIES, type MedicalTerm } from '$lib/data/terms';
	import type { Rating } from '$lib/stores/srs.svelte';

	// ── Mode ──────────────────────────────────────────────────────────────
	type StudyMode = 'flashcard' | 'word2mean' | 'mean2word';

	const STUDY_MODES: { key: StudyMode; emoji: string; label: string; desc: string }[] = [
		{ key: 'flashcard', emoji: '📖', label: '플래시카드', desc: '카드를 뒤집어 확인' },
		{ key: 'word2mean', emoji: '🔤', label: '단어 → 뜻',  desc: '영어 용어 보고 뜻 맞추기' },
		{ key: 'mean2word', emoji: '🇰🇷', label: '뜻 → 단어',  desc: '한글 뜻 보고 용어 맞추기' },
	];

	let mode = $state<StudyMode>('flashcard');

	// ── Flashcard State ──────────────────────────────────────────────────
	let selectedCategory = $state<string | null>(null);
	let fcMode = $state<'due' | 'all'>('due');
	let flipped = $state(false);
	let currentIndex = $state(0);
	let sessionDone = $state(false);

	let deck = $derived.by(() => {
		void cardStates;
		const base = fcMode === 'due' ? getDueCards() : getCardsByCategory(selectedCategory);
		return selectedCategory && fcMode === 'due'
			? base.filter((t) => t.category === selectedCategory)
			: base;
	});

	let currentCard = $derived<MedicalTerm | null>(deck[currentIndex] ?? null);
	let progress = $derived(Math.min(currentIndex, deck.length));

	function rate(rating: Rating) {
		if (!currentCard) return;
		applyRating(currentCard.id, rating);
		flipped = false;
		if (currentIndex + 1 >= deck.length) {
			sessionDone = true;
		} else {
			currentIndex++;
		}
	}

	function fcRestart() {
		currentIndex = 0;
		flipped = false;
		sessionDone = false;
	}

	function nextPreview() {
		if (!currentCard) return [0, 0, 0, 0];
		const state = cardStates[currentCard.id] ?? { id: currentCard.id, interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: Date.now(), lastRated: null };
		return ([0, 1, 2, 3] as Rating[]).map((r) => getNextInterval(state, r));
	}

	let previews = $derived(nextPreview());

	// ── Quiz State ───────────────────────────────────────────────────────
	const MAX_HEARTS = 3;
	const GOAL = 10;

	let qPhase = $state<'home' | 'playing' | 'result'>('home');
	let hearts = $state(MAX_HEARTS);
	let qCorrect = $state(0);
	let qCombo = $state(0);
	let qScore = $state(0);
	let qCount = $state(0);
	let usedIds = $state<Set<string>>(new Set());
	let wrongQueue = $state<MedicalTerm[]>([]);

	let qTerm = $state<MedicalTerm | null>(null);
	let qChoices = $state<string[]>([]);
	let qPicked = $state<string | null>(null);
	let qSubmitted = $state(false);
	let qWasCorrect = $state(false);

	function startQuiz() {
		hearts = MAX_HEARTS; qCorrect = 0; qCombo = 0; qScore = 0; qCount = 0;
		usedIds = new Set(); wrongQueue = [];
		qPhase = 'playing'; nextQuiz();
	}

	function nextQuiz() {
		qSubmitted = false; qWasCorrect = false; qPicked = null;

		let t: MedicalTerm;
		if (wrongQueue.length > 0 && qCount > 0 && qCount % 3 === 0) {
			t = wrongQueue.shift()!;
		} else {
			const cands = terms.filter(x => !usedIds.has(x.id));
			const src = cands.length > 0 ? cands : terms;
			t = src[Math.floor(Math.random() * src.length)];
			usedIds = new Set([...usedIds, t.id]);
			if (usedIds.size > Math.floor(terms.length * 0.7)) usedIds = new Set();
		}

		qTerm = t;

		if (mode === 'word2mean') {
			const ans = t.korean;
			const others = [...new Set(terms.filter(x => x.id !== t.id).map(x => x.korean))]
				.sort(() => Math.random() - 0.5).slice(0, 3);
			qChoices = [...others, ans].sort(() => Math.random() - 0.5);
		} else {
			const ans = t.term;
			const others = [...new Set(terms.filter(x => x.id !== t.id).map(x => x.term))]
				.sort(() => Math.random() - 0.5).slice(0, 3);
			qChoices = [...others, ans].sort(() => Math.random() - 0.5);
		}
	}

	function getAnswer(): string {
		return mode === 'word2mean' ? qTerm!.korean : qTerm!.term;
	}

	function submitQuiz() {
		if (!qPicked || !qTerm) return;
		qSubmitted = true;
		const ok = qPicked === getAnswer();
		qWasCorrect = ok;
		qCount++;
		if (ok) { qCombo++; qScore += 10 + (qCombo - 1) * 2; qCorrect++; }
		else    { qCombo = 0; hearts--; wrongQueue = [...wrongQueue, qTerm]; }
	}

	function advanceQuiz() {
		if (hearts <= 0 || qCorrect >= GOAL) {
			qPhase = 'result';
		} else { nextQuiz(); }
	}

	function pct(a: number, b: number) { return b ? Math.round(a / b * 100) : 0; }
</script>

<style>
	@keyframes pop  { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
	.anim-pop  { animation: pop  .2s ease forwards; }

	.card {
		background: white;
		border-radius: 16px;
		border: 1px solid #D2D2D7;
		box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
	}
	.card-flat {
		background: #F5F5F7;
		border-radius: 12px;
		border: 1px solid #D2D2D7;
	}
	.btn {
		display: inline-flex; align-items: center; justify-content: center;
		padding: 9px 20px;
		border-radius: 980px;
		font-size: 14px;
		font-weight: 500;
		transition: all .15s;
		cursor: pointer;
		letter-spacing: -0.01em;
	}
	.btn-primary {
		background: #007AFF;
		color: white;
		box-shadow: 0 1px 4px rgba(0,122,255,.35);
	}
	.btn-primary:hover   { background: #0071eb; }
	.btn-primary:disabled{ opacity: .35; cursor: not-allowed; }
	.btn-default {
		background: white;
		color: #1D1D1F;
		border: 1px solid #D2D2D7;
		box-shadow: 0 1px 2px rgba(0,0,0,.06);
	}
	.btn-default:hover { background: #F5F5F7; }
	.tag {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 3px 10px;
		border-radius: 99px;
		font-size: 12px;
		font-weight: 500;
	}
</style>

<!-- ═══════════════════════════════ MODE TABS ═══════════════════════════════ -->
<h1 class="text-2xl font-bold mb-1" style="color:#1D1D1F; letter-spacing:-0.02em;">기본 학습</h1>
<p class="text-sm mb-6" style="color:#6E6E73;">의학 용어를 다양한 방법으로 학습하세요.</p>

<div class="flex gap-2 mb-6 overflow-x-auto">
	{#each STUDY_MODES as m}
		<button
			class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
			style={mode === m.key
				? 'background:#007AFF;color:white;box-shadow:0 1px 4px rgba(0,122,255,.35);'
				: 'background:white;color:#1D1D1F;border:1px solid #D2D2D7;'}
			onclick={() => { mode = m.key; qPhase = 'home'; }}
		>
			<span>{m.emoji}</span>
			{m.label}
		</button>
	{/each}
</div>

<!-- ═══════════════════════════════ FLASHCARD MODE ══════════════════════════ -->
{#if mode === 'flashcard'}

	<!-- Category / Mode filters -->
	<div class="flex flex-wrap gap-2 mb-5">
		<button
			class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
			style={fcMode === 'due' ? 'background:#007AFF;color:white;' : 'background:#F5F5F7;color:#6E6E73;border:1px solid #D2D2D7;'}
			onclick={() => { fcMode = 'due'; currentIndex = 0; flipped = false; sessionDone = false; }}
		>
			복습 대기 ({getDueCards().length})
		</button>
		<button
			class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
			style={fcMode === 'all' ? 'background:#007AFF;color:white;' : 'background:#F5F5F7;color:#6E6E73;border:1px solid #D2D2D7;'}
			onclick={() => { fcMode = 'all'; currentIndex = 0; flipped = false; sessionDone = false; }}
		>
			전체 학습
		</button>

		<div class="w-px mx-1" style="background:#D2D2D7;"></div>

		<select
			class="px-3 py-1.5 rounded-lg text-sm font-medium bg-white focus:outline-none"
			style="border:1px solid #D2D2D7;color:#6E6E73;"
			bind:value={selectedCategory}
			onchange={() => { currentIndex = 0; flipped = false; sessionDone = false; }}
		>
			<option value={null}>전체 카테고리</option>
			{#each Object.entries(CATEGORIES) as [key, label]}
				<option value={key}>{label}</option>
			{/each}
		</select>
	</div>

	{#if deck.length === 0}
		<div class="card p-12 text-center">
			<div class="text-5xl mb-4">🎉</div>
			<h2 class="text-xl font-bold mb-2" style="color:#1D1D1F;">모두 완료!</h2>
			<p class="text-sm mb-6" style="color:#6E6E73;">복습할 카드가 없습니다. 나중에 다시 확인하세요.</p>
			<button class="btn btn-primary"
				onclick={() => { fcMode = 'all'; currentIndex = 0; sessionDone = false; }}>
				전체 카드 학습하기
			</button>
		</div>
	{:else if sessionDone}
		<div class="card p-12 text-center">
			<div class="text-5xl mb-4">✅</div>
			<h2 class="text-xl font-bold mb-2" style="color:#1D1D1F;">세션 완료!</h2>
			<p class="text-sm mb-6" style="color:#6E6E73;">{deck.length}개 카드를 모두 학습했습니다.</p>
			<div class="flex gap-3 justify-center">
				<button class="btn btn-default" onclick={fcRestart}>다시 학습</button>
				<a href="/" class="btn btn-primary">홈으로</a>
			</div>
		</div>
	{:else if currentCard}
		<!-- Progress bar -->
		<div class="flex items-center gap-3 mb-4">
			<div class="flex-1 h-2 rounded-full overflow-hidden" style="background:#D2D2D7;">
				<div class="h-full rounded-full transition-all duration-300"
					style="width: {(progress / deck.length) * 100}%; background: #007AFF;"></div>
			</div>
			<span class="text-xs font-medium" style="color:#6E6E73;">{progress}/{deck.length}</span>
		</div>

		<!-- Flashcard -->
		<div class="card overflow-hidden mb-4">
			<!-- Etymology header -->
			<div class="px-8 pt-7 pb-4 text-center" style="border-bottom:1px solid #F5F5F7;">
				<div class="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-semibold mb-1">
					{#each currentCard.etymology as part, i}
						<span style="color:#007AFF;">{part.part} ({part.meaning})</span>
						{#if i < currentCard.etymology.length - 1}
							<span style="color:#D2D2D7;">|</span>
						{/if}
					{/each}
				</div>
				<div class="flex flex-wrap justify-center gap-x-3 text-xs" style="color:#8E8E93;">
					{#each currentCard.etymology as part, i}
						<span>{part.origin}</span>
						{#if i < currentCard.etymology.length - 1}<span>|</span>{/if}
					{/each}
				</div>
			</div>

			<!-- Term -->
			<div class="px-8 py-6 text-center">
				<div class="flex items-center justify-center gap-2 mb-1">
					<h2 class="text-3xl font-bold" style="color:#1D1D1F;">{currentCard.term}</h2>
					<button
						class="p-1.5 rounded-full transition-colors"
						style="color:#8E8E93;"
						onclick={() => {
							if ('speechSynthesis' in window) {
								const u = new SpeechSynthesisUtterance(currentCard!.term);
								u.lang = 'en-US';
								speechSynthesis.speak(u);
							}
						}}
						aria-label="발음 듣기"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-5 h-5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
						</svg>
					</button>
				</div>
				<p class="text-xl font-medium" style="color:#6E6E73;">{currentCard.korean}</p>
			</div>

			<!-- Definition (shown after flip) -->
			{#if flipped}
				<div class="px-8 pb-7 space-y-4 pt-5" style="border-top:1px solid #E5E5EA;">
					<div class="text-center space-y-2">
						<p class="leading-relaxed" style="color:#1D1D1F;">{currentCard.definition}</p>
						<p class="text-sm leading-relaxed" style="color:#6E6E73;">({currentCard.definitionKo})</p>
					</div>
					<div class="card-flat p-4 text-sm" style="color:#6E6E73;">
						<p class="font-semibold mb-2" style="color:#1D1D1F;">어원 분석</p>
						<ul class="space-y-1">
							{#each currentCard.etymology as part}
								<li>
									<span class="font-medium" style="color:#007AFF;">{part.part}</span>
									<span style="color:#8E8E93;"> ({part.origin})</span>
									<span> — {part.meaningKo}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{:else}
				<div class="px-8 pb-8 text-center">
					<button
						class="mt-2 px-6 py-2.5 rounded-xl border-2 border-dashed text-sm transition-colors"
						style="border-color:#D2D2D7;color:#8E8E93;"
						onclick={() => (flipped = true)}
					>
						클릭하여 정의 확인
					</button>
				</div>
			{/if}
		</div>

		<!-- Rating buttons -->
		{#if flipped}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				{#each [
					{ rating: 3 as Rating, label: '아주 쉬움', color: '#007AFF', border: '#007AFF' },
					{ rating: 2 as Rating, label: '쉬움',     color: '#007AFF', border: '#007AFF' },
					{ rating: 1 as Rating, label: '보통',     color: '#FF9500', border: '#FF9500' },
					{ rating: 0 as Rating, label: '어려움',   color: '#FF3B30', border: '#FF3B30' }
				] as btn}
					<button
						class="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-opacity hover:opacity-80"
						style="color:{btn.color};border-color:{btn.border};"
						onclick={() => rate(btn.rating)}
					>
						{btn.label}
						<span class="text-xs font-normal opacity-70">
							복습 주기 {intervalLabel(previews[btn.rating])}
						</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

<!-- ═══════════════════════════════ QUIZ MODE ═══════════════════════════════ -->
{:else}

	{#if qPhase === 'home'}
		<div class="card p-6 mb-6">
			<p class="text-lg font-semibold mb-1" style="color:#1D1D1F;">
				{mode === 'word2mean' ? '🔤 단어 → 뜻' : '🇰🇷 뜻 → 단어'}
			</p>
			<p class="text-sm mb-4" style="color:#6E6E73;">
				{mode === 'word2mean'
					? '영어 의학 용어를 보고 한글 뜻을 4지선다로 맞추세요.'
					: '한글 뜻을 보고 영어 의학 용어를 4지선다로 맞추세요.'}
			</p>
			<div class="space-y-2 mb-5">
				{#each [
					{ icon: '❤️', text: `하트 ${MAX_HEARTS}개로 시작합니다.` },
					{ icon: '✅', text: `${GOAL}문제를 맞추면 클리어!` },
					{ icon: '🔄', text: '틀린 문제는 3문제 후 다시 출제됩니다.' },
					{ icon: '🔥', text: '연속 정답 시 콤보 보너스!' },
				] as rule}
					<div class="flex items-start gap-3 text-sm" style="color:#1D1D1F;">
						<span class="text-base mt-px flex-shrink-0">{rule.icon}</span>
						<span>{rule.text}</span>
					</div>
				{/each}
			</div>
			<button class="btn btn-primary w-full py-2.5" onclick={startQuiz}>시작하기</button>
		</div>

	{:else if qPhase === 'playing' && qTerm}

		<!-- HUD -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex gap-0.5">
				{#each Array(MAX_HEARTS) as _, i}
					<span class="text-lg">{i < hearts ? '❤️' : '💔'}</span>
				{/each}
			</div>
			<div class="flex items-center gap-3">
				{#if qCombo >= 2}
					<span class="tag anim-pop" style="background:#fff3cd;color:#92400e;">🔥 {qCombo}콤보</span>
				{/if}
				<span class="text-sm font-medium" style="color:#6E6E73;">{qScore}pt</span>
			</div>
		</div>

		<!-- Progress -->
		<div class="flex items-center gap-2 mb-5">
			<div class="flex-1 flex gap-0.5">
				{#each Array(GOAL) as _, i}
					<div class="flex-1 h-2 rounded-full transition-all"
						style="background:{i < qCorrect ? '#007AFF' : '#D2D2D7'};"></div>
				{/each}
			</div>
			<span class="text-xs" style="color:#6E6E73;">{qCorrect}/{GOAL}</span>
		</div>

		<!-- Question card -->
		<div class="card p-6 mb-4 text-center">
			{#if mode === 'word2mean'}
				<p class="text-xs font-medium mb-2" style="color:#6E6E73;">이 용어의 뜻은?</p>
				<p class="text-2xl font-bold mb-1" style="color:#1D1D1F;">{qTerm.term}</p>
				<p class="text-sm" style="color:#8E8E93;">{qTerm.definition}</p>
			{:else}
				<p class="text-xs font-medium mb-2" style="color:#6E6E73;">이 뜻에 해당하는 용어는?</p>
				<p class="text-2xl font-bold mb-1" style="color:#1D1D1F;">{qTerm.korean}</p>
				<p class="text-sm" style="color:#8E8E93;">{qTerm.definitionKo}</p>
			{/if}
		</div>

		<!-- Choices -->
		<div class="grid grid-cols-2 gap-2 mb-4">
			{#each qChoices as c}
				{@const isAns = c === getAnswer()}
				<button
					class="py-3 px-4 rounded-xl border text-sm text-left transition-all"
					style={qSubmitted
						? isAns
							? 'border-color:#3d9970;background:#f0faf4;color:#2d7054;font-weight:600;'
							: qPicked === c
							? 'border-color:#e03e3e;background:#fff0f0;color:#c0392b;'
							: 'border-color:#D2D2D7;color:#8E8E93;background:#F5F5F7;'
						: qPicked === c
						? 'border-color:#007AFF;background:#007AFF10;color:#007AFF;font-weight:500;'
						: 'border-color:#D2D2D7;color:#1D1D1F;background:white;'}
					disabled={qSubmitted}
					onclick={() => (qPicked = c)}
				>{c}{#if qSubmitted && isAns} ✓{/if}</button>
			{/each}
		</div>

		<!-- Submit / Result -->
		{#if !qSubmitted}
			<button class="btn btn-primary w-full" disabled={!qPicked} onclick={submitQuiz}>확인</button>
		{:else}
			<div class="card p-3 flex items-center gap-3 mt-2 anim-pop"
				style={qWasCorrect ? 'border-color:#3d9970;background:#f6fdf9;' : 'border-color:#e03e3e;background:#fff6f6;'}>
				<div class="flex-1 text-sm">
					{#if qWasCorrect}
						<p class="font-medium" style="color:#2d7054;">
							정답 +{10+(qCombo-1)*2}pt{#if qCombo>=2} — 🔥{qCombo}콤보{/if}
						</p>
					{:else}
						<p class="font-medium" style="color:#c0392b;">오답</p>
						<p class="text-xs mt-0.5" style="color:#6E6E73;">정답: {getAnswer()}</p>
					{/if}
				</div>
				<button class="btn btn-primary text-sm shrink-0" onclick={advanceQuiz}>
					{hearts <= 0 || qCorrect >= GOAL ? '결과 보기 →' : '다음 →'}
				</button>
			</div>
		{/if}

	{:else if qPhase === 'result'}
		{@const cleared = qCorrect >= GOAL}

		<h2 class="text-2xl font-bold mb-1" style="color:#1D1D1F;">{cleared ? '클리어! 🎉' : '게임 오버'}</h2>
		<p class="text-sm mb-8" style="color:#6E6E73;">
			{cleared ? `${GOAL}개 모두 정답!` : '하트를 모두 잃었습니다. 다시 도전해보세요.'}
		</p>

		<div class="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
			{#each [
				{ label: '정답', value: `${qCorrect}개` },
				{ label: '점수', value: `${qScore}pt` },
				{ label: '정답률', value: `${pct(qCorrect, qCount)}%` },
			] as stat}
				<div class="card-flat p-2 sm:p-3 text-center">
					<p class="text-base sm:text-lg font-semibold mb-0.5" style="color:#1D1D1F;">{stat.value}</p>
					<p class="text-xs" style="color:#6E6E73;">{stat.label}</p>
				</div>
			{/each}
		</div>

		{#if cleared && hearts === MAX_HEARTS}
			<div class="card p-3 mb-6 text-center" style="border-color:#e9c46a;background:#fffbeb;">
				<p class="text-sm font-medium" style="color:#92400e;">✨ 퍼펙트 클리어!</p>
			</div>
		{/if}

		<div class="flex gap-2">
			<button class="btn btn-default flex-1" onclick={() => { qPhase = 'home'; }}>← 돌아가기</button>
			<button class="btn btn-primary flex-1" onclick={startQuiz}>다시 하기</button>
		</div>
	{/if}
{/if}
