<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { terms, type MedicalTerm } from '$lib/data/terms';
	import { morphemeById } from '$lib/data/morphemes';
	import {
		loadProgress,
		gainXP,
		collectRoot,
		recordCardLearned,
		registerStudyDay,
		checkBadges,
		type Badge,
		type Progress
	} from '$lib/stores/progress.svelte';
	import { loadProfile } from '$lib/stores/profile.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { patientEmoji } from '$lib/sprites';

	const PATIENT_SYMPTOMS = 4;
	const DAMAGE = 25;
	const MAX_HP = 100;
	const XP_VICTORY = 60;
	const XP_PER_HIT = 5;

	type SymptomState = { term: MedicalTerm; choices: string[]; solved: boolean };

	let progress = $state<Progress>(loadProgress());
	let symptoms = $state<SymptomState[]>([]);
	let currentIdx = $state(0);
	let playerHP = $state(MAX_HP);
	let enemyHP = $state(MAX_HP);
	let result = $state<'fighting' | 'victory' | 'defeat'>('fighting');
	let damageFx = $state<{ amount: number; target: 'enemy' | 'player' } | null>(null);
	let xpGained = $state(0);
	let newRoots = $state<string[]>([]);
	let newBadges = $state<Badge[]>([]);
	let charIdx = $state<0 | 1 | 2 | 3>(0);

	onMount(() => {
		const p = loadProfile();
		if (p) charIdx = p.character;
		startBattle();
	});

	function startBattle() {
		const pool = [...terms].sort(() => Math.random() - 0.5);
		const selected = pool.slice(0, PATIENT_SYMPTOMS);
		symptoms = selected.map((t) => {
			const distractors = pool
				.filter((p) => p.id !== t.id)
				.slice(0, 10)
				.sort(() => Math.random() - 0.5)
				.slice(0, 3)
				.map((p) => p.term);
			const choices = [t.term, ...distractors].sort(() => Math.random() - 0.5);
			return { term: t, choices, solved: false };
		});
		currentIdx = 0;
		playerHP = MAX_HP;
		enemyHP = MAX_HP;
		result = 'fighting';
		xpGained = 0;
		newRoots = [];
		newBadges = [];
		progress = loadProgress();
	}

	const current = $derived(symptoms[currentIdx]);

	function showFx(target: 'enemy' | 'player', amount: number) {
		damageFx = { amount, target };
		setTimeout(() => (damageFx = null), 700);
	}

	function pick(choice: string) {
		if (result !== 'fighting' || !current) return;
		const correct = choice === current.term.term;
		if (correct) {
			symptoms[currentIdx].solved = true;
			enemyHP = Math.max(0, enemyHP - DAMAGE);
			showFx('enemy', DAMAGE);
			xpGained += XP_PER_HIT;
			progress = gainXP(progress, XP_PER_HIT);
			progress = recordCardLearned(progress);
			for (const mid of current.term.parts) {
				const before = progress.collectedRoots.length;
				progress = collectRoot(progress, mid);
				if (progress.collectedRoots.length > before) newRoots = [...newRoots, morphemeById[mid]?.form ?? mid];
			}
			if (enemyHP === 0 || symptoms.every((s) => s.solved)) {
				progress = gainXP(progress, XP_VICTORY);
				progress = registerStudyDay(progress);
				const r = checkBadges(progress);
				progress = r.progress;
				newBadges = r.newly;
				xpGained += XP_VICTORY;
				result = 'victory';
				return;
			}
			const nextIdx = symptoms.findIndex((s, i) => i !== currentIdx && !s.solved);
			if (nextIdx !== -1) currentIdx = nextIdx;
		} else {
			playerHP = Math.max(0, playerHP - DAMAGE);
			showFx('player', DAMAGE);
			if (playerHP === 0) result = 'defeat';
		}
	}

	const exit = () => goto('/campus');
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={exit} aria-label="후송"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">병동 · 호흡기 3F</div>
		<div class="lv">Lv.{progress.level}</div>
	</header>

	<!-- 전투 씬 (전투 중에만) -->
	{#if result === 'fighting'}
	<div class="scene">
		<div class="hpbars">
			<div class="hp">
				<div class="hp-row"><span>나</span><span>{playerHP}/{MAX_HP}</span></div>
				<div class="hp-track"><span class="hp-fill p" style="width:{playerHP}%"></span></div>
			</div>
			<div class="hp">
				<div class="hp-row"><span>질병</span><span>{enemyHP}/{MAX_HP}</span></div>
				<div class="hp-track"><span class="hp-fill e" style="width:{enemyHP}%"></span></div>
			</div>
		</div>

		<div class="fighter medic">
			<Mascot size={92} variant={charIdx} />
		</div>
		<div class="fighter foe">
			<span class="foe-em">{patientEmoji}</span>
			<span class="bed"></span>
		</div>

		{#if damageFx}
			<div class="fx" class:fx-e={damageFx.target === 'enemy'} class:fx-p={damageFx.target === 'player'}>
				-{damageFx.amount}
			</div>
		{/if}
	</div>
	{/if}

	{#if result === 'fighting' && current}
		<section class="cmd-panel">
			<!-- 차트 -->
			<div class="chart card">
				<span class="tag">차트 · 증상</span>
				<div class="chips">
					{#each symptoms as s, i (s.term.id)}
						<span class="schip" class:cur={i === currentIdx && !s.solved} class:solved={s.solved}>
							{s.term.korean}
						</span>
					{/each}
				</div>
			</div>

			<!-- 질문 -->
			<div class="question">「<b>{current.term.korean}</b>」의 의학용어는?</div>

			<!-- 4지선다 -->
			<div class="choices">
				{#each current.choices as choice (choice)}
					<button class="choice" onclick={() => pick(choice)}>{choice}</button>
				{/each}
			</div>
		</section>
	{:else if result === 'victory'}
		<section class="result">
			<div class="r-inner">
				<div class="r-mascot"><Mascot size={112} variant={charIdx} /></div>
				<h1 class="r-title"><Icon name="sparkles" size={20} /> 진료 완료!</h1>
				<p class="r-sub"><b>+{xpGained} XP</b> 획득</p>
				<div class="r-stats">
					<span class="r-stat"><Icon name="flame" size={14} /> {progress.streak}일 연속</span>
					<span class="r-stat">Lv.{progress.level}</span>
				</div>
				{#if newRoots.length}
					<div class="r-card">
						<div class="tag"><Icon name="sparkles" size={12} /> 도감 신규 어원</div>
						<div class="r-chips">{#each newRoots as r (r)}<span class="chip">{r}</span>{/each}</div>
					</div>
				{/if}
				{#if newBadges.length}
					<div class="r-card r-card--badge">
						<div class="tag"><Icon name="award" size={12} /> 뱃지 획득</div>
						<div class="r-chips">{#each newBadges as b (b.id)}<span class="r-badge"><Icon name={b.icon as IconName} size={13} /> {b.name}</span>{/each}</div>
					</div>
				{/if}
			</div>
			<div class="r-actions">
				<button class="pill-btn pill-btn--ghost" onclick={startBattle}>다음 환자</button>
				<button class="pill-btn pill-btn--primary" onclick={exit}>캠퍼스로</button>
			</div>
		</section>
	{:else}
		<section class="result">
			<div class="r-inner">
				<div class="r-mascot"><Mascot size={112} variant={charIdx} /></div>
				<h1 class="r-title"><Icon name="ambulance" size={20} /> 후송됐어요</h1>
				<p class="r-sub">잠시 회복하고 다시 도전!</p>
			</div>
			<div class="r-actions">
				<button class="pill-btn pill-btn--ghost" onclick={startBattle}>재도전</button>
				<button class="pill-btn pill-btn--primary" onclick={exit}>캠퍼스로</button>
			</div>
		</section>
	{/if}
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.lv { font-size: 13px; color: var(--mut); font-weight: 600; min-width: 40px; text-align: right; }

	/* ── 전투 씬 (배경 없음) ── */
	.scene {
		position: relative;
		flex: none;
		height: 184px;
		margin-top: 4px;
	}
	.hpbars {
		position: absolute;
		top: 4px;
		left: 16px;
		right: 16px;
		display: flex;
		gap: 8px;
		z-index: 3;
	}
	.hp { flex: 1; background: var(--card); border-radius: 11px; padding: 6px 9px; }
	.hp-row { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; color: var(--ink-2); }
	.hp-track { height: 6px; margin-top: 4px; border-radius: 999px; background: rgba(0, 0, 0, 0.08); overflow: hidden; }
	.hp-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.3s; }
	.hp-fill.p { background: var(--brand); }
	.hp-fill.e { background: #ef5350; }

	.fighter {
		position: absolute;
		bottom: 4px;
		display: flex;
		flex-direction: column;
		align-items: center;
		z-index: 2;
	}
	.medic { left: 18px; }
	.foe { right: 22px; }
	.foe-em { font-size: 50px; line-height: 1; filter: drop-shadow(0 6px 5px rgba(0, 0, 0, 0.12)); }
	.bed {
		margin-top: 4px;
		width: 60px;
		height: 7px;
		background: rgba(28, 42, 34, 0.08);
		border-radius: 50%;
		filter: blur(1.5px);
	}
	.fx {
		position: absolute;
		top: 42%;
		font-size: 22px;
		font-weight: 800;
		z-index: 4;
		animation: pop 0.7s ease-out forwards;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	.fx-e { right: 60px; color: #ef5350; }
	.fx-p { left: 50px; color: var(--ink-2); }
	@keyframes pop {
		0% { transform: translateY(8px) scale(0.6); opacity: 0; }
		25% { transform: translateY(0) scale(1.1); opacity: 1; }
		100% { transform: translateY(-22px) scale(1); opacity: 0; }
	}

	/* ── 커맨드 패널 ── */
	.cmd-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px; gap: 12px; overflow-y: auto; }
	.chart { padding: 12px 14px; }
	.chips { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
	.schip {
		font-size: 12px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 999px;
		background: var(--card);
		color: var(--ink-2);
	}
	.schip.cur { background: var(--brand); color: #fff; }
	.schip.solved { opacity: 0.45; text-decoration: line-through; }

	.question {
		text-align: center;
		font-size: 15px;
		padding: 14px;
		border-radius: var(--r-md);
		background: var(--brand-l);
		color: var(--ink);
	}
	.question b { font-weight: 800; }

	.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.choice {
		padding: 15px 8px;
		border-radius: 14px;
		border: 1.5px solid var(--line);
		background: #fff;
		font: inherit;
		font-size: 14.5px;
		font-weight: 700;
		transition: transform 0.07s, background 0.1s;
	}
	.choice:active { transform: scale(0.97); background: #f7faf8; }

	/* ── 결과 (중앙 정렬) ── */
	.result { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 0 22px 22px; overflow-y: auto; }
	.r-inner { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px 0; }
	.r-mascot { display: flex; margin-bottom: 4px; }
	.r-title { font-size: 23px; font-weight: 800; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; line-height: 1.25; }
	.r-sub { margin-top: 10px; font-size: 14px; color: var(--ink-2); }
	.r-sub b { color: var(--brand-d); }
	.r-stats { margin-top: 6px; display: flex; gap: 12px; font-size: 12.5px; color: var(--mut); font-weight: 600; }
	.r-card { margin-top: 16px; width: 100%; max-width: 340px; background: var(--card); border-radius: var(--r-md); padding: 12px 14px; text-align: left; }
	.r-card--badge { background: #fff8ec; }
	.r-chips { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
	.r-badge { font-size: 12.5px; font-weight: 700; background: #fff; border-radius: 999px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px; }
	.r-actions { flex: none; padding-top: 16px; display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }
</style>
