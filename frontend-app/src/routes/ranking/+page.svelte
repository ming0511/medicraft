<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadProfile, type Profile } from '$lib/stores/profile.svelte';
	import { loadProgress, type Progress } from '$lib/stores/progress.svelte';
	import {
		fetchLeaderboard,
		syncStatsToServer,
		type LeaderboardEntry
	} from '$lib/stores/leaderboard.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	type Entry = LeaderboardEntry;

	let profile = $state<Profile | null>(null);
	let progress = $state<Progress>(loadProgress());
	let tab = $state<'all' | 'school'>('all');
	let entries = $state<Entry[]>([]);
	let loading = $state(true);
	let live = $state(false); // 실제 Supabase 데이터 사용 중인가

	onMount(async () => {
		const p = loadProfile();
		if (!p) {
			goto('/onboarding');
			return;
		}
		profile = p;
		progress = loadProgress();
		await loadBoard();
		setTimeout(() => {
			document.querySelector('.row.me')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 250);
	});

	async function loadBoard() {
		loading = true;
		try {
			// 내 최신 로컬 점수를 서버에 먼저 반영한 뒤 전체를 가져온다.
			await syncStatsToServer(profile!, progress, data.supabase);
			const rows = await fetchLeaderboard(data.supabase);
			if (rows && rows.length) {
				entries = rows;
				live = true;
				return;
			}
		} catch {
			// 네트워크/권한 실패
		} finally {
			loading = false;
		}
		// 실제 데이터 없음(게스트 / 미로그인 / Supabase 미설정) → 빈 상태
		entries = [];
		live = false;
	}

	const allRanked = $derived(entries.slice().sort((a, b) => b.xp - a.xp));
	const showPodium = $derived(allRanked.length >= 3);
	const podium = $derived(allRanked.slice(0, 3));
	const rest = $derived(showPodium ? allRanked.slice(3) : allRanked);

	type SchoolEntry = { school: string; xp: number; members: number; mine: boolean };
	const schoolRanked = $derived<() => SchoolEntry[]>(() => {
		const map = new Map<string, { xp: number; members: number }>();
		for (const e of allRanked) {
			if (!e.school || e.school === '학교 미입력') continue; // 학교 없는 사용자는 학교별 집계에서 제외
			const cur = map.get(e.school) ?? { xp: 0, members: 0 };
			cur.xp += e.xp;
			cur.members += 1;
			map.set(e.school, cur);
		}
		const arr: SchoolEntry[] = [];
		for (const [school, v] of map) {
			arr.push({ school, xp: v.xp, members: v.members, mine: !!profile?.school && school === profile.school });
		}
		arr.sort((a, b) => b.xp - a.xp);
		return arr;
	});
	const mySchoolRank = $derived<() => number | null>(() => {
		const i = schoolRanked().findIndex((s) => s.mine);
		return i === -1 ? null : i + 1;
	});
	const medal = (r: number) => `${r}`;
	const fmt = (n: number) => n.toLocaleString();
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="캠퍼스"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">랭킹</div>
		<div style="width:36px"></div>
	</header>

	<div class="tabs">
		<button class="tab" class:on={tab === 'all'} onclick={() => (tab = 'all')}>전체</button>
		<button class="tab" class:on={tab === 'school'} onclick={() => (tab = 'school')}>학교별</button>
	</div>

	<div class="scroll">
		{#if loading}
			<div class="loading">랭킹 불러오는 중…</div>
		{:else}
		{#if tab === 'all'}
			{#if allRanked.length === 0}
				<div class="empty-note empty-cta">
					<div>아직 랭킹 데이터가 없어요.<br />로그인하면 전체 사용자와 XP 순위를 겨뤄요.</div>
					<button class="pill-btn pill-btn--primary" onclick={() => goto('/')}>로그인하러 가기</button>
				</div>
			{/if}
			{#if showPodium}
				{@const p1 = podium[0]}
				{@const p2 = podium[1]}
				{@const p3 = podium[2]}
				<div class="podium">
					<div class="pcol">
						<div class="pav s2"><Mascot size={40} variant={p2.char} float={false} /></div>
						<div class="pnick">{p2.nick}{p2.me ? ' (나)' : ''}</div>
						<div class="pxp">{fmt(p2.xp)}</div>
						<div class="pbar h2"><Icon name="medal" size={22} /></div>
					</div>
					<div class="pcol">
						<div class="pav s1"><Mascot size={52} variant={p1.char} float={false} /></div>
						<div class="pnick big">{p1.nick}{p1.me ? ' (나)' : ''}</div>
						<div class="pxp">{fmt(p1.xp)} XP</div>
						<div class="pbar h1"><Icon name="medal" size={26} /></div>
					</div>
					<div class="pcol">
						<div class="pav s3"><Mascot size={36} variant={p3.char} float={false} /></div>
						<div class="pnick">{p3.nick}{p3.me ? ' (나)' : ''}</div>
						<div class="pxp">{fmt(p3.xp)}</div>
						<div class="pbar h3"><Icon name="medal" size={22} /></div>
					</div>
				</div>
			{/if}

			{#if rest.length}
				<div class="list card">
					{#each rest as entry, i (entry.id)}
						{@const rank = allRanked.indexOf(entry) + 1}
						<div class="row" class:me={entry.me} class:divider={i > 0}>
							<span class="rk">{medal(rank)}</span>
							<span class="rav"><Mascot size={28} variant={entry.char} float={false} /></span>
							<span class="rinfo">
								<span class="rnick">{entry.nick}{#if entry.me}<span class="metag">나</span>{/if}</span>
								<span class="rschool">{entry.school}</span>
							</span>
							<span class="rxp"><b>{fmt(entry.xp)}</b><small>XP</small></span>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			{#if !profile?.school}
				<div class="empty-note empty-cta">
					<div>학교를 설정하면 우리 학교 XP도 합산돼서 순위에 반영돼요</div>
					<button class="pill-btn pill-btn--primary" onclick={() => goto('/settings')}>학교 설정하러 가기</button>
				</div>
			{:else if mySchoolRank()}
				<div class="my-school-cap">우리 학교 #{mySchoolRank()} · {schoolRanked().length}개 학교 중</div>
			{/if}
			{#if schoolRanked().length}
				<div class="list card">
					{#each schoolRanked() as s, i (s.school)}
						<div class="row" class:me={s.mine} class:divider={i > 0}>
							<span class="rk">{i + 1}</span>
							<span class="rinfo">
								<span class="rnick">{s.school}{#if s.mine}<span class="metag">우리 학교</span>{/if}</span>
								<span class="rschool">{s.members}명 참여</span>
							</span>
							<span class="rxp"><b>{fmt(s.xp)}</b><small>XP</small></span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if live}
			<div class="foot-note">전체 사용자 실시간 랭킹 · XP 순</div>
		{/if}
		<div class="bottom-space"></div>
		{/if}
	</div>

	<BottomNav active="ranking" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }

	.tabs { display: flex; gap: 8px; padding: 4px 16px 10px; flex: none; }
	.tab {
		flex: 1;
		height: 38px;
		border-radius: 999px;
		border: 1.5px solid var(--line);
		background: #fff;
		font: inherit;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--ink-2);
	}
	.tab:disabled { opacity: 0.4; }
	.tab.on { background: var(--brand); border-color: var(--brand); color: #fff; }

	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 16px 0; }

	/* 시상대 */
	.podium { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; gap: 8px; padding: 8px 4px 4px; }
	.pcol { display: flex; flex-direction: column; align-items: center; }
	.pav { border-radius: 50%; overflow: hidden; background: var(--brand-l); display: flex; align-items: center; justify-content: center; }
	.pav :global(.mw) { margin-top: 3px; }
	.pav.s1 { width: 56px; height: 56px; }
	.pav.s2, .pav.s3 { width: 42px; height: 42px; }
	.pnick { font-size: 11.5px; margin-top: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.pnick.big { font-weight: 800; }
	.pxp { font-size: 10.5px; color: var(--mut); font-weight: 600; }
	.pbar {
		width: 100%;
		margin-top: 6px;
		border-radius: 12px 12px 0 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.h1 { height: 64px; background: linear-gradient(180deg, #ffe9a8, #ffd55e); color: #a8780c; }
	.h2 { height: 44px; background: linear-gradient(180deg, #e7e9ee, #cdd2da); color: #7c828c; }
	.h3 { height: 30px; background: linear-gradient(180deg, #f0d6bd, #e0b894); color: #9a6c44; }

	.empty-note {
		margin-top: 12px;
		padding: 12px;
		border-radius: var(--r-md);
		background: var(--card);
		text-align: center;
		font-size: 12.5px;
		color: var(--mut);
	}
	.empty-cta { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 16px; }
	.empty-cta .pill-btn { width: auto; padding: 0 18px; height: 40px; }
	.my-school-cap { margin: 12px 2px 4px; font-size: 12.5px; font-weight: 700; color: var(--brand-d); }

	.list { margin-top: 14px; padding: 2px 6px; }
	.row { display: flex; align-items: center; gap: 10px; padding: 10px; }
	.row.divider { border-top: 1px solid var(--line); }
	.row.me { background: var(--brand-l); border-radius: 12px; }
	.rk { min-width: 26px; text-align: center; font-weight: 800; font-size: 14px; }
	.rav { width: 28px; height: 28px; flex: none; border-radius: 50%; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; }
	.rav :global(.mw) { margin-top: 2px; }
	.rinfo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
	.rnick { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.metag { margin-left: 6px; font-size: 10px; font-weight: 800; background: var(--brand); color: #fff; border-radius: 999px; padding: 1px 7px; }
	.rschool { font-size: 11px; color: var(--mut); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.rxp { text-align: right; flex: none; }
	.rxp b { font-size: 14px; font-weight: 800; }
	.rxp small { display: block; font-size: 9px; color: var(--mut); letter-spacing: 0.1em; }

	.loading { text-align: center; font-size: 13px; color: var(--mut); padding: 48px 0; }
	.foot-note { text-align: center; font-size: 11px; color: var(--mut); padding: 16px 0 4px; }
	.bottom-space { height: 12px; }
</style>
