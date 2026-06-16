<script lang="ts">
	import './layout.css';
	import { invalidate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount, untrack } from 'svelte';
	import { loadProfile, saveProfile, type Profile } from '$lib/stores/profile.svelte';
	import {
		setSyncContext,
		clearSyncContext,
		hydrateFromServer,
		scheduleSync,
		pushNow
	} from '$lib/stores/sync';
	let { data, children } = $props();

	// ── 크로스기기 복원 ──
	// 컴포넌트 <script> 본문은 자식 onMount 보다 먼저 실행되므로, 페이지(예: campus)가
	// localStorage 를 읽기 전에 서버 데이터로 복원해 둔다. (init 1회용 — untrack)
	untrack(() => {
		if (!browser || !data.user) return;
		// 프로필: 로컬에 없고 서버에 있으면 복원 (다른 기기/캐시 삭제 후 재로그인)
		if (!loadProfile() && data.serverProfile?.nickname?.trim()) {
			saveProfile({
				nickname: data.serverProfile.nickname,
				school: data.serverProfile.school ?? '',
				character: (data.serverProfile.character ?? 0) as Profile['character']
			});
		}
		// 학습 상태: 서버가 더 최신이면 적용
		hydrateFromServer(data.serverState ?? null, data.serverStateUpdatedAt ?? null);
	});

	onMount(() => {
		const supabase = untrack(() => data.supabase);
		const user = untrack(() => data.user);
		const sessionExp0 = untrack(() => data.session?.expires_at);
		if (!supabase) return;

		// 로그인 컨텍스트 등록 → 이후 저장이 서버로 push 됨. 첫 로그인 로컬 데이터도 한 번 올림.
		if (user) {
			setSyncContext(supabase, user.id);
			scheduleSync();
		}

		// 앱을 떠나거나 백그라운드로 갈 때 디바운스 대기분을 즉시 flush
		const flush = () => void pushNow();
		const onVis = () => {
			if (document.visibilityState === 'hidden') flush();
		};
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('pagehide', flush);

		const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
			if (event === 'SIGNED_OUT') {
				clearSyncContext();
			} else if (newSession?.user) {
				setSyncContext(supabase, newSession.user.id);
			}
			if (newSession?.expires_at !== sessionExp0) {
				invalidate('supabase:auth');
			}
		});

		return () => {
			sub.subscription.unsubscribe();
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('pagehide', flush);
		};
	});
</script>

<div class="flex justify-center h-[100dvh] overflow-hidden">
	<div class="relative w-full max-w-[420px] h-[100dvh] bg-white flex flex-col overflow-hidden">
		{@render children()}
	</div>
</div>
