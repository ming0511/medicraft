<script lang="ts">
	// CSS 클레이 블롭 마스코트 (플레이스홀더 — 추후 3D 에셋으로 교체)
	let {
		size = 136,
		variant = 0,
		float = true
	}: { size?: number; variant?: 0 | 1 | 2 | 3; float?: boolean } = $props();

	const s = $derived(size / 136);

	// [light, mid, deep, armLight, armDeep, insetDark, dropGlow, shadow]
	const PALETTES = [
		['#a9ecc6', '#6fd6a1', '#45c389', '#9be9bd', '#4ec78c', 'rgba(20,90,50,.22)', 'rgba(40,170,110,.5)', 'rgba(40,110,80,.28)'],
		['#c3e4fb', '#84c2f1', '#4ba6e9', '#bfe0fb', '#5aa9e5', 'rgba(20,70,130,.22)', 'rgba(60,140,220,.5)', 'rgba(40,90,150,.28)'],
		['#ffdcc6', '#ffba98', '#f7926a', '#ffd6bd', '#f59c75', 'rgba(150,70,40,.22)', 'rgba(240,150,110,.5)', 'rgba(170,90,55,.28)'],
		['#e0d4f7', '#c3acef', '#a98ee6', '#ddcef7', '#b196e8', 'rgba(95,65,150,.22)', 'rgba(170,135,225,.5)', 'rgba(105,75,160,.28)']
	] as const;

	const p = $derived(PALETTES[variant]);
	const vars = $derived(
		`--m-l:${p[0]};--m-m:${p[1]};--m-d:${p[2]};--m-al:${p[3]};--m-ad:${p[4]};--m-ins:${p[5]};--m-glow:${p[6]};--m-sh:${p[7]}`
	);
</script>

<div class="mw" style="width:{Math.round(160 * s)}px; height:{Math.round(170 * s)}px;">
	<div class="layer" style="transform: scale({s}); {vars}">
		<div class="mascot" class:floating={float}>
			<span class="eye eye-l"><i></i></span>
			<span class="eye eye-r"><i></i></span>
			<span class="mouth"></span>
		</div>
		<div class="shadow" class:floating={float}></div>
	</div>
</div>

<style>
	.mw {
		position: relative;
		flex: none;
	}
	.layer {
		position: absolute;
		left: 0;
		top: 0;
		width: 160px;
		height: 170px;
		transform-origin: top left;
	}
	.mascot {
		position: absolute;
		left: 12px;
		top: 4px;
		width: 136px;
		height: 142px;
		border-radius: 48% 48% 44% 44%;
		background: radial-gradient(120% 90% at 38% 22%, var(--m-l) 0%, var(--m-m) 48%, var(--m-d) 100%);
		box-shadow:
			inset 0 -16px 26px var(--m-ins),
			inset 0 14px 20px rgba(255, 255, 255, 0.55),
			0 22px 30px -10px var(--m-glow);
	}
	.mascot.floating {
		animation: bobup 3.4s ease-in-out infinite;
	}
	.eye {
		position: absolute;
		top: 52px;
		width: 26px;
		height: 30px;
		background: #fff;
		border-radius: 50%;
		box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.eye i {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: #232b22;
	}
	.eye-l { left: 30px; }
	.eye-r { right: 30px; }
	.mouth {
		position: absolute;
		left: 50%;
		top: 92px;
		transform: translateX(-50%);
		width: 22px;
		height: 11px;
		border-radius: 0 0 22px 22px;
		background: #2c3a2c;
	}
	.shadow {
		position: absolute;
		left: 50%;
		top: 146px;
		transform: translateX(-50%);
		width: 116px;
		height: 22px;
		background: var(--m-sh);
		border-radius: 50%;
		filter: blur(7px);
	}
	.shadow.floating {
		animation: shadowpulse 3.4s ease-in-out infinite;
	}
	@keyframes bobup {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-9px); }
	}
	@keyframes shadowpulse {
		0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.85; }
		50% { transform: translateX(-50%) scale(0.86); opacity: 0.55; }
	}
</style>
