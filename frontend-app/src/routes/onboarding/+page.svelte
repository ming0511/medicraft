<script lang="ts">
	import { goto } from '$app/navigation';

	type Profile = {
		nickname: string;
		school: string;
		department: string;
		year: 1 | 2 | 3 | 4 | null;
		character: 0 | 1 | 2 | 3;
	};

	const CHARACTERS = [
		{ name: '의대생', art: `  o\n /|\\\n / \\` },
		{ name: '간호학과', art: ` (◉)\n /|\\\n / \\` },
		{ name: '약대생', art: `  ☉\n <|>\n / \\` },
		{ name: '의공학과', art: ` [▣]\n /|\\\n / \\` }
	] as const;

	let step = $state<1 | 2>(1);
	let nickname = $state('');
	let school = $state('');
	let department = $state('');
	let year = $state<Profile['year']>(null);
	let character = $state<Profile['character']>(0);
	let nicknameError = $state(false);

	function goNext() {
		if (!nickname.trim()) {
			nicknameError = true;
			return;
		}
		nicknameError = false;
		step = 2;
	}

	function goBack() {
		if (step === 2) {
			step = 1;
		} else {
			history.back();
		}
	}

	function enterCampus() {
		const profile: Profile = {
			nickname: nickname.trim(),
			school: school.trim(),
			department: department.trim(),
			year,
			character
		};
		try {
			localStorage.setItem('medicraft.profile', JSON.stringify(profile));
		} catch {
			// localStorage 실패 시에도 진입은 허용 (private mode 등)
		}
		goto('/campus');
	}
</script>

<div class="flex flex-col flex-1">
	<!-- Top bar -->
	<header class="flex items-center gap-3 px-3 py-2 border-b-2 border-black text-[11px]">
		<button onclick={goBack} class="hover:opacity-60">← 뒤로</button>
		<div class="flex-1 text-center tracking-widest text-neutral-500 uppercase">
			Step {step} / 2
		</div>
		<div class="w-10"></div>
	</header>

	{#if step === 1}
		<!-- ===== STEP 1: 기본 정보 ===== -->
		<section class="flex-1 flex flex-col px-5 py-5">
			<h1 class="text-lg font-bold">기본 정보</h1>
			<p class="text-xs text-neutral-500 mt-1">닉네임만 필수, 나머지는 나중에 채워도 돼요.</p>

			<div class="mt-5 space-y-4">
				<!-- 닉네임 -->
				<label class="block">
					<div class="text-xs text-neutral-600 mb-1">
						닉네임 <span class="text-rose-600">*</span>
					</div>
					<input
						type="text"
						bind:value={nickname}
						placeholder="예: minky"
						maxlength="16"
						class="field w-full"
						class:field-error={nicknameError}
					/>
					{#if nicknameError}
						<p class="text-[11px] text-rose-600 mt-1">닉네임을 입력해 주세요.</p>
					{/if}
				</label>

				<!-- 학교 -->
				<label class="block">
					<div class="text-xs text-neutral-600 mb-1">
						학교 <span class="text-neutral-400">(선택)</span>
					</div>
					<input
						type="text"
						bind:value={school}
						placeholder="예: 서울대학교"
						maxlength="40"
						class="field w-full"
					/>
				</label>

				<!-- 학과 -->
				<label class="block">
					<div class="text-xs text-neutral-600 mb-1">
						학과 <span class="text-neutral-400">(선택)</span>
					</div>
					<input
						type="text"
						bind:value={department}
						placeholder="예: 의예과"
						maxlength="40"
						class="field w-full"
					/>
				</label>

				<!-- 학년 -->
				<div>
					<div class="text-xs text-neutral-600 mb-1">
						학년 <span class="text-neutral-400">(선택)</span>
					</div>
					<div class="grid grid-cols-4 gap-1.5">
						{#each [1, 2, 3, 4] as y (y)}
							<button
								type="button"
								onclick={() => (year = year === y ? null : (y as Profile['year']))}
								class="pill py-2 text-sm"
								class:pill-active={year === y}
							>
								{y === 4 ? '4+' : y}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="mt-auto pt-8">
				<button onclick={goNext} class="cta cta-fill block w-full py-3 text-center text-sm font-semibold">
					다음 →
				</button>
			</div>
		</section>
	{:else}
		<!-- ===== STEP 2: 캐릭터 선택 ===== -->
		<section class="flex-1 flex flex-col">
			<!-- 미리보기 -->
			<div class="hero relative border-b-2 border-black overflow-hidden" style="height: 180px;">
				<div class="absolute top-1.5 left-1.5 text-[9px] tracking-widest text-white px-1.5 py-0.5" style="background:#111;">
					PREVIEW
				</div>
				<div class="absolute left-0 right-0" style="bottom: 24px; border-top: 1.5px dashed #555;"></div>

				<pre
					class="absolute left-1/2 -translate-x-1/2 text-[12px] leading-[1.15] m-0"
					style="bottom: 28px;"
				>{CHARACTERS[character].art}</pre>

				<div class="absolute bottom-1 left-0 right-0 text-center text-[9px] tracking-widest text-neutral-500 uppercase">
					{CHARACTERS[character].name}
				</div>
			</div>

			<div class="flex-1 flex flex-col px-5 py-5">
				<h1 class="text-lg font-bold">캐릭터 선택</h1>
				<p class="text-xs text-neutral-500 mt-1">언제든지 설정에서 바꿀 수 있어요.</p>

				<div class="mt-4 grid grid-cols-4 gap-2">
					{#each CHARACTERS as char, i (i)}
						<button
							type="button"
							onclick={() => (character = i as Profile['character'])}
							class="char-card relative aspect-square flex items-center justify-center"
							class:char-active={character === i}
						>
							<pre class="text-[9px] leading-[1.15] m-0">{char.art}</pre>
						</button>
					{/each}
				</div>

				<div class="mt-3 text-xs text-neutral-600">
					선택: <span class="font-semibold text-neutral-900">{CHARACTERS[character].name}</span>
				</div>

				<div class="mt-auto pt-8">
					<button
						onclick={enterCampus}
						class="cta cta-fill block w-full py-3 text-center text-sm font-semibold"
					>
						▶ 캠퍼스로 입장
					</button>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.field {
		border: 1.5px solid #111;
		background: #fff;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 13px;
		outline: none;
	}
	.field::placeholder {
		color: #aaa;
	}
	.field:focus {
		box-shadow: 2px 2px 0 #111;
		transform: translate(-1px, -1px);
	}
	.field-error {
		border-color: #e11d48;
	}

	.pill {
		border: 1.5px solid #111;
		background: #fff;
		color: #111;
		font-weight: 600;
	}
	.pill-active {
		background: #111;
		color: #fff;
	}

	.char-card {
		border: 1.5px solid #111;
		background: #fff;
		transition: transform 0.08s, box-shadow 0.08s;
	}
	.char-card:hover {
		box-shadow: 2px 2px 0 #111;
	}
	.char-active {
		background: #111;
		color: #fff;
		box-shadow: 3px 3px 0 #111;
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
</style>
