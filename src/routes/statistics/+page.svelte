<script lang="ts">
	import { getStats, cardStates } from '$lib/stores/srs.svelte';
	import { terms, CATEGORIES } from '$lib/data/terms';

	let stats = $derived(getStats());

	function pct(val: number, total: number) {
		return total ? Math.round((val / total) * 100) : 0;
	}

	// Interval distribution
	let intervalBuckets = $derived.by(() => {
		void cardStates;
		const buckets = { new: 0, learning: 0, review: 0, mastered: 0 };
		for (const t of terms) {
			const s = cardStates[t.id];
			if (!s || s.lastRated === null) buckets.new++;
			else if (s.interval < 1) buckets.learning++;
			else if (s.interval < 7) buckets.review++;
			else buckets.mastered++;
		}
		return buckets;
	});
</script>

<div class="space-y-6">
	<!-- Top stats row -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		{#each [
			{ label: '전체 카드', value: stats.total, color: '#64748b' },
			{ label: '학습 완료', value: stats.studied, color: '#3b82f6' },
			{ label: '마스터 (7일+)', value: stats.mastered, color: '#22c55e' },
			{ label: '복습 대기', value: stats.due, color: '#ef4444' }
		] as s}
			<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
				<p class="text-sm text-gray-500 font-medium mb-1">{s.label}</p>
				<p class="text-3xl font-bold" style="color:{s.color};">{s.value}</p>
			</div>
		{/each}
	</div>

	<!-- Card status distribution -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<h2 class="text-lg font-bold text-gray-800 mb-5">카드 상태 분포</h2>
		<div class="space-y-4">
			{#each [
				{ label: '새 카드',    value: intervalBuckets.new,      color: '#94a3b8', desc: '아직 학습 안 함' },
				{ label: '학습 중',   value: intervalBuckets.learning,  color: '#f59e0b', desc: '1일 미만' },
				{ label: '복습',      value: intervalBuckets.review,    color: '#3b82f6', desc: '1~7일' },
				{ label: '마스터',    value: intervalBuckets.mastered,  color: '#22c55e', desc: '7일 이상' }
			] as b}
				<div>
					<div class="flex justify-between items-center mb-1.5">
						<div class="flex items-center gap-2">
							<span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color:{b.color};"></span>
							<span class="text-sm font-medium text-gray-700">{b.label}</span>
							<span class="text-xs text-gray-400">({b.desc})</span>
						</div>
						<span class="text-sm font-semibold text-gray-600">{b.value}</span>
					</div>
					<div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-500"
							style="width:{pct(b.value, stats.total)}%; background-color:{b.color};"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Category breakdown -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<h2 class="text-lg font-bold text-gray-800 mb-5">카테고리별 학습 현황</h2>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-100">
						<th class="text-left text-gray-500 font-medium pb-3">카테고리</th>
						<th class="text-center text-gray-500 font-medium pb-3">전체</th>
						<th class="text-center text-gray-500 font-medium pb-3">학습</th>
						<th class="text-left text-gray-500 font-medium pb-3 pl-4">진도</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-50">
					{#each stats.categoryStats as [cat, data]}
						<tr>
							<td class="py-3 font-medium text-gray-700">{CATEGORIES[cat] ?? cat}</td>
							<td class="py-3 text-center text-gray-500">{data.total}</td>
							<td class="py-3 text-center text-gray-500">{data.studied}</td>
							<td class="py-3 pl-4">
								<div class="flex items-center gap-2">
									<div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
										<div
											class="h-full rounded-full"
											style="width:{pct(data.studied, data.total)}%; background-color:#1a2f70;"
										></div>
									</div>
									<span class="text-xs text-gray-400 w-8 text-right">{pct(data.studied, data.total)}%</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Overall progress ring (CSS only) -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-8">
		<div class="relative w-28 h-28 flex-shrink-0">
			<svg class="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
				<circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" stroke-width="12" />
				<circle
					cx="50" cy="50" r="40"
					fill="none"
					stroke="#1a2f70"
					stroke-width="12"
					stroke-linecap="round"
					stroke-dasharray="251.2"
					stroke-dashoffset="{251.2 * (1 - pct(stats.studied, stats.total) / 100)}"
				/>
			</svg>
			<div class="absolute inset-0 flex flex-col items-center justify-center">
				<span class="text-2xl font-bold text-gray-800">{pct(stats.studied, stats.total)}%</span>
				<span class="text-xs text-gray-400">완료</span>
			</div>
		</div>
		<div class="space-y-1">
			<h2 class="text-lg font-bold text-gray-800">전체 학습 진도</h2>
			<p class="text-gray-500 text-sm">{stats.studied}개 학습 완료 / {stats.total}개 전체</p>
			<p class="text-gray-500 text-sm">{stats.mastered}개 마스터 달성</p>
		</div>
	</div>
</div>
