<script lang="ts">
	import './layout.css';
	let { children } = $props();
</script>

<div class="flex justify-center min-h-[100dvh]">
	<div class="w-full max-w-[420px] min-h-[100dvh] bg-white flex flex-col">
		{@render children()}
	</div>
</div>
