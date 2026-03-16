<script lang="ts">
	import { getDueCards, getCardsByCategory, applyRating, getNextInterval, intervalLabel, cardStates } from '$lib/stores/srs.svelte';
	import { terms, CATEGORIES, type MedicalTerm } from '$lib/data/terms';
	import type { Rating } from '$lib/stores/srs.svelte';

	// ── State ─────────────────────────────────────────────────────────────────
	let selectedCategory = $state<string | null>(null);
	let studyMode = $state<'due' | 'all'>('due');
	let flipped = $state(false);
	let currentIndex = $state(0);
	let sessionDone = $state(false);

	// ── Deck computation ──────────────────────────────────────────────────────
	let deck = $derived.by(() => {
		// Access cardStates to make this reactive
		void cardStates;
		const base = studyMode === 'due' ? getDueCards() : getCardsByCategory(selectedCategory);
		return selectedCategory && studyMode === 'due'
			? base.filter((t) => t.category === selectedCategory)
			: base;
	});

	let currentCard = $derived<MedicalTerm | null>(deck[currentIndex] ?? null);
	let progress = $derived(Math.min(currentIndex, deck.length));

	// ── Actions ───────────────────────────────────────────────────────────────
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

	function restart() {
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
</script>

<!-- Category / Mode filters -->
<div class="flex flex-wrap gap-2 mb-5">
	<button
		class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
		class:text-white={studyMode === 'due'}
		style={studyMode === 'due' ? 'background-color:#1a2f70;color:white;' : 'background-color:#f1f5f9;color:#475569;'}
		onclick={() => { studyMode = 'due'; currentIndex = 0; flipped = false; sessionDone = false; }}
	>
		복습 대기 ({getDueCards().length})
	</button>
	<button
		class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
		style={studyMode === 'all' ? 'background-color:#1a2f70;color:white;' : 'background-color:#f1f5f9;color:#475569;'}
		onclick={() => { studyMode = 'all'; currentIndex = 0; flipped = false; sessionDone = false; }}
	>
		전체 학습
	</button>

	<div class="w-px bg-gray-200 mx-1"></div>

	<select
		class="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 focus:outline-none"
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
	<!-- Empty state -->
	<div class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
		<div class="text-5xl mb-4">🎉</div>
		<h2 class="text-xl font-bold text-gray-800 mb-2">모두 완료!</h2>
		<p class="text-gray-500 mb-6">복습할 카드가 없습니다. 나중에 다시 확인하세요.</p>
		<button
			class="px-6 py-3 rounded-xl text-white font-semibold text-sm"
			style="background-color:#1a2f70;"
			onclick={() => { studyMode = 'all'; currentIndex = 0; sessionDone = false; }}
		>
			전체 카드 학습하기
		</button>
	</div>
{:else if sessionDone}
	<!-- Session complete -->
	<div class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
		<div class="text-5xl mb-4">✅</div>
		<h2 class="text-xl font-bold text-gray-800 mb-2">세션 완료!</h2>
		<p class="text-gray-500 mb-6">{deck.length}개 카드를 모두 학습했습니다.</p>
		<div class="flex gap-3 justify-center">
			<button
				class="px-6 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
				onclick={restart}
			>
				다시 학습
			</button>
			<a
				href="/"
				class="px-6 py-3 rounded-xl text-white font-semibold text-sm"
				style="background-color:#1a2f70;"
			>
				대시보드로
			</a>
		</div>
	</div>
{:else if currentCard}
	<!-- Progress bar -->
	<div class="flex items-center gap-3 mb-4">
		<div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
			<div
				class="h-full rounded-full transition-all duration-300"
				style="width: {(progress / deck.length) * 100}%; background-color: #1a2f70;"
			></div>
		</div>
		<span class="text-sm text-gray-500 font-medium flex-shrink-0">{progress}/{deck.length} cards</span>
	</div>

	<!-- Flashcard -->
	<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
		<!-- Etymology header -->
		<div class="px-8 pt-7 pb-4 text-center border-b border-gray-50">
			<div class="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-semibold mb-1">
				{#each currentCard.etymology as part, i}
					<span style="color: #3b6fd4;">{part.part} ({part.meaning})</span>
					{#if i < currentCard.etymology.length - 1}
						<span class="text-gray-300">|</span>
					{/if}
				{/each}
			</div>
			<div class="flex flex-wrap justify-center gap-x-3 text-xs text-gray-400">
				{#each currentCard.etymology as part, i}
					<span>{part.origin}</span>
					{#if i < currentCard.etymology.length - 1}
						<span>|</span>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Term -->
		<div class="px-8 py-6 text-center">
			<div class="flex items-center justify-center gap-2 mb-1">
				<h2 class="text-3xl font-bold text-gray-900">{currentCard.term}</h2>
				<button
					class="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
					onclick={() => {
						if ('speechSynthesis' in window) {
							const u = new SpeechSynthesisUtterance(currentCard!.term);
							u.lang = 'en-US';
							speechSynthesis.speak(u);
						}
					}}
					aria-label="Pronounce"
				>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-5 h-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
					</svg>
				</button>
			</div>
			<p class="text-xl text-gray-500 font-medium">{currentCard.korean}</p>
		</div>

		<!-- Definition (shown after flip) -->
		{#if flipped}
			<div class="px-8 pb-7 space-y-4 border-t border-gray-100 pt-5">
				<div class="text-center space-y-2">
					<p class="text-gray-700 leading-relaxed">{currentCard.definition}</p>
					<p class="text-gray-500 text-sm leading-relaxed">({currentCard.definitionKo})</p>
				</div>

				<!-- Etymology breakdown -->
				<div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
					<p class="font-semibold text-gray-700 mb-2">
						어원 분석 (Etymology): 라틴/그리스어 어원을 구조적으로 분석
					</p>
					<ul class="space-y-1">
						{#each currentCard.etymology as part}
							<li>
								<span class="font-medium" style="color: #3b6fd4;">{part.part}</span>
								<span class="text-gray-400"> ({part.origin})</span>
								<span> - {part.meaningKo}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{:else}
			<!-- Flip prompt -->
			<div class="px-8 pb-8 text-center">
				<button
					class="mt-2 px-6 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm hover:border-blue-300 hover:text-blue-500 transition-colors"
					onclick={() => (flipped = true)}
				>
					클릭하여 정의 확인
				</button>
			</div>
		{/if}
	</div>

	<!-- Rating buttons (only shown after flip) -->
	{#if flipped}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			{#each [
				{ rating: 3 as Rating, label: '아주 쉬움', color: '#3b82f6', border: '#3b82f6' },
				{ rating: 2 as Rating, label: '쉬움',     color: '#3b82f6', border: '#3b82f6' },
				{ rating: 1 as Rating, label: '보통',     color: '#f59e0b', border: '#f59e0b' },
				{ rating: 0 as Rating, label: '어려움',   color: '#ef4444', border: '#ef4444' }
			] as btn}
				<button
					class="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-opacity hover:opacity-80"
					style="color: {btn.color}; border-color: {btn.border};"
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
