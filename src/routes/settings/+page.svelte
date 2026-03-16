<script lang="ts">
	import { resetAll, resetCard, cardStates } from '$lib/stores/srs.svelte';
	import { terms } from '$lib/data/terms';

	let confirmReset = $state(false);
	let resetDone = $state(false);

	function handleResetAll() {
		if (confirmReset) {
			resetAll();
			confirmReset = false;
			resetDone = true;
			setTimeout(() => (resetDone = false), 3000);
		} else {
			confirmReset = true;
		}
	}

	// Studied card count (reactive)
	let studiedCount = $derived(terms.filter((t) => cardStates[t.id]?.lastRated !== null).length);
</script>

<div class="max-w-2xl space-y-6">
	<!-- About -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<div class="flex items-center gap-4 mb-4">
			<div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg,#ef4444,#f97316);">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-6 h-6">
					<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
				</svg>
			</div>
			<div>
				<h2 class="text-xl font-bold text-gray-800">MediFlash</h2>
				<p class="text-sm text-gray-500">의생명 전공자용 의학 용어 플래시카드 앱</p>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-4 text-sm">
			<div class="bg-gray-50 rounded-xl p-3">
				<p class="text-gray-400 mb-1">전체 카드</p>
				<p class="font-bold text-gray-700 text-xl">{terms.length}</p>
			</div>
			<div class="bg-gray-50 rounded-xl p-3">
				<p class="text-gray-400 mb-1">학습 완료</p>
				<p class="font-bold text-gray-700 text-xl">{studiedCount}</p>
			</div>
		</div>
	</div>

	<!-- Algorithm info -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<h2 class="text-base font-bold text-gray-800 mb-4">스페이스 리피티션 알고리즘 (SM-2)</h2>
		<p class="text-sm text-gray-600 mb-4 leading-relaxed">
			Anki에서 사용하는 SM-2 알고리즘을 기반으로 복습 주기를 자동 조정합니다.
			어렵게 느끼는 카드는 더 자주, 쉬운 카드는 더 긴 간격으로 복습합니다.
		</p>
		<div class="space-y-2 text-sm">
			{#each [
				{ rating: '아주 쉬움', interval: '4일 후 복습', desc: '복습 간격이 크게 증가', color: '#3b82f6' },
				{ rating: '쉬움',     interval: '1일 후 복습', desc: '복습 간격이 유지/증가', color: '#3b82f6' },
				{ rating: '보통',     interval: '3시간 후 복습', desc: '복습 간격이 짧아짐', color: '#f59e0b' },
				{ rating: '어려움',   interval: '1시간 후 복습', desc: '카드가 초기화됨', color: '#ef4444' }
			] as r}
				<div class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
					<span class="w-20 text-xs font-semibold flex-shrink-0" style="color:{r.color};">{r.rating}</span>
					<span class="font-medium text-gray-700">{r.interval}</span>
					<span class="text-gray-400 text-xs">{r.desc}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Data storage info -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<h2 class="text-base font-bold text-gray-800 mb-2">데이터 저장</h2>
		<p class="text-sm text-gray-600 leading-relaxed">
			모든 학습 데이터는 브라우저의 <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code>에 저장됩니다.
			서버에 전송되지 않으며, 같은 브라우저에서만 유지됩니다.
		</p>
	</div>

	<!-- Danger zone -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
		<h2 class="text-base font-bold text-red-600 mb-2">데이터 초기화</h2>
		<p class="text-sm text-gray-600 mb-4">
			모든 학습 진도와 복습 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
		</p>

		{#if resetDone}
			<div class="flex items-center gap-2 text-green-600 text-sm font-medium py-2">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
				</svg>
				초기화 완료
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<button
					class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
					style={confirmReset
						? 'background-color:#ef4444;color:white;'
						: 'background-color:#fef2f2;color:#ef4444;border:1px solid #fecaca;'}
					onclick={handleResetAll}
				>
					{confirmReset ? '정말 초기화하기' : '전체 초기화'}
				</button>
				{#if confirmReset}
					<button
						class="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50"
						onclick={() => (confirmReset = false)}
					>
						취소
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
