<script lang="ts">
	import './layout.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data, children } = $props();

	onMount(() => {
		if (!data.supabase) return;
		const { data: sub } = data.supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});
</script>

<div class="flex justify-center h-[100dvh] overflow-hidden">
	<div class="relative w-full max-w-[420px] h-[100dvh] bg-white flex flex-col overflow-hidden">
		{@render children()}
	</div>
</div>
