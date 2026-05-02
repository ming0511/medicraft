<script lang="ts">
	import { terms } from '$lib/data/terms';
	import { clearStats } from '$lib/stores/puzzle-stats.svelte';

	const DAILY_KEY = 'mediflash_daily';

	let confirmReset = $state(false);
	let resetDone    = $state(false);

	function handleReset() {
		if (confirmReset) {
			clearStats();
			try { localStorage.removeItem(DAILY_KEY); } catch {}
			confirmReset = false;
			resetDone = true;
			setTimeout(() => (resetDone = false), 3000);
		} else {
			confirmReset = true;
		}
	}
</script>

<div class="max-w-2xl space-y-5">

	<!-- About -->
	<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
		<div class="flex items-center gap-4 mb-5">
			<div class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
				style="background:linear-gradient(135deg,#007AFF,#5AC8FA);">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-6 h-6">
					<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
				</svg>
			</div>
			<div>
				<h2 class="text-xl font-bold text-gray-800">MediCraft</h2>
				<p class="text-sm text-gray-400">의생명 전공자용 어원 조합 퍼즐</p>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3 text-sm">
			<div class="bg-gray-50 rounded-xl p-3">
				<p class="text-gray-400 text-xs mb-1">수록 용어</p>
				<p class="font-bold text-gray-800 text-2xl">{terms.length}</p>
				<p class="text-gray-400 text-xs mt-0.5">개</p>
			</div>
			<div class="bg-gray-50 rounded-xl p-3">
				<p class="text-gray-400 text-xs mb-1">학습 모드</p>
				<p class="font-bold text-gray-800 text-base mt-1">조합 · 추론 · 빈칸</p>
			</div>
		</div>
	</div>

	<!-- Data storage -->
	<div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
		<h2 class="text-base font-bold text-gray-800 mb-2">데이터 저장</h2>
		<p class="text-sm text-gray-500 leading-relaxed">
			모든 게임 기록(점수, 뱃지, 어원 통계)은 브라우저의
			<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code>에만 저장됩니다.
			서버로 전송되지 않으며, 브라우저 데이터를 지우면 초기화됩니다.
		</p>
	</div>

	<!-- Reset -->
	<div class="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
		<h2 class="text-base font-bold text-red-500 mb-1">데이터 초기화</h2>
		<p class="text-sm text-gray-500 mb-4">
			게임 기록, 뱃지, 어원 통계, 연속 학습일이 모두 삭제됩니다. 되돌릴 수 없습니다.
		</p>
		{#if resetDone}
			<div class="flex items-center gap-2 text-sm font-medium py-1" style="color:#34C759;">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
				</svg>
				초기화 완료
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<button
					class="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
					style={confirmReset
						? 'background:#FF3B30;color:white;'
						: 'background:#fff1f0;color:#FF3B30;border:1px solid #ffd0ce;'}
					onclick={handleReset}
				>
					{confirmReset ? '정말 초기화' : '전체 초기화'}
				</button>
				{#if confirmReset}
					<button
						class="px-4 py-2 rounded-full text-sm font-medium text-gray-500 border border-gray-200"
						onclick={() => (confirmReset = false)}
					>
						취소
					</button>
				{/if}
			</div>
		{/if}
	</div>

</div>
