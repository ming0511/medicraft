<script lang="ts">
	import { getWeakRoots, getBadges, getAllRootStats, getDayStreak, BADGE_THRESHOLD } from '$lib/stores/puzzle-stats.svelte';

	const DAILY_KEY = 'mediflash_daily';

	function loadDaily() {
		try {
			const r = localStorage.getItem(DAILY_KEY);
			if (!r) return null;
			const d = JSON.parse(r);
			const today = new Date().toISOString().slice(0, 10);
			return d.date === today ? d : null;
		} catch { return null; }
	}

	let daily     = $state(loadDaily());
	let weakRoots = $derived(getWeakRoots(6));
	let badges    = $derived(getBadges());
	let allRoots  = $derived(getAllRootStats());
	let streak    = $derived(getDayStreak());

	// 전체 누적 통계 (어원 시도 기반)
	let totalAttempts = $derived(allRoots.reduce((s, r) => s + r.attempts, 0));
	let totalCorrect  = $derived(allRoots.reduce((s, r) => s + r.correct, 0));

	function pct(a: number, b: number) {
		return b ? Math.round(a / b * 100) : 0;
	}
</script>

<div class="space-y-5">

	<!-- 오늘 기록 + 스트릭 -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		{#each [
			{ label: '오늘 게임',   value: daily?.games        ?? 0,  unit: '회',  color: '#007AFF' },
			{ label: '오늘 정답',   value: daily?.totalCorrect ?? 0,  unit: '개',  color: '#34C759' },
			{ label: '최고 점수',   value: daily?.bestScore    ?? 0,  unit: 'pt', color: '#FF9500' },
			{ label: '연속 학습',   value: streak,                    unit: '일',  color: '#FF3B30' },
		] as s}
			<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
				<p class="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
				<p class="text-3xl font-bold leading-tight" style="color:{s.color};">{s.value}</p>
				<p class="text-xs text-gray-400 mt-0.5">{s.unit}</p>
			</div>
		{/each}
	</div>

	<!-- 누적 어원 도전 -->
	{#if totalAttempts > 0}
	<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
		<h2 class="text-base font-bold text-gray-800 mb-4">누적 도전 현황</h2>
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<p class="text-2xl font-bold" style="color:#007AFF;">{totalAttempts}</p>
				<p class="text-xs text-gray-400 mt-0.5">총 시도</p>
			</div>
			<div>
				<p class="text-2xl font-bold" style="color:#34C759;">{totalCorrect}</p>
				<p class="text-xs text-gray-400 mt-0.5">총 정답</p>
			</div>
			<div>
				<p class="text-2xl font-bold" style="color:#FF9500;">{pct(totalCorrect, totalAttempts)}%</p>
				<p class="text-xs text-gray-400 mt-0.5">정답률</p>
			</div>
		</div>
		<!-- 정답률 바 -->
		<div class="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
			<div class="h-full rounded-full transition-all duration-500"
				style="width:{pct(totalCorrect, totalAttempts)}%; background:linear-gradient(90deg,#007AFF,#34C759);">
			</div>
		</div>
	</div>
	{/if}

	<!-- 뱃지 -->
	<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
		<div class="flex items-baseline justify-between mb-1">
			<h2 class="text-base font-bold text-gray-800">어원 마스터 뱃지</h2>
			{#if badges.length > 0}
				<span class="text-xs font-semibold" style="color:#007AFF;">{badges.length}개 획득</span>
			{/if}
		</div>
		<p class="text-xs text-gray-400 mb-4">같은 어원을 {BADGE_THRESHOLD}번 연속 정답하면 획득</p>
		{#if badges.length === 0}
			<p class="text-gray-400 text-sm text-center py-6">아직 획득한 뱃지가 없습니다.<br/>퍼즐을 풀어 어원을 마스터하세요!</p>
		{:else}
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
				{#each badges as badge}
					<div class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-yellow-200 bg-yellow-50">
						<span class="text-xl flex-shrink-0">🏅</span>
						<div class="min-w-0">
							<p class="font-bold text-sm truncate" style="color:#007AFF;">{badge.root}</p>
							<p class="text-xs text-gray-500 truncate">{badge.meaningKo}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- 약한 어원 -->
	{#if allRoots.length > 0}
	<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
		<h2 class="text-base font-bold text-gray-800 mb-1">약한 어원</h2>
		<p class="text-xs text-gray-400 mb-4">2회 이상 시도 중 정답률이 낮은 어원</p>
		{#if weakRoots.length === 0}
			<p class="text-gray-400 text-sm text-center py-4">데이터가 아직 부족합니다. 더 풀어보세요!</p>
		{:else}
			<div class="space-y-3">
				{#each weakRoots as r}
					{@const acc = pct(r.correct, r.attempts)}
					{@const color = acc < 40 ? '#FF3B30' : acc < 70 ? '#FF9500' : '#34C759'}
					<div>
						<div class="flex justify-between items-center mb-1.5">
							<div class="flex items-center gap-2">
								<span class="font-semibold text-sm" style="color:#007AFF;">{r.root}</span>
								<span class="text-xs text-gray-400">{r.attempts}회 시도</span>
							</div>
							<span class="text-sm font-bold" style="color:{color};">{acc}%</span>
						</div>
						<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
							<div class="h-full rounded-full transition-all duration-500"
								style="width:{acc}%; background-color:{color};">
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	{/if}

	<!-- 많이 도전한 어원 TOP -->
	{#if allRoots.length > 0}
	<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
		<h2 class="text-base font-bold text-gray-800 mb-4">어원별 도전 기록</h2>
		<div class="space-y-2.5">
			{#each allRoots.slice(0, 8) as r}
				{@const acc = pct(r.correct, r.attempts)}
				{@const color = acc < 40 ? '#FF3B30' : acc < 70 ? '#FF9500' : '#34C759'}
				<div class="flex items-center gap-3">
					<span class="text-sm font-semibold w-24 flex-shrink-0" style="color:#007AFF;">{r.root}</span>
					<div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
						<div class="h-full rounded-full" style="width:{acc}%; background-color:{color};"></div>
					</div>
					<span class="text-xs text-gray-400 w-14 text-right flex-shrink-0">{r.correct}/{r.attempts} ({acc}%)</span>
				</div>
			{/each}
		</div>
	</div>
	{/if}

</div>
