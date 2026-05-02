<div class="flex flex-col flex-1">
	<!-- Top bar -->
	<header class="flex items-center px-3 py-2 border-b-2 border-black text-[11px]">
		<div class="font-bold tracking-wide">▣ MediCraft Pro</div>
	</header>

	<!-- Hero: ASCII side-view scene -->
	<div class="hero relative border-b-2 border-black overflow-hidden" style="height: 220px;">
		<!-- Loop label (top-left tag) -->
		<div class="absolute top-1.5 left-1.5 text-[9px] tracking-widest text-white px-1.5 py-0.5" style="background:#111;">
			SIDE-VIEW LOOP
		</div>

		<!-- Ground -->
		<div class="absolute left-0 right-0" style="bottom: 24px; border-top: 1.5px dashed #555;"></div>

		<!-- School (left) -->
		<pre class="absolute left-3 text-[11px] leading-[1.15] m-0" style="bottom: 28px;">┌──────┐
│ ▢ ▢▢ │
│ ▢ ▢▢ │
│ ▢ ▢▢ │
└──┬┬──┘</pre>
		<div class="absolute text-[9px] text-neutral-600" style="bottom: 9px; left: 22px;">학교</div>

		<!-- Hospital (right) -->
		<pre class="absolute right-3 text-[11px] leading-[1.15] m-0" style="bottom: 28px;">┌──────┐
│  ✚   │
│ ✚✚✚  │
│  ✚   │
└──┬┬──┘</pre>
		<div class="absolute text-[9px] text-neutral-600" style="bottom: 9px; right: 22px;">병원</div>

		<!-- Character (animated walk) -->
		<pre class="character absolute text-[11px] leading-[1.15] m-0" style="bottom: 28px;">  o
 /|\
 / \</pre>

		<!-- Caption (under ground) -->
		<div class="absolute bottom-1 left-0 right-0 text-center text-[9px] tracking-widest text-neutral-500 uppercase">
			school ────► hospital
		</div>
	</div>

	<!-- Copy + CTA -->
	<section class="flex-1 flex flex-col px-5 py-6">
		<h1 class="text-xl font-bold leading-snug">
			의학용어,<br />외우지 말고 조립하세요.
		</h1>

		<p class="mt-4 text-sm text-neutral-700 flex items-center flex-wrap gap-1.5">
			<span class="inline-block px-1.5 py-0.5 text-xs" style="border:1.5px solid #111;">cardio</span>
			<span class="text-neutral-500">+</span>
			<span class="inline-block px-1.5 py-0.5 text-xs" style="border:1.5px solid #111;">megaly</span>
			<span class="text-neutral-500">=</span>
			<span>심장비대</span>
		</p>

		<div class="mt-auto pt-8 space-y-2.5">
			<a
				href="/onboarding"
				class="cta cta-fill block py-3 text-center text-sm font-semibold"
			>
				▶ Google로 시작
			</a>
			<a
				href="/onboarding"
				class="cta cta-outline block py-3 text-center text-sm font-semibold"
			>
				Guest로 시작
			</a>
		</div>
	</section>
</div>

<style>
	.character {
		animation: walk 6s linear infinite;
	}
	@keyframes walk {
		0%   { left: 24%; opacity: 1; }
		78%  { left: 70%; opacity: 1; }
		83%  { left: 70%; opacity: 0; }
		84%  { left: 24%; opacity: 0; }
		100% { left: 24%; opacity: 1; }
	}

	.cta {
		border: 1.5px solid #111;
		box-shadow: 3px 3px 0 #111;
		transition: transform 0.08s, box-shadow 0.08s;
	}
	.cta:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 #111;
	}
	.cta-fill {
		background: #111;
		color: #fff;
	}
	.cta-outline {
		background: #fff;
		color: #111;
	}
</style>
