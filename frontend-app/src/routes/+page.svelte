<script lang="ts">
	import { getDueCards, getStats, cardStates } from '$lib/stores/srs.svelte';
	import { CATEGORIES } from '$lib/data/terms';

	let stats = $derived(getStats());
	let dueCount = $derived(getDueCards().length);

	const DAILY_GOAL = 10;
	function loadDailySolved(): number {
		try {
			const raw = localStorage.getItem('mediflash_daily');
			if (!raw) return 0;
			const d = JSON.parse(raw);
			const today = new Date().toISOString().slice(0, 10);
			return d.date === today ? d.solved : 0;
		} catch { return 0; }
	}
	let dailySolved = $state(loadDailySolved());

	function progressPct(val: number, total: number) {
		return total ? Math.round((val / total) * 100) : 0;
	}
</script>

<div class="space-y-6">
	<!-- Summary cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
			<p class="text-sm text-gray-500 font-medium">전체 카드</p>
			<p class="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
		</div>
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
			<p class="text-sm text-gray-500 font-medium">복습 대기</p>
			<p class="text-3xl font-bold mt-1" style="color: #ef4444;">{dueCount}</p>
		</div>
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
			<p class="text-sm text-gray-500 font-medium">학습 완료</p>
			<p class="text-3xl font-bold mt-1" style="color: #3b82f6;">{stats.studied}</p>
		</div>
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
			<p class="text-sm text-gray-500 font-medium">마스터</p>
			<p class="text-3xl font-bold mt-1" style="color: #22c55e;">{stats.mastered}</p>
		</div>
	</div>

	<!-- Start study button -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-bold text-gray-800">오늘의 퍼즐</h2>
			<p class="text-sm text-gray-500 mt-1">
				{#if dailySolved >= DAILY_GOAL}
					<span style="color:#22c55e; font-weight:600;">오늘 목표 달성!</span> 내일 또 도전하세요.
				{:else}
					<span style="color:#1a2f70; font-weight:600;">{dailySolved}/{DAILY_GOAL}</span> 문제 완료
				{/if}
			</p>
		</div>
		<a
			href="/puzzle"
			class="px-6 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
			style="background-color: #1a2f70;"
		>
			퍼즐 시작
		</a>
	</div>

	<!-- Category progress -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<h2 class="text-lg font-bold text-gray-800 mb-4">카테고리별 진도</h2>
		<div class="space-y-4">
			{#each stats.categoryStats as [cat, data]}
				<div>
					<div class="flex justify-between items-center mb-1.5">
						<span class="text-sm font-medium text-gray-700">{CATEGORIES[cat] ?? cat}</span>
						<span class="text-xs text-gray-400">{data.studied}/{data.total}</span>
					</div>
					<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-500"
							style="width: {progressPct(data.studied, data.total)}%; background-color: #1a2f70;"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Quick tips -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<h2 class="text-lg font-bold text-gray-800 mb-3">학습 팁</h2>
		<ul class="space-y-2 text-sm text-gray-600">
			<li class="flex gap-2">
				<span style="color: #1a2f70;">•</span>
				<span>어원을 분석하면 처음 보는 의학 용어도 뜻을 추론할 수 있습니다.</span>
			</li>
			<li class="flex gap-2">
				<span style="color: #1a2f70;">•</span>
				<span>SM-2 알고리즘이 복습 주기를 자동으로 조정합니다. 매일 꾸준히 학습하세요.</span>
			</li>
			<li class="flex gap-2">
				<span style="color: #1a2f70;">•</span>
				<span>어렵게 느껴지는 카드일수록 더 자주 복습 기회가 주어집니다.</span>
			</li>
		</ul>
	</div>
</div>
