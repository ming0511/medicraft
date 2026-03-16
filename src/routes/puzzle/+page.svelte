<script lang="ts">
	import { terms, type MedicalTerm, type EtymologyPart } from '$lib/data/terms';
	import { recordAttempt, getBadges, markDailyGoalAchieved, BADGE_THRESHOLD } from '$lib/stores/puzzle-stats.svelte';

	type Mode       = 'normal' | 'reverse' | 'fill';
	type ModeOption = Mode | 'random';
	type Phase      = 'home' | 'playing' | 'result';
	type SlotState  = 'empty' | 'filled' | 'correct' | 'wrong';

	interface Block { id: string; part: string; meaning: string; meaningKo: string; origin: string; color: string; }

	const MAX_HEARTS = 3;
	const GOAL       = 10;
	const DAILY_KEY  = 'mediflash_daily';

	const COLORS = ['#2383e2','#9065b0','#d9730d','#0f7b6c','#c14b8a','#448361'];

	const MODE_OPTIONS: { key: ModeOption; emoji: string; label: string; desc: string }[] = [
		{ key: 'normal',  emoji: '🧩', label: '조합',      desc: '블록을 순서대로 배치하세요' },
		{ key: 'reverse', emoji: '🔍', label: '추론',      desc: '어원의 뜻을 고르세요' },
		{ key: 'fill',    emoji: '✏️', label: '빈칸 채우기', desc: '어원 파트를 맞추세요' },
		{ key: 'random',  emoji: '🎲', label: '랜덤',      desc: '모든 유형이 랜덤으로 출제' },
	];
	const MODES: Mode[] = ['normal', 'reverse', 'fill'];
	const MODE_LABEL: Record<Mode, { emoji: string; label: string }> = {
		normal:  { emoji: '🧩', label: '조합' },
		reverse: { emoji: '🔍', label: '추론' },
		fill:    { emoji: '✏️', label: '빈칸 채우기' },
	};

	function loadJson<T>(key: string, fb: T): T {
		try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
	}
	function saveJson(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

	interface Daily { date: string; games: number; bestScore: number; totalCorrect: number; }
	function today() { return new Date().toISOString().slice(0, 10); }
	function loadDaily(): Daily {
		const d = loadJson<Daily>(DAILY_KEY, { date: today(), games: 0, bestScore: 0, totalCorrect: 0 });
		if (d.date !== today()) return { date: today(), games: 0, bestScore: 0, totalCorrect: 0 };
		return {
			date: d.date,
			games:        Number(d.games)        || 0,
			bestScore:    Number(d.bestScore)    || 0,
			totalCorrect: Number(d.totalCorrect) || 0,
		};
	}

	let daily   = $state<Daily>(loadDaily());
	let phase   = $state<Phase>('home');
	let selMode = $state<ModeOption>('normal');

	let hearts     = $state(MAX_HEARTS);
	let correct    = $state(0);
	let combo      = $state(0);
	let score      = $state(0);
	let qCount     = $state(0);
	let newBadge   = $state<string | null>(null);
	let usedIds    = $state<Set<string>>(new Set());
	let wrongQueue = $state<MedicalTerm[]>([]);

	let term       = $state<MedicalTerm | null>(null);
	let qMode      = $state<Mode>('normal');
	let submitted  = $state(false);
	let wasCorrect = $state(false);

	let slots      = $state<(Block | null)[]>([]);
	let pool       = $state<Block[]>([]);
	let slotStates = $state<SlotState[]>([]);
	let selBlock   = $state<Block | null>(null);
	let dragBlock  = $state<Block | null>(null);
	let dragFrom   = $state<{ src: 'pool'|'slot'; idx: number } | null>(null);

	let hiddenIdx = $state(0);
	let choices   = $state<string[]>([]);
	let picked    = $state<string | null>(null);

	function col(i: number) { return COLORS[i % COLORS.length]; }
	function pct(a: number, b: number) { return b ? Math.round(a / b * 100) : 0; }

	function mkBlock(e: EtymologyPart, i: number): Block {
		return { id: `${e.part}-${Math.random().toString(36).slice(2)}`, part: e.part, meaning: e.meaning, meaningKo: e.meaningKo, origin: e.origin, color: col(i) };
	}

	function pickMode(): Mode {
		return selMode === 'random' ? MODES[Math.floor(Math.random() * 3)] : selMode;
	}

	function startGame() {
		hearts = MAX_HEARTS; correct = 0; combo = 0; score = 0; qCount = 0;
		newBadge = null; usedIds = new Set(); wrongQueue = [];
		phase = 'playing'; nextQ();
	}

	function nextQ() {
		submitted = false; wasCorrect = false; picked = null;
		selBlock = null; dragBlock = null; dragFrom = null; newBadge = null;

		let t: MedicalTerm;
		if (wrongQueue.length > 0 && qCount > 0 && qCount % 3 === 0) {
			t = wrongQueue.shift()!;
		} else {
			const base  = terms.filter(x => x.etymology.length >= 2);
			const cands = base.filter(x => !usedIds.has(x.id));
			const src   = cands.length > 0 ? cands : base;
			t = src[Math.floor(Math.random() * src.length)];
			usedIds = new Set([...usedIds, t.id]);
			if (usedIds.size > Math.floor(base.length * 0.7)) usedIds = new Set();
		}

		term  = t;
		qMode = pickMode();

		if (qMode === 'normal') {
			const cb = t.etymology.map((e, i) => mkBlock(e, i));
			const dc = terms.filter(x => x.id !== t.id).flatMap(x => x.etymology)
				.sort(() => Math.random() - 0.5).slice(0, 4).map((e, i) => mkBlock(e, cb.length + i));
			slots = new Array(t.etymology.length).fill(null);
			slotStates = new Array(t.etymology.length).fill('empty');
			pool = [...cb, ...dc].sort(() => Math.random() - 0.5);
		} else {
			hiddenIdx = Math.floor(Math.random() * t.etymology.length);
			const ans = qMode === 'reverse' ? t.etymology[hiddenIdx].meaningKo : t.etymology[hiddenIdx].part;
			const src = qMode === 'reverse'
				? terms.flatMap(x => x.etymology.map(e => e.meaningKo))
				: terms.filter(x => x.id !== t.id).flatMap(x => x.etymology.map(e => e.part));
			const oth = [...new Set(src.filter(v => v !== ans))].sort(() => Math.random() - 0.5).slice(0, 3);
			choices = [...oth, ans].sort(() => Math.random() - 0.5);
			slots = []; pool = []; slotStates = [];
		}
	}

	function submitNormal() {
		if (!term || slots.some(s => s === null)) return;
		submitted = true;
		const ans = term.etymology.map(e => e.part);
		let ok = true;
		for (let i = 0; i < slots.length; i++) {
			slotStates[i] = slots[i]?.part === ans[i] ? 'correct' : (ok = false, 'wrong');
		}
		finish(ok);
	}

	function submitChoice(ok: boolean) { submitted = true; finish(ok); }

	function finish(ok: boolean) {
		wasCorrect = ok; qCount++;
		if (ok) { combo++; score += 10 + (combo - 1) * 2; correct++; }
		else    { combo = 0; hearts--; wrongQueue = [...wrongQueue, term!]; }

		const prev = getBadges().length;
		recordAttempt(term!.id, term!.etymology.map(e => ({ part: e.part, origin: e.origin, meaning: e.meaning, meaningKo: e.meaningKo })), ok);
		if (getBadges().length > prev) newBadge = getBadges().at(-1)!.root;
	}

	function advance() {
		if (hearts <= 0 || correct >= GOAL) {
			if (correct >= GOAL) markDailyGoalAchieved();
			daily = { date: today(), games: (daily.games || 0) + 1, bestScore: Math.max(daily.bestScore || 0, score), totalCorrect: (daily.totalCorrect || 0) + correct };
			saveJson(DAILY_KEY, daily);
			phase = 'result';
		} else { nextQ(); }
	}

	function clickPool(b: Block) { if (submitted) return; selBlock = selBlock?.id === b.id ? null : b; }
	function clickSlot(i: number) {
		if (submitted) return;
		if (slots[i]) { pool = [...pool, slots[i]!]; slots[i] = null; slotStates[i] = 'empty'; return; }
		if (selBlock) { pool = pool.filter(b => b.id !== selBlock!.id); slots[i] = selBlock; slotStates[i] = 'filled'; selBlock = null; }
	}
	function dsp(e: DragEvent, b: Block) { dragBlock = b; dragFrom = { src: 'pool', idx: -1 }; e.dataTransfer!.effectAllowed = 'move'; }
	function dss(e: DragEvent, i: number) { if (!slots[i]) return; dragBlock = slots[i]; dragFrom = { src: 'slot', idx: i }; e.dataTransfer!.effectAllowed = 'move'; }
	function dos(e: DragEvent) { e.preventDefault(); }
	function drs(e: DragEvent, i: number) {
		e.preventDefault(); if (!dragBlock || submitted) return;
		if (dragFrom?.src === 'pool') pool = pool.filter(b => b.id !== dragBlock!.id);
		else if (dragFrom?.src === 'slot') {
			const f = dragFrom.idx;
			if (slots[i]) { slots[f] = slots[i]; slotStates[f] = 'filled'; } else { slots[f] = null; slotStates[f] = 'empty'; }
		}
		if (slots[i] && dragFrom?.src !== 'slot') pool = [...pool, slots[i]!];
		slots[i] = dragBlock; slotStates[i] = 'filled'; dragBlock = null; dragFrom = null;
	}
	function dop(e: DragEvent) { e.preventDefault(); }
	function drp(e: DragEvent) {
		e.preventDefault(); if (!dragBlock || submitted || dragFrom?.src !== 'slot') return;
		const i = dragFrom.idx; slots[i] = null; slotStates[i] = 'empty';
		if (!pool.find(b => b.id === dragBlock!.id)) pool = [...pool, dragBlock!];
		dragBlock = null; dragFrom = null;
	}
	function allFilled() { return slots.length > 0 && slots.every(s => s !== null); }
</script>

<style>
	@keyframes pop  { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
	@keyframes shake{ 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
	.anim-pop  { animation: pop  .2s ease forwards; }
	.anim-shake{ animation: shake .25s ease; }

	.card {
		background: white;
		border-radius: 16px;
		border: 1px solid #D2D2D7;
		box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
	}
	.card-flat {
		background: #F5F5F7;
		border-radius: 12px;
		border: 1px solid #D2D2D7;
	}
	.btn {
		display: inline-flex; align-items: center; justify-content: center;
		padding: 9px 20px;
		border-radius: 980px;
		font-size: 14px;
		font-weight: 500;
		transition: all .15s;
		cursor: pointer;
		letter-spacing: -0.01em;
	}
	.btn-primary {
		background: #007AFF;
		color: white;
		box-shadow: 0 1px 4px rgba(0,122,255,.35);
	}
	.btn-primary:hover   { background: #0071eb; }
	.btn-primary:disabled{ opacity: .35; cursor: not-allowed; }
	.btn-default {
		background: white;
		color: #1D1D1F;
		border: 1px solid #D2D2D7;
		box-shadow: 0 1px 2px rgba(0,0,0,.06);
	}
	.btn-default:hover { background: #F5F5F7; }
	.tag {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 3px 10px;
		border-radius: 99px;
		font-size: 12px;
		font-weight: 500;
	}
</style>

<!-- ═══════════════════════════════ HOME ══════════════════════════════════ -->
{#if phase === 'home'}

	<h1 class="text-2xl font-bold mb-1" style="color:#1D1D1F; letter-spacing:-0.02em;">어원 퍼즐</h1>
	<p class="text-sm mb-8" style="color:#6E6E73;">의학 용어를 어원 조각으로 분해해 학습하세요.</p>

	<!-- Mode select -->
	<p class="text-xs font-semibold uppercase tracking-wide mb-2" style="color:var(--muted);">유형 선택</p>
	<div class="grid grid-cols-2 gap-3 mb-6">
		{#each MODE_OPTIONS as opt}
			<button
				class="card p-4 text-left transition-all"
				style={selMode === opt.key
					? 'border-color:#007AFF;box-shadow:0 0 0 3px rgba(0,122,255,.12),0 2px 8px rgba(0,0,0,.06);'
					: ''}
				onclick={() => (selMode = opt.key)}
			>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xl">{opt.emoji}</span>
					{#if selMode === opt.key}
						<span class="w-2 h-2 rounded-full" style="background:#007AFF;"></span>
					{/if}
				</div>
				<p class="font-semibold text-sm mb-0.5" style="color:#1D1D1F;">{opt.label}</p>
				<p class="text-xs" style="color:#6E6E73;">{opt.desc}</p>
			</button>
		{/each}
	</div>

	<button class="btn btn-primary w-full py-2.5 mb-8" onclick={startGame}>
		시작하기
	</button>

	<!-- Divider -->
	<hr style="border-color:var(--border); margin-bottom:24px;">

	<!-- Rules -->
	<p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color:var(--muted);">게임 방법</p>
	<div class="space-y-2 mb-6">
		{#each [
			{ icon: '❤️', text: `하트 ${MAX_HEARTS}개로 시작합니다. 틀리면 1개씩 감소합니다.` },
			{ icon: '✅', text: `정답 ${GOAL}개를 달성하면 클리어입니다.` },
			{ icon: '🔄', text: '틀린 문제는 3문제 후 다시 출제됩니다.' },
			{ icon: '🔥', text: '연속 정답 시 콤보 점수 보너스가 붙습니다.' },
		] as rule}
			<div class="flex items-start gap-3 text-sm" style="color:var(--text);">
				<span class="text-base mt-px flex-shrink-0">{rule.icon}</span>
				<span>{rule.text}</span>
			</div>
		{/each}
	</div>

	<!-- Today's record -->
	{#if daily.games > 0}
		<hr style="border-color:var(--border); margin-bottom:24px;">
		<p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color:var(--muted);">오늘의 기록</p>
		<div class="grid grid-cols-3 gap-2 sm:gap-3">
			{#each [
				{ label: '게임', value: daily.games },
				{ label: '총 정답', value: daily.totalCorrect },
				{ label: '최고 점수', value: daily.bestScore },
			] as stat}
				<div class="card-flat p-2 sm:p-3 text-center">
					<p class="text-lg sm:text-xl font-semibold" style="color:var(--text);">{stat.value}</p>
					<p class="text-xs mt-0.5" style="color:var(--muted);">{stat.label}</p>
				</div>
			{/each}
		</div>
	{/if}

<!-- ═══════════════════════════════ PLAYING ═══════════════════════════════ -->
{:else if phase === 'playing'}

	<!-- HUD -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex gap-0.5">
			{#each Array(MAX_HEARTS) as _, i}
				<span class="text-lg">{i < hearts ? '❤️' : '💔'}</span>
			{/each}
		</div>
		<div class="flex items-center gap-3">
			{#if combo >= 2}
				<span class="tag anim-pop" style="background:#fff3cd;color:#92400e;">🔥 {combo}콤보</span>
			{/if}
			<span class="text-sm font-medium" style="color:var(--muted);">{score}pt</span>
		</div>
	</div>

	<!-- Progress bar -->
	<div class="flex items-center gap-2 mb-5">
		<div class="flex-1 flex gap-0.5">
			{#each Array(GOAL) as _, i}
				<div class="flex-1 h-2 rounded-full transition-all"
					style="background:{i < correct ? '#007AFF' : '#D2D2D7'};">
				</div>
			{/each}
		</div>
		<span class="text-xs" style="color:var(--muted);">{correct}/{GOAL}</span>
	</div>

	<!-- Mode tag + review indicator -->
	<div class="flex items-center gap-2 mb-4">
		<span class="tag" style="background:var(--surface);color:var(--text);border:1px solid var(--border);">
			{MODE_LABEL[qMode].emoji} {MODE_LABEL[qMode].label}
		</span>
		{#if wrongQueue.length > 0 && term && wrongQueue.some(t => t.id === term?.id)}
			<span class="tag" style="background:#fef3c7;color:#92400e;">🔄 복습</span>
		{/if}
	</div>

	<!-- Badge -->
	{#if newBadge}
		<div class="card p-3 mb-4 flex items-center gap-3 anim-pop"
			style="border-color:#e9c46a;background:#fffbeb;">
			<span class="text-xl">🏅</span>
			<div>
				<p class="text-sm font-medium" style="color:var(--text);">뱃지 획득!</p>
				<p class="text-xs" style="color:var(--muted);">
					<span style="color:var(--accent);">{newBadge}</span> — {BADGE_THRESHOLD}회 정답
				</p>
			</div>
		</div>
	{/if}

	{#if term}
		<!-- Question card -->
		<div class="card-flat p-4 mb-4">
			{#if qMode === 'normal'}
				<p class="text-xs font-medium mb-1.5" style="color:var(--muted);">정의</p>
				<p class="text-sm leading-relaxed" style="color:var(--text);">{term.definition}</p>
				<p class="text-xs mt-1" style="color:var(--muted);">{term.definitionKo}</p>
			{:else}
				<p class="text-xs font-medium mb-1.5" style="color:var(--muted);">용어</p>
				<p class="text-xl font-semibold" style="color:var(--text);">{term.term}</p>
				<p class="text-sm mt-0.5" style="color:var(--muted);">{term.korean}</p>
				<p class="text-xs mt-1" style="color:var(--border);">{term.definition}</p>
			{/if}
			{#if submitted && wasCorrect}
				<div class="mt-3 pt-3 anim-pop" style="border-top:1px solid var(--border);">
					<p class="text-xs font-medium mb-2" style="color:var(--muted);">어원 구조</p>
					<div class="flex flex-wrap gap-1.5">
						{#each term.etymology as e, i}
							<span class="tag" style="background:{col(i)}12;color:{col(i)};border:1px solid {col(i)}30;">
								{e.part} — {e.meaningKo}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- 🧩 조합 -->
		{#if qMode === 'normal'}
			<div class="flex flex-wrap gap-2 mb-3">
				{#each slots as slot, i}
					<button
						class="relative min-w-[72px] sm:min-w-[88px] h-11 sm:h-12 rounded-md border flex flex-col items-center justify-center transition-all text-sm"
						style={slotStates[i]==='correct'
							? 'border-color:#3d9970;background:#f0faf4;'
							: slotStates[i]==='wrong'
							? 'border-color:#e03e3e;background:#fff0f0;'
							: slot
							? `border-color:${slot.color}50;background:${slot.color}0d;border-style:solid;`
							: 'border-color:var(--border);border-style:dashed;background:white;'}
						onclick={() => clickSlot(i)} ondragover={dos} ondrop={e => drs(e, i)}
					>
						{#if slot}
							<div draggable={!submitted} role="button" tabindex="0"
								ondragstart={e => dss(e, i)}
								class="flex flex-col items-center px-2 select-none"
								class:anim-pop={slotStates[i]==='filled'} class:anim-shake={slotStates[i]==='wrong'}
							>
								<span class="font-semibold text-sm" style="color:{slot.color};">{slot.part}</span>
								<span class="text-xs" style="color:var(--muted);">{slot.meaningKo}</span>
							</div>
							{#if slotStates[i]==='correct'}<span class="absolute top-0.5 right-1 text-xs" style="color:#3d9970;">✓</span>{/if}
							{#if slotStates[i]==='wrong'}<span class="absolute top-0.5 right-1 text-xs" style="color:#e03e3e;">✗</span>{/if}
						{:else}
							<span style="color:var(--border);">{i+1}</span>
						{/if}
					</button>
				{/each}
			</div>

			<div class="card p-3 mb-4" role="region" aria-label="블록 풀"
				ondragover={dop} ondrop={drp}>
				{#if pool.length === 0}
					<p class="text-xs text-center" style="color:var(--muted);">모든 블록을 배치했습니다</p>
				{:else}
					<div class="flex flex-wrap gap-1.5">
						{#each pool as b}
							<button draggable={!submitted}
								class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm select-none transition-all"
								style="border-color:{b.color}40;background:{selBlock?.id===b.id ? b.color+'18':'white'};color:{b.color};"
								onclick={() => clickPool(b)} ondragstart={e => dsp(e, b)}
							>
								<span class="font-semibold">{b.part}</span>
								<span class="text-xs" style="color:var(--muted);">{b.meaningKo}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if !submitted}
				<button class="btn btn-primary w-full" disabled={!allFilled()} onclick={submitNormal}>확인</button>
			{:else}
				{@render resultRow()}
			{/if}

		<!-- 🔍 추론 / ✏️ 완성 -->
		{:else}
			<div class="card p-4 mb-4">
				<!-- Etymology display -->
				<div class="flex flex-wrap gap-1.5 mb-3">
					{#each term.etymology as e, i}
						<div class="px-2.5 py-1.5 rounded-md border text-center"
							style={i===hiddenIdx
								? 'border-color:var(--text);background:var(--surface);'
								: `border-color:${col(i)}30;background:${col(i)}0d;`}>
							<p class="font-semibold text-sm" style="color:{i===hiddenIdx ? 'var(--text)' : col(i)};">{i===hiddenIdx && qMode==='fill' ? '?' : e.part}</p>
							{#if i===hiddenIdx}
								{#if qMode==='fill'}
									<p class="text-xs" style="color:var(--muted);">{e.meaningKo}</p>
								{:else}
									<p class="text-base font-bold" style="color:var(--muted);">?</p>
								{/if}
							{:else}
								<p class="text-xs" style="color:var(--muted);">{e.meaningKo}</p>
							{/if}
						</div>
					{/each}
				</div>
				<p class="text-xs mb-3" style="color:var(--muted);">
					{#if qMode==='reverse'}
						<strong style="color:var(--text);">{term.etymology[hiddenIdx].part}</strong> 의 뜻은?
					{:else}
						<strong style="color:var(--text);">{term.etymology[hiddenIdx].meaningKo}</strong> 에 해당하는 어원 파트는?
					{/if}
				</p>
				<div class="grid grid-cols-2 gap-2">
					{#each choices as c}
						{@const isAns = c === (qMode==='reverse' ? term.etymology[hiddenIdx].meaningKo : term.etymology[hiddenIdx].part)}
						<button
							class="py-2.5 px-3 rounded-md border text-sm text-left transition-all"
							style={submitted
								? isAns
									? 'border-color:#3d9970;background:#f0faf4;color:#2d7054;font-weight:500;'
									: picked===c
									? 'border-color:#e03e3e;background:#fff0f0;color:#c0392b;'
									: 'border-color:var(--border);color:var(--muted);background:var(--surface);'
								: picked===c
								? 'border-color:var(--text);background:var(--surface);color:var(--text);font-weight:500;'
								: 'border-color:var(--border);color:var(--text);background:white;'}
							disabled={submitted} onclick={() => (picked = c)}
						>{c}{#if submitted && isAns} ✓{/if}</button>
					{/each}
				</div>
			</div>
			{#if !submitted}
				<button class="btn btn-primary w-full" disabled={!picked}
					onclick={() => submitChoice(picked === (qMode==='reverse' ? term!.etymology[hiddenIdx].meaningKo : term!.etymology[hiddenIdx].part))}>
					확인
				</button>
			{:else}
				{@render resultRow()}
			{/if}
		{/if}
	{/if}

<!-- ═══════════════════════════════ RESULT ════════════════════════════════ -->
{:else if phase === 'result'}
{@const cleared = correct >= GOAL}

	<h2 class="text-2xl font-bold mb-1" style="color:#1D1D1F; letter-spacing:-0.02em;">{cleared ? '클리어! 🎉' : '게임 오버'}</h2>
	<p class="text-sm mb-8" style="color:#6E6E73;">
		{cleared ? `정답 ${GOAL}개를 모두 맞췄습니다.` : '하트를 모두 잃었습니다. 다시 도전해보세요.'}
	</p>

	<div class="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
		{#each [
			{ label: '정답', value: `${correct}개` },
			{ label: '점수', value: `${score}pt` },
			{ label: '잔여 하트', value: Array(MAX_HEARTS).fill(0).map((_,i) => i < hearts ? '❤️' : '💔').join('') },
		] as stat}
			<div class="card-flat p-2 sm:p-3 text-center">
				<p class="text-base sm:text-lg font-semibold mb-0.5" style="color:var(--text);">{stat.value}</p>
				<p class="text-xs" style="color:var(--muted);">{stat.label}</p>
			</div>
		{/each}
	</div>

	{#if cleared && hearts === MAX_HEARTS}
		<div class="card p-3 mb-6 text-center" style="border-color:#e9c46a;background:#fffbeb;">
			<p class="text-sm font-medium" style="color:#92400e;">✨ 하트를 하나도 잃지 않은 퍼펙트 클리어!</p>
		</div>
	{/if}

	<hr style="border-color:var(--border); margin-bottom:24px;">

	<p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color:var(--muted);">오늘의 기록</p>
	<div class="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
		{#each [
			{ label: '게임', value: daily.games },
			{ label: '총 정답', value: daily.totalCorrect },
			{ label: '최고 점수', value: daily.bestScore },
		] as stat}
			<div class="card-flat p-2 sm:p-3 text-center">
				<p class="text-lg sm:text-xl font-semibold" style="color:var(--text);">{stat.value}</p>
				<p class="text-xs mt-0.5" style="color:var(--muted);">{stat.label}</p>
			</div>
		{/each}
	</div>

	<div class="flex gap-2">
		<button class="btn btn-default flex-1" onclick={() => { phase = 'home'; }}>← 홈으로</button>
		<button class="btn btn-primary flex-1" onclick={startGame}>다시 하기</button>
	</div>
{/if}

{#snippet resultRow()}
	<div class="card p-3 flex items-center gap-3 mt-2 anim-pop"
		style={wasCorrect ? 'border-color:#3d9970;background:#f6fdf9;' : 'border-color:#e03e3e;background:#fff6f6;'}>
		<div class="flex-1 text-sm">
			{#if wasCorrect}
				<p class="font-medium" style="color:#2d7054;">
					정답 +{10+(combo-1)*2}pt{#if combo>=2} — 🔥{combo}콤보{/if}
				</p>
				<p class="text-xs mt-0.5" style="color:var(--muted);">{term?.etymology.map(e=>e.part).join(' + ')}</p>
			{:else}
				<p class="font-medium" style="color:#c0392b;">오답</p>
				<p class="text-xs mt-0.5" style="color:var(--muted);">
					정답: {qMode==='reverse' ? term?.etymology[hiddenIdx].meaningKo : qMode==='fill' ? term?.etymology[hiddenIdx].part : term?.etymology.map(e=>e.part).join(' + ')}
				</p>
			{/if}
		</div>
		<button class="btn btn-primary text-sm shrink-0" onclick={advance}>
			{hearts<=0||correct>=GOAL ? '결과 보기 →' : '다음 →'}
		</button>
	</div>
{/snippet}
