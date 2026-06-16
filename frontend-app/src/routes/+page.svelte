<script lang="ts">
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	let signingIn = $state(false);
	let oauthError = $state<string | null>(null);

	async function signInWithGoogle() {
		if (!data.supabase) {
			oauthError = 'Supabase 환경변수가 설정되지 않았습니다 (.env.example 참고)';
			return;
		}
		signingIn = true;
		oauthError = null;
		const { error } = await data.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${page.url.origin}/auth/callback`
			}
		});
		if (error) {
			oauthError = error.message;
			signingIn = false;
		}
	}

	function continueAsGuest() {
		goto('/onboarding');
	}
</script>

<div class="page">
	<!-- ── HERO ── -->
	<div class="hero">
		<span class="cloud cl-a" aria-hidden="true"></span>
		<span class="cloud cl-b" aria-hidden="true"></span>
		<span class="spark s1" aria-hidden="true"><Icon name="plus" size={20} /></span>
		<span class="spark s2" aria-hidden="true"><Icon name="sparkle" size={16} /></span>
		<span class="spark s3" aria-hidden="true"><Icon name="plus" size={14} /></span>
		<div class="hero-mascot"><Mascot size={144} /></div>
	</div>

	<!-- ── SHEET ── -->
	<div class="sheet">
		<div class="brand">MediCraft <b>Pro</b></div>
		<h1 class="h1">어원을 조립하면<br />의학용어가 보여요</h1>
		<p class="sub">어근 몇 개만 익히면,<br />모르는 용어도 조각의 조합으로 읽혀요</p>

		<div class="demo">
			<span class="blk">cardio</span>
			<span class="op">＋</span>
			<span class="blk">megaly</span>
			<span class="op">＝</span>
			<span class="ans">심장비대</span>
		</div>

		<div class="cta">
			<button
				type="button"
				class="pill-btn pill-btn--primary"
				onclick={signInWithGoogle}
				disabled={signingIn}
			>
				<span class="gmark">G</span>
				{signingIn ? '연결 중…' : 'Google로 시작'}
			</button>
			<button type="button" class="pill-btn pill-btn--ghost" onclick={continueAsGuest}>
				게스트로 둘러보기
			</button>
			{#if oauthError}
				<p class="oauth-err">{oauthError}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* ── HERO ── */
	.hero {
		position: relative;
		flex: none;
		height: 44%;
		min-height: 250px;
		background: var(--brand-grad);
		overflow: hidden;
	}
	.cloud {
		position: absolute;
		background: radial-gradient(closest-side, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.55) 60%, transparent 80%);
		border-radius: 50%;
		filter: blur(1px);
	}
	.cl-a { width: 180px; height: 80px; top: 10%; left: -36px; }
	.cl-b { width: 130px; height: 60px; top: 26%; right: -28px; opacity: 0.85; }
	.spark {
		position: absolute;
		color: #fff;
		font-weight: 700;
		opacity: 0.9;
		text-shadow: 0 2px 6px rgba(60, 170, 100, 0.25);
		animation: floaty 4s ease-in-out infinite;
	}
	.s1 { top: 16%; left: 22%; font-size: 18px; }
	.s2 { top: 30%; right: 24%; font-size: 14px; animation-delay: 0.8s; }
	.s3 { top: 54%; left: 16%; font-size: 13px; animation-delay: 1.6s; }
	.hero-mascot {
		position: absolute;
		left: 50%;
		bottom: 8px;
		transform: translateX(-50%);
	}
	@keyframes floaty {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}

	/* ── SHEET ── */
	.sheet {
		position: relative;
		flex: 1;
		min-height: 0;
		margin-top: -22px;
		background: #fff;
		border-radius: var(--r-lg) var(--r-lg) 0 0;
		box-shadow: 0 -10px 30px rgba(30, 50, 90, 0.08);
		padding: 22px 22px 18px;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}
	.brand {
		font-size: 13px;
		color: var(--mut);
	}
	.brand b {
		color: var(--brand);
		font-weight: 700;
	}
	.h1 {
		margin-top: 6px;
		font-size: 25px;
		font-weight: 800;
		line-height: 1.34;
	}
	.sub {
		margin-top: 10px;
		font-size: 14px;
		line-height: 1.55;
		color: var(--mut);
	}
	.demo {
		margin-top: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 7px;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		padding: 14px 12px;
		font-size: 14px;
	}
	.blk {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 5px 10px;
		font-weight: 600;
		box-shadow: 0 1px 2px rgba(20, 40, 80, 0.05);
	}
	.op { color: var(--mut); font-weight: 700; }
	.ans { font-weight: 800; color: var(--brand-d); }

	.cta {
		margin-top: auto;
		padding-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.oauth-err {
		margin-top: 4px;
		font-size: 12px;
		color: #ef5350;
		text-align: center;
	}
	.pill-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.gmark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		color: var(--brand);
		font-weight: 800;
		font-size: 14px;
	}
</style>
