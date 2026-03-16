<script lang="ts">
	import { terms, CATEGORIES } from '$lib/data/terms';

	let search = $state('');
	let selectedCategory = $state<string | null>(null);

	let filtered = $derived(
		terms.filter((t) => {
			const q = search.toLowerCase();
			const matchSearch =
				!q ||
				t.term.toLowerCase().includes(q) ||
				t.korean.includes(q) ||
				t.etymology.some(
					(e) =>
						e.part.toLowerCase().includes(q) ||
						e.meaning.toLowerCase().includes(q) ||
						e.meaningKo.includes(q) ||
						e.origin.toLowerCase().includes(q)
				);
			const matchCat = !selectedCategory || t.category === selectedCategory;
			return matchSearch && matchCat;
		})
	);

	// Collect all unique etymology roots across all terms
	let allRoots = $derived(
		[...new Map(
			terms.flatMap((t) => t.etymology).map((e) => [e.part, e])
		).values()].sort((a, b) => a.part.localeCompare(b.part))
	);
</script>

<!-- Search & filter bar -->
<div class="flex flex-col sm:flex-row gap-3 mb-6">
	<div class="relative flex-1">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
			<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
		</svg>
		<input
			type="text"
			placeholder="용어, 어원, 한국어 검색..."
			bind:value={search}
			class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-white"
			style="focus:ring-color: #1a2f70;"
		/>
	</div>
	<select
		class="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-600 focus:outline-none"
		bind:value={selectedCategory}
	>
		<option value={null}>전체 카테고리</option>
		{#each Object.entries(CATEGORIES) as [key, label]}
			<option value={key}>{label}</option>
		{/each}
	</select>
</div>

<div class="grid lg:grid-cols-3 gap-6">
	<!-- Term cards -->
	<div class="lg:col-span-2 space-y-3">
		<p class="text-sm text-gray-500 font-medium">{filtered.length}개 용어</p>
		{#each filtered as term}
			<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
				<div class="flex items-start justify-between gap-4 mb-3">
					<div>
						<h3 class="text-lg font-bold text-gray-900">{term.term}</h3>
						<span class="text-base text-gray-500 font-medium">{term.korean}</span>
					</div>
					<span class="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0" style="background-color:#eef2ff;color:#4338ca;">
						{CATEGORIES[term.category] ?? term.category}
					</span>
				</div>

				<!-- Etymology parts -->
				<div class="flex flex-wrap gap-2 mb-3">
					{#each term.etymology as part}
						<span class="px-2.5 py-1 rounded-lg text-xs font-semibold" style="background-color:#eff6ff;color:#3b6fd4;">
							{part.part}
							<span class="font-normal text-gray-400 ml-1">{part.origin}</span>
							= {part.meaningKo}
						</span>
					{/each}
				</div>

				<p class="text-sm text-gray-600 leading-relaxed">{term.definition}</p>
				<p class="text-xs text-gray-400 mt-1 leading-relaxed">{term.definitionKo}</p>
			</div>
		{/each}

		{#if filtered.length === 0}
			<div class="text-center py-12 text-gray-400">
				<p class="text-lg">검색 결과가 없습니다.</p>
			</div>
		{/if}
	</div>

	<!-- Root index (desktop) -->
	<div class="hidden lg:block">
		<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-4">
			<h2 class="text-sm font-bold text-gray-700 mb-3">어원 색인</h2>
			<div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
				{#each allRoots as root}
					<div class="text-xs">
						<span class="font-semibold" style="color:#3b6fd4;">{root.part}</span>
						<span class="text-gray-400 ml-1">({root.origin})</span>
						<span class="text-gray-600 ml-1">= {root.meaningKo}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
