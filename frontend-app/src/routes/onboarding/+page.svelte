<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { saveProfile, syncProfileToServer, type Profile } from '$lib/stores/profile.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { SCHOOLS, SCHOOL_OTHER } from '$lib/data/schools';
	import { LEGAL_DOCS } from '$lib/legal';
	import { recordConsents } from '$lib/stores/consents.svelte';
	import type { ConsentDoc } from '$lib/supabase/types';
	import LegalSheet from '$lib/components/LegalSheet.svelte';

	let { data } = $props();

	// 로그인 사용자만 약관 동의가 필요. 게스트는 localStorage 만 쓰고 서버에 PII 안 쌓이므로 스킵.
	const isLoggedIn = $derived(Boolean(data.session));
	let step = $state<0 | 1 | 2>(untrack(() => (data.session ? 0 : 1)));
	let nickname = $state('');
	let schoolChoice = $state(''); // '' = 미선택, SCHOOLS 값, 또는 SCHOOL_OTHER
	let schoolOther = $state('');
	let character = $state<Profile['character']>(0);
	let nicknameError = $state(false);

	let agreed = $state<Record<ConsentDoc, boolean>>({
		terms: false,
		privacy: false,
		age_14: false,
		marketing: false
	});
	let savingConsents = $state(false);
	let sheetDoc = $state<ConsentDoc | null>(null);

	function openSheet(doc: ConsentDoc) {
		sheetDoc = doc;
	}
	function closeSheet() {
		sheetDoc = null;
	}

	const allRequiredChecked = $derived(
		LEGAL_DOCS.filter((d) => d.required).every((d) => agreed[d.doc])
	);
	const allChecked = $derived(LEGAL_DOCS.every((d) => agreed[d.doc]));

	const school = $derived(schoolChoice === SCHOOL_OTHER ? schoolOther.trim() : schoolChoice);
	const COLOR_NAMES = ['민트', '하늘', '복숭아', '라벤더'];

	const TITLES = ['약관 동의', '프로필 만들기', '마스코트 고르기'] as const;

	function toggleAll() {
		const next = !allChecked;
		for (const d of LEGAL_DOCS) agreed[d.doc] = next;
	}

	async function submitConsents() {
		if (!allRequiredChecked || savingConsents) return;
		savingConsents = true;
		try {
			await recordConsents(agreed, data.supabase);
			step = 1;
		} finally {
			savingConsents = false;
		}
	}

	function goNext() {
		if (!nickname.trim()) {
			nicknameError = true;
			return;
		}
		nicknameError = false;
		step = 2;
	}

	function goBack() {
		if (step === 2) step = 1;
		else if (step === 1 && isLoggedIn) step = 0;
		else history.back();
	}

	async function enterCampus() {
		const p: Profile = { nickname: nickname.trim(), school, character };
		saveProfile(p);
		syncProfileToServer(p, data.supabase).catch(() => {
			// 서버 동기화 실패해도 localStorage 는 저장되어 있어 입장은 진행
		});
		goto('/campus');
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={goBack} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">{TITLES[step]}</div>
		<div style="width:36px"></div>
	</header>

	<div
		class="steps"
		role="progressbar"
		aria-valuemin={isLoggedIn ? 0 : 1}
		aria-valuemax="2"
		aria-valuenow={step}
	>
		{#if isLoggedIn}
			<span class="dot" class:on={step >= 0}></span>
		{/if}
		<span class="dot" class:on={step >= 1}></span>
		<span class="dot" class:on={step >= 2}></span>
	</div>

	{#if step === 0}
		<!-- ===== STEP 0: 약관 동의 ===== -->
		<div class="body">
			<h1 class="h1">시작하기 전에<br />약관 동의가 필요해요</h1>
			<p class="sub">학습 기록을 안전하게 저장하기 위해 필요한 항목이에요.</p>

			<div class="consents">
				<button type="button" class="consent-all" onclick={toggleAll}>
					<span class="cbx" class:on={allChecked} aria-hidden="true">
						{#if allChecked}<Icon name="check" size={14} />{/if}
					</span>
					<span class="consent-all__label">전체 동의</span>
				</button>

				<div class="consent-list">
					{#each LEGAL_DOCS as meta (meta.doc)}
						<label class="consent-item">
							<input type="checkbox" bind:checked={agreed[meta.doc]} class="consent-input" />
							<span class="cbx" class:on={agreed[meta.doc]} aria-hidden="true">
								{#if agreed[meta.doc]}<Icon name="check" size={14} />{/if}
							</span>
							<span class="consent-item__text">
								<span class="consent-item__tag" class:req={meta.required}>
									{meta.required ? '필수' : '선택'}
								</span>
								{meta.title}
							</span>
							{#if meta.path}
								<button
									type="button"
									class="consent-item__view"
									onclick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										openSheet(meta.doc);
									}}
								>
									보기
								</button>
							{/if}
						</label>
					{/each}
				</div>
			</div>

			<div class="foot">
				<button
					class="pill-btn pill-btn--primary"
					onclick={submitConsents}
					disabled={!allRequiredChecked || savingConsents}
				>
					{savingConsents ? '저장 중…' : '동의하고 시작'}
				</button>
			</div>
		</div>
	{:else if step === 1}
		<!-- ===== STEP 1 ===== -->
		<div class="body">
			<h1 class="h1">반가워요!<br />이름표를 만들어요</h1>
			<p class="sub">닉네임만 필수예요. 학교는 나중에 채워도 돼요.</p>

			<div class="fields">
				<label class="fld">
					<span class="lbl">닉네임 <em>*</em></span>
					<input
						type="text"
						bind:value={nickname}
						placeholder="예: 닥터김"
						maxlength="16"
						class="field"
						class:field--err={nicknameError}
					/>
					{#if nicknameError}<span class="err">닉네임을 입력해 주세요.</span>{/if}
				</label>

				<label class="fld">
					<span class="lbl">학교 <em class="opt">선택</em></span>
					<span class="select-wrap">
						<select bind:value={schoolChoice} class="field">
							<option value="">선택 안 함</option>
							{#each SCHOOLS as sc (sc)}
								<option value={sc}>{sc}</option>
							{/each}
							<option value={SCHOOL_OTHER}>기타 (직접 입력)</option>
						</select>
					</span>
					{#if schoolChoice === SCHOOL_OTHER}
						<input
							type="text"
							bind:value={schoolOther}
							placeholder="학교 이름을 입력하세요"
							maxlength="40"
							class="field mt"
						/>
					{/if}
				</label>
			</div>

			<div class="foot">
				<button class="pill-btn pill-btn--primary" onclick={goNext}>다음</button>
			</div>
		</div>
	{:else}
		<!-- ===== STEP 2 ===== -->
		<div class="preview" style="background:var(--brand-grad)">
			<Mascot size={132} variant={character} />
		</div>
		<div class="body">
			<h1 class="h1">마스코트를 골라요</h1>
			<p class="sub">{COLOR_NAMES[character]} 색 · 설정에서 언제든 바꿀 수 있어요.</p>

			<div class="picker">
				{#each [0, 1, 2, 3] as i (i)}
					<button
						type="button"
						class="swatch"
						class:on={character === i}
						onclick={() => (character = i as Profile['character'])}
						aria-label={COLOR_NAMES[i]}
					>
						<Mascot size={58} variant={i as 0 | 1 | 2 | 3} float={false} />
					</button>
				{/each}
			</div>

			<div class="foot">
				<button class="pill-btn pill-btn--primary" onclick={enterCampus}>캠퍼스로 입장</button>
			</div>
		</div>
	{/if}
</div>

<LegalSheet open={sheetDoc !== null} doc={sheetDoc} onClose={closeSheet} />

<style>
	.page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.steps {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		padding: 4px 0 10px;
		flex: none;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--line);
		transition: background 0.2s, width 0.2s;
	}
	.dot.on {
		background: var(--brand);
		width: 22px;
	}

	.body {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 14px 22px 18px;
		overflow-y: auto;
	}
	.h1 {
		font-size: 24px;
		font-weight: 800;
		line-height: 1.34;
	}
	.sub {
		margin-top: 9px;
		font-size: 14px;
		color: var(--mut);
		line-height: 1.5;
	}

	/* ── fields ── */
	.fields {
		margin-top: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.fld {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.lbl {
		font-size: 13px;
		font-weight: 600;
		color: var(--ink-2);
	}
	.lbl em {
		font-style: normal;
		color: var(--brand);
	}
	.lbl em.opt {
		color: var(--mut);
		font-weight: 500;
		background: var(--card);
		border-radius: 999px;
		padding: 1px 7px;
		font-size: 11px;
	}
	.field {
		width: 100%;
		height: 50px;
		border-radius: 14px;
		border: 1.5px solid var(--line);
		background: #fff;
		padding: 0 16px;
		font: inherit;
		font-size: 15px;
		color: var(--ink);
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.field::placeholder { color: #b5beb8; }
	.field:focus {
		border-color: var(--brand);
		box-shadow: 0 0 0 3px var(--brand-l);
	}
	.field--err { border-color: #ef5350; }
	.field.mt { margin-top: 9px; }
	.err {
		font-size: 12px;
		color: #ef5350;
	}
	.select-wrap {
		position: relative;
		display: block;
	}
	.select-wrap select {
		appearance: none;
		-webkit-appearance: none;
		padding-right: 38px;
	}
	.select-wrap::after {
		content: '';
		position: absolute;
		right: 18px;
		top: 50%;
		width: 8px;
		height: 8px;
		border-right: 2px solid var(--mut);
		border-bottom: 2px solid var(--mut);
		transform: translateY(-65%) rotate(45deg);
		pointer-events: none;
	}

	/* ── step 2 ── */
	.preview {
		flex: none;
		height: 210px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.picker {
		margin-top: 22px;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.swatch {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px 2px;
		border-radius: var(--r-md);
		border: 2px solid var(--line);
		background: #fff;
		transition: border-color 0.12s, background 0.12s, transform 0.08s;
	}
	.swatch:active { transform: scale(0.96); }
	.swatch.on {
		border-color: var(--brand);
		background: var(--brand-l);
	}

	.foot {
		margin-top: auto;
		padding-top: 22px;
	}

	/* ── step 0: consents ── */
	.consents {
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.consent-all {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: var(--card);
		border: 1.5px solid var(--line);
		border-radius: var(--r-md);
		font: inherit;
		font-size: 15px;
		font-weight: 700;
		color: var(--ink);
		cursor: pointer;
		transition: border-color 0.12s, background 0.12s;
	}
	.consent-all__label { flex: 1; text-align: left; }
	.consent-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px 4px;
	}
	.consent-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 12px;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.1s;
	}
	.consent-item:hover { background: var(--card); }
	.consent-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.cbx {
		flex: none;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		border: 1.8px solid var(--line);
		background: #fff;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		transition: background 0.1s, border-color 0.1s;
	}
	.cbx.on {
		background: var(--brand);
		border-color: var(--brand);
	}
	.consent-item__text {
		flex: 1;
		font-size: 14px;
		color: var(--ink);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.consent-item__tag {
		font-size: 11px;
		font-weight: 600;
		color: var(--mut);
		background: var(--card);
		border-radius: 999px;
		padding: 2px 8px;
	}
	.consent-item__tag.req {
		color: var(--brand);
		background: var(--brand-l);
	}
	.consent-item__view {
		flex: none;
		font: inherit;
		font-size: 12px;
		color: var(--mut);
		text-decoration: underline;
		text-underline-offset: 2px;
		background: transparent;
		border: 0;
		padding: 4px 6px;
		cursor: pointer;
	}
	.consent-item__view:hover { color: var(--ink); }
</style>
