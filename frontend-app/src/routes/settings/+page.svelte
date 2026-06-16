<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadProfile, saveProfile, type Profile } from '$lib/stores/profile.svelte';
	import { loadProgress, type Progress } from '$lib/stores/progress.svelte';
	import { resetAll } from '$lib/stores/srs.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { SCHOOLS, SCHOOL_OTHER } from '$lib/data/schools';
	import { SOURCES } from '$lib/data/morphemes';
	import { hasEntitlement } from '$lib/stores/entitlements.svelte';
	import { PAYMENTS_ENABLED } from '$lib/payments/env';
	import { PRODUCTS } from '$lib/payments/products';

	let { data } = $props();

	const dataSources = Object.values(SOURCES).filter((s) => s.url);

	const COLOR_NAMES = ['민트', '하늘', '복숭아', '라벤더'];

	let profile = $state<Profile | null>(null);
	let progress = $state<Progress | null>(null);
	let nickname = $state('');
	let schoolChoice = $state('');
	let schoolOther = $state('');
	let character = $state<Profile['character']>(0);
	let toast = $state<string | null>(null);
	let confirmReset = $state(false);
	let emergencyOwned = $state(false);

	const school = $derived(schoolChoice === SCHOOL_OTHER ? schoolOther.trim() : schoolChoice);
	const dirty = $derived(
		!!profile &&
			(nickname.trim() !== profile.nickname || school !== profile.school || character !== profile.character)
	);

	onMount(() => {
		const p = loadProfile();
		if (!p) {
			goto('/onboarding');
			return;
		}
		profile = p;
		nickname = p.nickname;
		if (!p.school) schoolChoice = '';
		else if ((SCHOOLS as readonly string[]).includes(p.school)) schoolChoice = p.school;
		else {
			schoolChoice = SCHOOL_OTHER;
			schoolOther = p.school;
		}
		character = p.character;
		progress = loadProgress();
		hasEntitlement(data.supabase, 'emergency_unlock').then((v) => (emergencyOwned = v));
	});

	function flash(msg: string) {
		toast = msg;
		setTimeout(() => (toast = null), 1600);
	}
	function save() {
		if (!nickname.trim()) {
			flash('닉네임은 비울 수 없어요');
			return;
		}
		const next: Profile = { nickname: nickname.trim(), school, character };
		saveProfile(next);
		profile = next;
		flash('저장됐어요');
	}
	function doReset() {
		if (!confirmReset) {
			confirmReset = true;
			setTimeout(() => (confirmReset = false), 4000);
			return;
		}
		try {
			localStorage.removeItem('medicraft.profile');
			localStorage.removeItem('medicraft.progress');
			resetAll();
		} catch {
			// ignore
		}
		goto('/');
	}
	function doLogout() {
		// 게스트 로그아웃 — 프로필만 비우고 진행도는 유지(재온보딩 시 이어짐).
		try {
			localStorage.removeItem('medicraft.profile');
		} catch {
			// ignore
		}
		goto('/');
	}

	const PHASE2: { icon: IconName; name: string }[] = [
		{ icon: 'bell', name: '학습 알림' },
		{ icon: 'cloud', name: '구글 동기화' }
	];
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="캠퍼스"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">설정</div>
		<div style="width:36px"></div>
	</header>

	<div class="scroll">
		<!-- 프로필 -->
		<div class="sec-h">프로필</div>
		<div class="card pad">
			<label class="fld">
				<span class="lbl">닉네임</span>
				<input type="text" bind:value={nickname} maxlength="16" class="field" />
			</label>
			<label class="fld">
				<span class="lbl">학교</span>
				<span class="select-wrap">
					<select bind:value={schoolChoice} class="field">
						<option value="">선택 안 함</option>
						{#each SCHOOLS as s (s)}<option value={s}>{s}</option>{/each}
						<option value={SCHOOL_OTHER}>기타 (직접 입력)</option>
					</select>
				</span>
				{#if schoolChoice === SCHOOL_OTHER}
					<input type="text" bind:value={schoolOther} placeholder="학교 이름을 입력하세요" maxlength="40" class="field mt" />
				{/if}
			</label>
			<div class="fld">
				<span class="lbl">마스코트 — {COLOR_NAMES[character]}</span>
				<div class="picker">
					{#each [0, 1, 2, 3] as i (i)}
						<button type="button" class="swatch" class:on={character === i} onclick={() => (character = i as Profile['character'])} aria-label={COLOR_NAMES[i]}>
							<Mascot size={50} variant={i as 0 | 1 | 2 | 3} float={false} />
						</button>
					{/each}
				</div>
			</div>
		</div>
		<button
			class="pill-btn save-btn"
			class:pill-btn--primary={dirty}
			class:pill-btn--ghost={!dirty}
			aria-disabled={!dirty}
			onclick={save}
		>
			{#if dirty}프로필 저장{:else}<Icon name="check" size={16} /> 저장됨{/if}
		</button>

		<!-- 진행도 -->
		{#if progress}
			<div class="sec-h">현재 진행도</div>
			<div class="card pad stats">
				<div class="st"><span>레벨</span><b>Lv.{progress.level}</b></div>
				<div class="st"><span>XP</span><b>{progress.xp.toLocaleString()}</b></div>
				<div class="st"><span>학습 카드</span><b>{progress.cardsLearned}장</b></div>
				<div class="st"><span>수집 어원</span><b>{progress.collectedRoots.length}</b></div>
				<div class="st"><span>최장 연속</span><b>{progress.bestStreak}일</b></div>
			</div>
		{/if}

		<!-- 결제 (토스 키 설정 시에만 노출) -->
		{#if PAYMENTS_ENABLED}
			<div class="sec-h">결제</div>
			<div class="card list">
				<button class="row row-btn" onclick={() => goto('/emergency')}>
					<span class="row-ic"><Icon name="crown" size={18} /></span>
					<span class="row-name">응급실 모드 (벼락치기)</span>
					{#if emergencyOwned}
						<span class="row-badge owned"><Icon name="check" size={12} /> 보유</span>
					{:else}
						<span class="row-badge buy">{PRODUCTS.emergency_unlock.amount.toLocaleString()}원</span>
					{/if}
				</button>
			</div>
		{/if}

		<!-- Phase 2 -->
		<div class="sec-h">알림 · 데이터</div>
		<div class="card list">
			{#each PHASE2 as it, i (it.name)}
				<div class="row" class:divider={i > 0}>
					<span class="row-ic"><Icon name={it.icon} size={18} /></span>
					<span class="row-name">{it.name}</span>
					<span class="row-badge">Phase 2</span>
				</div>
			{/each}
		</div>

		<!-- 데이터 출처 -->
		{#if dataSources.length}
			<div class="sec-h">어원 데이터 출처</div>
			<div class="card credits">
				{#each dataSources as s, i (s.url)}
					<div class="cr" class:divider={i > 0}>
						<a class="cr-name" href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
						<span class="cr-lic">{s.license}</span>
					</div>
				{/each}
				<div class="cr-note">어원·정의는 위 자료에서 발췌·번안했으며 한국어 뜻은 자체 작성. 출처별 라이선스(CC-BY 등) 표기.</div>
			</div>
		{/if}

		<!-- 계정 -->
		<button class="logout" onclick={doLogout}>
			<Icon name="logOut" size={15} /> 로그아웃
		</button>
		<div class="reset-cap">진행도는 보존되고, 다시 로그인하면 이어집니다</div>

		<!-- 초기화 -->
		<button class="reset" class:armed={confirmReset} onclick={doReset}>
			{#if confirmReset}한 번 더 누르면 정말 초기화돼요{:else}<Icon name="trash" size={15} /> 모든 데이터 초기화{/if}
		</button>
		<div class="reset-cap">프로필 · 진행도 · SRS 큐가 모두 사라집니다</div>
		<div class="bottom-space"></div>
	</div>

	{#if toast}<div class="toast">{toast}</div>{/if}
	<BottomNav active="settings" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 0; }
	.sec-h { margin: 16px 2px 8px; font-size: 14px; font-weight: 800; color: var(--ink-2); }
	.sec-h:first-child { margin-top: 4px; }

	.credits { padding: 4px 14px; }
	.cr { display: flex; align-items: center; gap: 10px; padding: 11px 0; }
	.cr.divider { border-top: 1px solid var(--line); }
	.cr-name { flex: 1; min-width: 0; font-size: 12.5px; color: var(--brand-d); font-weight: 600; text-decoration: none; line-height: 1.4; }
	.cr-name:active { text-decoration: underline; }
	.cr-lic { flex: none; font-size: 10.5px; font-weight: 700; color: var(--mut); background: var(--card); border-radius: 999px; padding: 2px 8px; }
	.cr-note { font-size: 11px; color: var(--mut); line-height: 1.5; padding: 8px 0 12px; border-top: 1px solid var(--line); }
	.card.pad { padding: 16px; }

	.fld { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
	.fld:last-of-type { margin-bottom: 0; margin-top: 22px; }
	.lbl { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
	.field {
		width: 100%;
		height: 46px;
		border-radius: 13px;
		border: 1.5px solid var(--line);
		background: #fff;
		padding: 0 14px;
		font: inherit;
		font-size: 14.5px;
		color: var(--ink);
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.field:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-l); }
	.field.mt { margin-top: 9px; }
	.select-wrap { position: relative; display: block; }
	.select-wrap select { appearance: none; -webkit-appearance: none; padding-right: 36px; }
	.select-wrap::after {
		content: '';
		position: absolute;
		right: 16px;
		top: 50%;
		width: 7px;
		height: 7px;
		border-right: 2px solid var(--mut);
		border-bottom: 2px solid var(--mut);
		transform: translateY(-65%) rotate(45deg);
		pointer-events: none;
	}
	.picker { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
	.swatch {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 7px 2px;
		border-radius: 13px;
		border: 2px solid var(--line);
		background: #fff;
		transition: border-color 0.12s, background 0.12s;
	}
	.swatch.on { border-color: var(--brand); background: var(--brand-l); }
	.save-btn { width: 100%; margin-top: 12px; }
	.save-btn.pill-btn--ghost { color: var(--mut); }

	.stats { display: flex; flex-direction: column; gap: 0; padding: 6px 16px; }
	.st { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; font-size: 13.5px; }
	.st + .st { border-top: 1px solid var(--line); }
	.st span { color: var(--mut); }
	.st b { font-weight: 800; }

	.list { padding: 2px 6px; }
	.row { display: flex; align-items: center; gap: 12px; padding: 12px 10px; }
	.row.divider { border-top: 1px solid var(--line); }
	.row-ic { width: 38px; height: 38px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 19px; background: var(--card); border-radius: 11px; }
	.row-name { flex: 1; font-size: 14.5px; font-weight: 600; }
	.row-badge { font-size: 11px; font-weight: 700; color: var(--mut); background: var(--card); border-radius: 999px; padding: 3px 9px; }
	.row-btn { width: 100%; background: none; border: 0; cursor: pointer; text-align: left; font: inherit; }
	.row-btn:active { background: var(--card); border-radius: 12px; }
	.row-badge.buy { color: var(--brand-d); background: color-mix(in srgb, var(--brand) 14%, #fff); }
	.row-badge.owned { display: inline-flex; align-items: center; gap: 3px; color: #fff; background: var(--brand); }

	.logout {
		width: 100%;
		margin-top: 22px;
		height: 48px;
		border-radius: 14px;
		border: 1.5px solid var(--line);
		background: #fff;
		color: var(--ink-2);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
	.logout:active { background: var(--card); }
	.reset {
		width: 100%;
		margin-top: 22px;
		height: 48px;
		border-radius: 14px;
		border: 1.5px solid #f0c2c2;
		background: #fdf4f4;
		color: #d14b4b;
		font: inherit;
		font-size: 13.5px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
	.reset.armed { background: #d14b4b; color: #fff; border-color: #d14b4b; }
	.reset-cap { margin-top: 8px; text-align: center; font-size: 11.5px; color: var(--mut); }
	.bottom-space { height: 16px; }

	.toast {
		position: absolute;
		left: 50%;
		bottom: 96px;
		transform: translateX(-50%);
		background: var(--ink);
		color: #fff;
		padding: 10px 16px;
		font-size: 13px;
		border-radius: 999px;
		box-shadow: var(--shadow-pop);
		z-index: 50;
		white-space: nowrap;
	}
</style>
