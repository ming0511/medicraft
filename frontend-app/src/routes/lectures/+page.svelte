<script lang="ts">
	import { goto } from '$app/navigation';
	import { lectures, type Lecture } from '$lib/data/lectures';
	import { generatedLectures, addGeneratedLecture, removeGeneratedLecture, hiddenBuiltinIds, hideBuiltinLecture } from '$lib/stores/generated-lectures.svelte';
	import { selectedEngine, setSelectedEngine, engineParam, freeRemaining, canExtract, recordExtract, FREE_EXTRACTS, type SelectedEngine } from '$lib/stores/lecture-engine.svelte';
	import { saveScope } from '$lib/stores/scope';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 실제 추출 모드(서버 env 기준)에 맞춘 입력창 안내 문구.
	const EXTRACT_NOTE: Record<PageData['extractMode'], string> = {
		deterministic: '이미 익힌 어근으로 강의 속 용어를 찾아 바로 분해해요. AI 호출 없이 빠르게 동작합니다.',
		gemini: 'Gemini AI가 강의에서 의학용어를 뽑아 어근으로 분해해요. 처음 보는 어근까지 인식합니다. (텍스트가 Google로 전송돼요)',
		claude: 'Claude AI가 강의에서 의학용어를 뽑아 어근으로 분해해요. 처음 보는 어근까지 인식합니다.'
	};

	// 지금 적용될 엔진: 선택값이 가용하면 그것, 아니면 기본(결정적, LLM 없음)으로 폴백.
	const activeEngineId = $derived.by(() => {
		const sel = selectedEngine();
		if (sel === 'deterministic') return 'deterministic';
		const e = data.engines.find((x) => x.id === sel);
		return e && e.available ? e.id : 'deterministic';
	});
	const activeEngine = $derived(data.engines.find((e) => e.id === activeEngineId) ?? null);
	const engineChoice = $derived(selectedEngine());
	function pickEngine(id: SelectedEngine) {
		setSelectedEngine(id);
	}
	// 서버 일일 LLM 사용량(로드 시 스냅샷 → 추출 응답으로 갱신).
	let liveUsage = $state<{ used: number; limit: number | null; remaining: number | null } | null>(null);
	const engineUsage = $derived(liveUsage ?? activeEngine?.usage ?? null);
	const remainFree = $derived(freeRemaining());

	type UploadStage = 'idle' | 'processing' | 'done';
	let uploadOpen = $state(false);
	let pasteText = $state('');
	let attachedFile = $state<File | null>(null);
	let stage = $state<UploadStage>('idle');
	let stepIdx = $state(0); // 0~3, 진척 단계
	let errorMsg = $state('');
	let result = $state<Lecture | null>(null);
	let stepTimer: ReturnType<typeof setInterval> | null = null;

	// 사용자가 추출해 모은 강의 + 내장 강의.
	const myLectures = $derived(generatedLectures());
	const hidden = $derived(hiddenBuiltinIds());
	const allLectures = $derived<{ lec: Lecture; gen: boolean }[]>([
		...myLectures.map((lec) => ({ lec, gen: true })),
		...lectures.filter((lec) => !hidden.includes(lec.id)).map((lec) => ({ lec, gen: false }))
	]);

	const STEPS = [
		{ icon: 'book' as const, label: '용어 추출 중...', detail: '강의 텍스트에서 영어 의학용어 식별' },
		{ icon: 'puzzle' as const, label: '어근 분해 중...', detail: '용어를 어원 조각으로 쪼개기' },
		{ icon: 'search' as const, label: 'NBK 출처 대조 중...', detail: '신뢰 출처와 매칭, citation 부착' }
	];

	const PLACEHOLDER = `예시:\n\nThis week we cover several disorders of the heart and vascular system. The most common arrhythmia in our ED is tachycardia...`;

	function openUpload() {
		pasteText = '';
		attachedFile = null;
		stage = 'idle';
		stepIdx = 0;
		errorMsg = '';
		result = null;
		uploadOpen = true;
	}

	function closeUpload() {
		if (stage === 'processing') return; // 처리 중 닫기 방지
		if (stepTimer) clearInterval(stepTimer);
		uploadOpen = false;
		pasteText = '';
		attachedFile = null;
		stage = 'idle';
		stepIdx = 0;
		errorMsg = '';
		result = null;
	}

	function handleFilePick(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		attachedFile = file; // PDF/TXT/MD — 서버가 텍스트 추출
		input.value = ''; // 같은 파일 다시 선택 가능하게
	}

	function clearFile() {
		attachedFile = null;
	}

	function fmtSize(bytes: number): string {
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
	}

	const hasInput = $derived(pasteText.trim().length > 0 || attachedFile !== null);

	async function handleUpload() {
		if (!hasInput || stage === 'processing') return;
		if (!canExtract()) {
			errorMsg = `무료 추출 ${FREE_EXTRACTS}회를 모두 사용했어요. 프로로 업그레이드하면 계속 추출할 수 있어요.`;
			return;
		}
		errorMsg = '';
		stage = 'processing';
		stepIdx = 0;
		// 실제 처리는 비동기 — 진척 단계를 한 번만 0→1→2 진행하고 마지막에서 멈춤(순환 안 함).
		stepTimer = setInterval(() => {
			if (stepIdx < STEPS.length - 1) {
				stepIdx += 1;
			} else if (stepTimer) {
				clearInterval(stepTimer);
				stepTimer = null;
			}
		}, 650);

		const fd = new FormData();
		if (attachedFile) fd.append('file', attachedFile);
		else fd.append('text', pasteText);
		const eng = engineParam();
		if (eng) fd.append('engine', eng);

		try {
			const res = await fetch('/api/lectures/extract', { method: 'POST', body: fd });
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: '' }));
				throw new Error(err?.message || `요청 실패 (${res.status})`);
			}
			const data = await res.json();
			const lec: Lecture = {
				id: data.suggestedId,
				shortLabel: data.shortLabel,
				system: data.system,
				set: data.set
			};
			addGeneratedLecture(lec);
			recordExtract(); // 무료 잔여 1 감소
			if (data.usage) liveUsage = data.usage; // 서버 일일 LLM 사용량 갱신
			result = lec;
			if (stepTimer) clearInterval(stepTimer);
			stepIdx = STEPS.length;
			stage = 'done';
		} catch (e) {
			if (stepTimer) clearInterval(stepTimer);
			errorMsg = (e as Error).message;
			stage = 'idle';
		}
	}

	const resultLecture = $derived(result);

	function viewResult() {
		const id = result?.id;
		closeUpload();
		if (id) goto(`/lectures/${id}`);
	}

	function startLearning() {
		const id = result?.id;
		closeUpload();
		// 강의 추출은 연습 화면을 직접 갖지 않는다 — 이 강의를 활성 범위로 잡고
		// 캠퍼스로 보내면 거기서 강의실·도서관(범위 따라 라우팅)으로 연습한다.
		if (id) {
			saveScope({ kind: 'lecture', lectureId: id });
			goto('/campus');
		}
	}

	function deleteLecture(e: MouseEvent, id: string, gen: boolean) {
		e.stopPropagation();
		const msg = gen ? '이 강의를 삭제할까요?' : '이 내장 강의를 목록에서 숨길까요?';
		if (!confirm(msg)) return;
		if (gen) removeGeneratedLecture(id);
		else hideBuiltinLecture(id);
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={() => goto('/campus')} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">내 강의자료</div>
		<div style="width:36px"></div>
	</header>

	<div class="scroll">
		<!-- 추가 진입점 -->
		<button class="add card" class:add--empty={remainFree === 0} onclick={openUpload}>
			<span class="add-ic"><Icon name="plus" size={22} /></span>
			<span class="add-tx">
				<span class="add-name">강의자료 추가</span>
				<span class="add-desc">텍스트 붙여넣기 → 의학용어 추출 + 어원 분해</span>
			</span>
			<span class="add-quota" class:add-quota--empty={remainFree === 0}>
				<span class="add-quota-dots">
					{#each Array(FREE_EXTRACTS) as _, i (i)}
						<span class="add-quota-dot" class:on={i < remainFree}></span>
					{/each}
				</span>
				<span class="add-quota-tx">
					{#if remainFree === 0}무료 소진{:else}무료 {remainFree}/{FREE_EXTRACTS}회{/if}
				</span>
			</span>
		</button>

		<!-- 강의 목록 -->
		<div class="sec-h">강의 목록 ({allLectures.length})</div>
		<div class="lec-list">
			{#each allLectures as { lec, gen } (lec.id)}
				{@const c = lec.set.eval.counts}
				{@const newUnlocked = c.already_in_terms + c.auto_mergeable}
				{@const pending = c.after_candidate_promotion + c.blocked_on_curator}
				<div class="lec card">
					<button class="lec-body" onclick={() => goto(`/lectures/${lec.id}`)}>
						<span class="lec-ic"><Icon name="book" size={20} /></span>
						<span class="lec-tx">
							<span class="lec-top">
								<b>{lec.set.fixture.title}</b>
								{#if gen}<span class="ls-chip ls-mine">내 자료</span>{/if}
							</span>
							<span class="lec-stats">
								<span class="ls-chip"><Icon name="puzzle" size={11} /> 어근 그물에 {newUnlocked}개 합류</span>
								{#if pending > 0}<span class="ls-chip ls-pending"><Icon name="hand" size={11} /> 검수 대기 {pending}</span>{/if}
							</span>
							<span class="lec-cap">{c.extracted}개 용어 추출됨 · {lec.set._meta.generated}</span>
						</span>
						<span class="lec-go"><Icon name="arrowRight" size={18} /></span>
					</button>
					<button class="lec-del" onclick={(e) => deleteLecture(e, lec.id, gen)} aria-label={gen ? '삭제' : '숨기기'}>
						<Icon name="x" size={15} />
					</button>
				</div>
			{/each}
		</div>
		<div class="bottom-space"></div>
	</div>

	<!-- 업로드 모달 -->
	{#if uploadOpen}
		<div
			class="modal-bg"
			role="presentation"
			onclick={closeUpload}
			onkeydown={(e) => { if (e.key === 'Escape') closeUpload(); }}
		>
			<div
				class="modal"
				role="dialog"
				aria-modal="true"
				aria-label="강의자료 추가"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<div class="m-head">
					<h2 class="m-title">
						{#if stage === 'idle'}강의자료 추가
						{:else if stage === 'processing'}에이전트가 처리 중
						{:else}처리 완료{/if}
					</h2>
					{#if stage !== 'processing'}
						<button class="m-close" onclick={closeUpload} aria-label="닫기"><Icon name="x" size={18} /></button>
					{/if}
				</div>

				{#if stage === 'idle'}
					<p class="m-help">
						PDF/텍스트 파일을 올리거나 강의 노트를 직접 붙여넣으세요. 에이전트가 의학용어를 추출하고 어원으로 쪼개 어근 그물에 합류시킵니다.
					</p>

					<!-- 파일 첨부 -->
					{#if attachedFile}
						<div class="file-chip">
							<Icon name="book" size={16} />
							<span class="file-tx">
								<span class="file-name">{attachedFile.name}</span>
								<span class="file-meta">{fmtSize(attachedFile.size)}</span>
							</span>
							<button class="file-x" onclick={clearFile} aria-label="파일 제거"><Icon name="x" size={14} /></button>
						</div>
					{:else}
						<label class="file-pick">
							<input
								type="file"
								accept=".pdf,.txt,.md,text/plain,application/pdf"
								onchange={handleFilePick}
								class="file-input"
							/>
							<span class="file-pick-ic"><Icon name="plus" size={18} /></span>
							<span class="file-pick-tx">
								<b>파일 선택</b>
								<em>PDF · TXT · MD</em>
							</span>
						</label>
					{/if}

					<div class="or-row"><span>또는 직접 붙여넣기</span></div>

					<textarea
						class="m-paste"
						placeholder={PLACEHOLDER}
						bind:value={pasteText}
						rows="6"
					></textarea>

					<!-- 추출 엔진(LLM 설정) — 업로드 직전에 고른다 -->
					<div class="eng-pick">
						<label class="eng-pick-h" for="eng-select"><Icon name="sparkles" size={13} /> 추출 엔진</label>
						<div class="eng-select-wrap">
							<select
								id="eng-select"
								class="eng-select"
								value={engineChoice}
								onchange={(e) => pickEngine(e.currentTarget.value as SelectedEngine)}
							>
								{#each data.engines as e (e.id)}
									<option value={e.id} disabled={!e.available}>
										{e.label}{e.free ? ' · 무료' : ' · 유료'}{e.id === 'deterministic' ? ' · 기본' : ''}{!e.available ? ' (키 없음)' : ''}
									</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="m-note">
						<Icon name="lightbulb" size={14} />
						{EXTRACT_NOTE[activeEngineId]}
					</div>

					<!-- 사용량: 무료 추출 잔여(기기) + 외부 AI 일일 잔여(서버) -->
					<div class="usage" class:usage--empty={remainFree === 0}>
						<div class="usage-row">
							<span class="usage-k"><Icon name="ticket" size={13} /> 무료 추출</span>
							<span class="usage-v">
								<span class="dots">
									{#each Array(FREE_EXTRACTS) as _, i (i)}
										<span class="dot" class:on={i < remainFree}></span>
									{/each}
								</span>
								<b>{remainFree}/{FREE_EXTRACTS}</b> 남음
							</span>
						</div>
						<div class="usage-row">
							<span class="usage-k"><Icon name="sparkles" size={13} /> {activeEngine?.label ?? '엔진'}</span>
							<span class="usage-v">
								{#if engineUsage && engineUsage.limit != null}
									오늘 <b>{engineUsage.remaining}</b>/{engineUsage.limit}회 가능
								{:else if activeEngineId === 'deterministic'}
									외부 호출 0 · 무제한
								{:else}
									호출당 과금 · 한도 없음
								{/if}
							</span>
						</div>
											</div>

					{#if errorMsg}
						<div class="m-error"><Icon name="x" size={14} /> {errorMsg}</div>
					{/if}
					<div class="m-actions">
						<button class="pill-btn pill-btn--ghost" onclick={closeUpload}>취소</button>
						<button class="pill-btn pill-btn--primary" onclick={handleUpload} disabled={!hasInput || remainFree === 0}>
							{remainFree === 0 ? '무료 횟수 소진' : '추출하기'}
						</button>
					</div>
				{:else if stage === 'processing'}
					<div class="m-steps">
						{#each STEPS as s, i (i)}
							{@const status = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'}
							<div class="step step--{status}">
								<span class="step-mark">
									{#if status === 'done'}<Icon name="check" size={14} />
									{:else if status === 'active'}<span class="dot-spin"></span>
									{:else}<Icon name={s.icon} size={14} />{/if}
								</span>
								<span class="step-tx">
									<span class="step-label">{s.label}</span>
									<span class="step-detail">{s.detail}</span>
								</span>
							</div>
						{/each}
					</div>
				{:else if resultLecture}
					<!-- done — 결과 요약 -->
					{@const ev = resultLecture.set.eval}
					{@const c = ev.counts}
					<div class="m-result">
						<div class="m-result-h">
							<div class="m-result-ic"><Icon name="check" size={20} /></div>
							<div>
								<div class="m-result-title">{resultLecture.set.fixture.title}</div>
								<div class="m-result-sub">{c.extracted}개 용어 추출 · {resultLecture.set._meta.llm_runtime}</div>
								{#if resultLecture.set._meta.retrieval}<div class="m-result-sub">출처대조: {resultLecture.set._meta.retrieval}</div>{/if}
							</div>
						</div>
						<div class="m-result-grid">
							<div><b>{c.already_in_terms + c.auto_mergeable}</b><span>그물 합류</span></div>
							<div><b>{c.after_candidate_promotion}</b><span>후보 머지</span></div>
							<div><b>{c.blocked_on_curator}</b><span>검수자 결정</span></div>
						</div>
						<div class="m-eval">
							<span>분해 커버리지 <b>{Math.round(ev.decomposition_coverage * 100)}%</b></span>
							<span>출처 대조 <b>{Math.round(ev.citation_coverage * 100)}%</b></span>
						</div>
					</div>
					{#if c.extracted === 0}
						<div class="m-note">
							<Icon name="lightbulb" size={14} />
							아는 어근으로 분해되는 용어를 못 찾았어요. 의학용어가 많은 텍스트로 다시 시도하거나 LLM 모드를 켜보세요.
						</div>
					{/if}
					<div class="m-actions">
						<button class="pill-btn pill-btn--ghost" onclick={viewResult}>결과 보기</button>
						<button class="pill-btn pill-btn--primary" onclick={startLearning} disabled={c.extracted === 0}>이 범위로 학습</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<BottomNav active="campus" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 16px 0; }

	/* 추가 진입 */
	.add { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 16px; border: 2px dashed var(--brand); background: var(--brand-l); transition: transform 0.08s; }
	.add:active { transform: scale(0.99); }
	.add--empty { border-color: #fca5a5; background: #fef2f2; }
	.add-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: #fff; color: var(--brand-d); border-radius: 13px; }
	.add--empty .add-ic { color: #b91c1c; }
	.add-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
	.add-name { font-size: 15px; font-weight: 800; color: var(--brand-d); }
	.add--empty .add-name { color: #b91c1c; }
	.add-desc { font-size: 11.5px; color: var(--ink-2); }

	/* 무료 추출 잔여 뱃지 (목록 화면에 항상 노출) */
	.add-quota { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
	.add-quota-dots { display: inline-flex; gap: 3px; }
	.add-quota-dot { width: 7px; height: 7px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 1.5px var(--brand); }
	.add-quota-dot.on { background: var(--brand); box-shadow: none; }
	.add-quota--empty .add-quota-dot { box-shadow: inset 0 0 0 1.5px #fca5a5; background: #fff; }
	.add-quota-tx { font-size: 10px; font-weight: 800; color: var(--brand-d); white-space: nowrap; }
	.add-quota--empty .add-quota-tx { color: #b91c1c; }

	.sec-h { margin: 22px 2px 10px; font-size: 14.5px; font-weight: 800; }

	/* 강의 카드 */
	.lec-list { display: flex; flex-direction: column; gap: 10px; }
	.lec { padding: 0; overflow: hidden; display: flex; align-items: stretch; }
	.lec-body { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; text-align: left; padding: 14px; background: transparent; border: none; cursor: pointer; transition: transform 0.08s; }
	.lec-body:active { transform: scale(0.99); }
	.lec-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: #eef4ff; color: #3b6dd0; border-radius: 13px; }
	.lec-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
	.lec-top b { font-size: 15px; font-weight: 800; }
	.lec-stats { display: flex; flex-wrap: wrap; gap: 5px; }
	.ls-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; color: var(--brand-d); background: var(--brand-l); border-radius: 999px; padding: 2px 8px; }
	.ls-chip.ls-pending { color: #b45309; background: #fef3c7; }
	.lec-cap { font-size: 11.5px; color: var(--mut); }
	.lec-go { color: var(--mut); flex: none; display: flex; }

	.lec-del { flex: 0 0 46px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-left: 1px solid var(--line); color: var(--mut); cursor: pointer; transition: background 0.12s, color 0.12s; }
	.lec-del:hover { background: #fef2f2; color: #b91c1c; }
	.lec-del:active { background: #fef2f2; transform: scale(0.97); }

	.bottom-space { height: 16px; }

	/* 모달 */
	.modal-bg { position: absolute; inset: 0; background: rgba(20, 30, 24, 0.18); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 80; animation: fade 0.16s ease-out; }
	@keyframes fade { from { opacity: 0; } }
	.modal { width: 100%; max-width: 380px; background: #fff; border-radius: 22px; padding: 22px; box-shadow: 0 12px 40px rgba(20, 30, 24, 0.18); animation: pop 0.18s ease-out; }
	@keyframes pop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
	.m-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
	.m-title { font-size: 18px; font-weight: 800; }
	.m-close { background: transparent; padding: 4px; color: var(--mut); }
	.m-help { font-size: 12.5px; color: var(--mut); line-height: 1.5; margin: 0 0 12px; }

	/* 파일 선택 */
	.file-pick { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1.5px dashed var(--line); border-radius: 12px; cursor: pointer; transition: border-color 0.12s, background 0.12s; }
	.file-pick:hover { border-color: var(--brand); background: var(--brand-l); }
	.file-input { display: none; }
	.file-pick-ic { width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center; background: var(--card); color: var(--brand-d); border-radius: 10px; }
	.file-pick-tx { flex: 1; display: flex; flex-direction: column; gap: 1px; }
	.file-pick-tx b { font-size: 13.5px; font-weight: 800; color: var(--ink); }
	.file-pick-tx em { font-style: normal; font-size: 11px; color: var(--mut); }
	.file-chip { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--brand-l); border: 1.5px solid var(--brand); border-radius: 12px; color: var(--brand-d); }
	.file-chip > :global(.lucide-icon) { flex: none; }
	.file-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
	.file-name { font-size: 13px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.file-meta { font-size: 11px; opacity: 0.7; }
	.file-x { flex: none; background: transparent; border: none; color: var(--brand-d); padding: 4px; border-radius: 6px; cursor: pointer; }
	.file-x:hover { background: rgba(0,0,0,0.06); }

	.or-row { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; }
	.or-row::before, .or-row::after { content: ''; flex: 1; height: 1px; background: var(--line); }
	.or-row span { font-size: 11px; color: var(--mut); font-weight: 600; }

	.m-paste { width: 100%; padding: 12px; font: inherit; font-size: 12.5px; line-height: 1.5; border: 1.5px solid var(--line); border-radius: 12px; resize: vertical; min-height: 100px; box-sizing: border-box; }
	.m-paste:focus { outline: none; border-color: var(--brand); }
	.m-paste:disabled { background: var(--card); }
	.m-note { display: flex; align-items: flex-start; gap: 6px; margin-top: 12px; padding: 10px 12px; background: #fef9e7; color: #92400e; font-size: 11.5px; border-radius: 10px; line-height: 1.5; }
	.m-error { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding: 10px 12px; background: #fef2f2; color: #b91c1c; font-size: 12px; border-radius: 10px; }

	/* 사용량 스트립 */
	.usage { margin-top: 10px; padding: 11px 12px; border: 1.5px solid var(--line); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
	.usage--empty { border-color: #fca5a5; background: #fef2f2; }
	.usage-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
	.usage-k { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--ink-2); }
	.usage-v { display: inline-flex; align-items: center; gap: 6px; color: var(--mut); font-size: 11.5px; }
	.usage-v b { color: var(--ink); font-weight: 800; }
	.dots { display: inline-flex; gap: 3px; }
	.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
	.dot.on { background: var(--brand); }
	/* 추출 엔진 선택 드롭다운 */
	.eng-pick { margin-top: 12px; display: flex; flex-direction: column; gap: 7px; }
	.eng-pick-h { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 800; color: var(--ink-2); }
	.eng-select-wrap { position: relative; display: block; }
	.eng-select { width: 100%; appearance: none; -webkit-appearance: none; padding: 11px 36px 11px 12px; border: 1.5px solid var(--line); border-radius: 12px; background: #fff; font: inherit; font-size: 13px; font-weight: 700; color: var(--ink); cursor: pointer; }
	.eng-select:focus { outline: none; border-color: var(--brand); }
	.eng-select-wrap::after { content: ''; position: absolute; right: 14px; top: 50%; width: 7px; height: 7px; border-right: 2px solid var(--mut); border-bottom: 2px solid var(--mut); transform: translateY(-65%) rotate(45deg); pointer-events: none; }
	.ls-chip.ls-mine { color: #3b6dd0; background: #eef4ff; }
	.m-eval { display: flex; gap: 14px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); font-size: 11.5px; color: var(--mut); }
	.m-eval b { color: var(--brand-d); }
	.m-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }

	/* processing — 3단계 진척 */
	.m-steps { display: flex; flex-direction: column; gap: 12px; margin: 6px 0 4px; }
	.step { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; transition: background 0.2s, opacity 0.2s; }
	.step--pending { opacity: 0.45; }
	.step--active { background: var(--brand-l); animation: stpop 0.18s ease-out; }
	.step--done { opacity: 0.7; }
	@keyframes stpop { from { transform: translateY(-2px); opacity: 0; } }
	.step-mark { width: 28px; height: 28px; flex: none; border-radius: 50%; background: #fff; border: 1.5px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--mut); }
	.step--active .step-mark { background: var(--brand); color: #fff; border-color: var(--brand); }
	.step--done .step-mark { background: var(--brand); color: #fff; border-color: var(--brand); }
	.step-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.step-label { font-size: 13px; font-weight: 800; }
	.step-detail { font-size: 11px; color: var(--mut); }
	.dot-spin { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	/* done — 결과 요약 */
	.m-result { background: var(--brand-l); border-radius: 14px; padding: 14px; margin: 4px 0 8px; animation: rfade 0.2s ease-out; }
	@keyframes rfade { from { opacity: 0; transform: translateY(4px); } }
	.m-result-h { display: flex; align-items: center; gap: 10px; }
	.m-result-ic { width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center; background: var(--brand); color: #fff; border-radius: 50%; }
	.m-result-title { font-size: 14px; font-weight: 800; color: var(--brand-d); }
	.m-result-sub { font-size: 12px; color: var(--ink-2); margin-top: 1px; }
	.m-result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 12px; }
	.m-result-grid > div { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 4px; background: #fff; border-radius: 10px; }
	.m-result-grid b { font-size: 16px; font-weight: 800; color: var(--brand-d); }
	.m-result-grid span { font-size: 10.5px; color: var(--mut); text-align: center; }
</style>
