<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { type LectureTerm, type LectureClassifiedPart } from '$lib/data/lectures';
	import { resolveLecture } from '$lib/stores/generated-lectures.svelte';
	import { morphemeById } from '$lib/data/morphemes';
	import { terms as allTerms } from '$lib/data/terms';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const lec = $derived(page.params.id ? resolveLecture(page.params.id) : undefined);

	type Bucket = 'inNet' | 'autoMerge' | 'pending' | 'blocked';
	const BUCKET_META: Record<Bucket, { label: string; icon: 'check' | 'plus' | 'search' | 'hand'; tint: string; ink: string; desc: string }> = {
		inNet:     { label: '기존 그물에 있음',     icon: 'check',  tint: '#e9f6ef', ink: '#1f7a44', desc: '이미 학습 가능한 어근만으로 읽힘 — 학습 큐에 자연 노출' },
		autoMerge: { label: '자동 합류',           icon: 'plus',   tint: '#eef4ff', ink: '#1e40af', desc: '모든 어근이 검수 완료 — 사람 손 없이 그물 합류' },
		pending:   { label: '검수 대기',           icon: 'search', tint: '#fef3c7', ink: '#92400e', desc: '새 어근이 NBK 출처에서 발견됨 — 검수자 OK 후 합류' },
		blocked:   { label: '검수자 결정 필요',     icon: 'hand',   tint: '#fee2e2', ink: '#991b1b', desc: '어근이 어디에도 없음 — 출처 보강 또는 스킵' }
	};

	function bucketOf(t: LectureTerm): Bucket {
		if (t.already_in_terms) return 'inNet';
		if (t.all_parts_verified) return 'autoMerge';
		if (t.needs_curator) return 'blocked';
		return 'pending';
	}

	// 영어 term → terms.ts 의 한국어 정보 (있을 때만).
	const termInfoByLabel = $derived(
		new Map(allTerms.map((t) => [t.term.toLowerCase(), t]))
	);

	const grouped = $derived.by(() => {
		const out: Record<Bucket, LectureTerm[]> = { inNet: [], autoMerge: [], pending: [], blocked: [] };
		if (!lec) return out;
		for (const t of lec.set.terms) out[bucketOf(t)].push(t);
		return out;
	});

	function chipClass(p: LectureClassifiedPart): string {
		return `chip chip--${p.status}`;
	}

	function chipTitle(p: LectureClassifiedPart): string {
		if (p.status === 'verified') {
			const m = morphemeById[p.id];
			return m ? `${m.form} · ${m.meaningKo}` : p.id;
		}
		if (p.status === 'candidate') return `${p.meaning || p.id} · 후보 (출처: ${p.source || 'nbk-ch1'})`;
		if (p.status === 'unverified-with-source') {
			// RAG 검색이면 인용·유사도를, 정확매칭 폴백이면 기존 라벨.
			if (p.citation) {
				const sim = p.similarity != null ? ` · 유사도 ${(p.similarity * 100).toFixed(0)}%` : '';
				return `${p.citation}${sim}`;
			}
			return `${p.nbkMeaning || p.id} · ${p.source || 'NBK'} 출처 있음`;
		}
		return `${p.id} · 출처 없음`;
	}

	function back() {
		// 강의 목록(/lectures)으로 명시적으로. history.back()은 새로고침/직접 진입 시 어디로 갈지 불확실.
		goto('/lectures');
	}
</script>

<div class="page">
	<header class="app-bar">
		<button class="app-bar__btn" onclick={back} aria-label="뒤로"><Icon name="back" size={20} /></button>
		<div class="app-bar__title">내 강의자료</div>
		<div style="width:36px"></div>
	</header>

	{#if !lec}
		<div class="empty">
			<div>강의를 찾을 수 없습니다.</div>
			<button class="pill-btn pill-btn--ghost" onclick={() => goto('/campus')}>캠퍼스로</button>
		</div>
	{:else}
		<div class="scroll">
			<!-- 헤로 -->
			<section class="hero card">
				<div class="hero-h">
					<div class="hero-ic"><Icon name="book" size={22} /></div>
					<div class="hero-meta">
						<h1 class="hero-title">{lec.set.fixture.title}</h1>
						<div class="hero-sub">강의자료 수확 결과 · {lec.set._meta.generated}</div>
					</div>
				</div>
				<div class="metrics">
					<div class="metric"><b>{lec.set.eval.counts.extracted}</b><span>추출 용어</span></div>
					<div class="metric"><b>{lec.set.eval.counts.already_in_terms + lec.set.eval.counts.auto_mergeable}</b><span>그물 합류</span></div>
					<div class="metric"><b>{lec.set.eval.counts.after_candidate_promotion + lec.set.eval.counts.blocked_on_curator}</b><span>검수 대기</span></div>
				</div>
			</section>

			<!-- 강의 발췌 -->
			<details class="excerpt card">
				<summary>강의 본문 발췌 보기</summary>
				<pre class="excerpt-body">{lec.set.fixture.body}</pre>
			</details>

			<!-- 4 buckets -->
			{#each ['inNet', 'autoMerge', 'pending', 'blocked'] as bk (bk)}
				{@const meta = BUCKET_META[bk as Bucket]}
				{@const list = grouped[bk as Bucket]}
				{#if list.length > 0}
					<section class="bucket">
						<header class="bk-head">
							<span class="bk-ic" style="background:{meta.tint};color:{meta.ink}"><Icon name={meta.icon} size={14} /></span>
							<span class="bk-title">{meta.label}</span>
							<span class="bk-n">{list.length}</span>
						</header>
						<p class="bk-desc">{meta.desc}</p>
						<div class="term-list">
							{#each list as t (t.term)}
								{@const info = termInfoByLabel.get(t.term.toLowerCase())}
								<div class="term card">
									<div class="term-h">
										<span class="term-en">{t.term}</span>
										{#if info}<span class="term-ko">{info.korean}</span>{/if}
									</div>
									<div class="chips">
										{#each t.classified as p, i (p.id + '-' + i)}
											{#if i > 0}<span class="plus">+</span>{/if}
											<span class={chipClass(p)} title={chipTitle(p)}>
												<span class="chip-id">{p.id}</span>
												{#if p.status === 'verified' && morphemeById[p.id]}
													<span class="chip-ko">{morphemeById[p.id].meaningKo}</span>
												{:else if p.status === 'candidate'}
													<span class="chip-ko">{p.meaning || '후보'}</span>
												{:else if p.status === 'unverified-with-source'}
													<span class="chip-ko">{p.nbkMeaning || 'NBK'}{#if p.similarity != null} · {(p.similarity * 100).toFixed(0)}%{/if}</span>
												{:else}
													<span class="chip-ko">출처 없음</span>
												{/if}
											</span>
										{/each}
									</div>
									{#if info}
										<div class="term-def">{info.definitionKo}</div>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}
			{/each}

			<!-- eval (작게, 발표용 메트릭) -->
			<section class="eval card">
				<div class="eval-h">에이전트 평가 (evaluation)</div>
				<div class="eval-grid">
					<div><b>{(lec.set.eval.extraction_precision * 100).toFixed(0)}%</b><span>추출 precision</span></div>
					<div><b>{(lec.set.eval.extraction_recall * 100).toFixed(0)}%</b><span>추출 recall</span></div>
					<div><b>{(lec.set.eval.decomposition_coverage * 100).toFixed(0)}%</b><span>분해 커버리지</span></div>
					<div><b>{(lec.set.eval.citation_coverage * 100).toFixed(0)}%</b><span>citation 커버리지</span></div>
				</div>
				<div class="eval-note">{lec.set._meta.pipeline}</div>
				{#if lec.set._meta.retrieval}
					<div class="eval-note">③ 출처대조: {lec.set._meta.retrieval}</div>
				{/if}
			</section>

			<div class="bottom-space"></div>
		</div>
	{/if}

	<BottomNav active="campus" />
</div>

<style>
	.page { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
	.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 16px 0; }

	.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--mut); }

	/* 헤로 */
	.hero { padding: 16px; }
	.hero-h { display: flex; align-items: center; gap: 12px; }
	.hero-ic { width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center; background: #eef4ff; color: #3b6dd0; border-radius: 13px; }
	.hero-meta { flex: 1; min-width: 0; }
	.hero-title { font-size: 17px; font-weight: 800; line-height: 1.25; margin: 0; }
	.hero-sub { font-size: 11.5px; color: var(--mut); margin-top: 2px; }
	.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 14px; }
	.metric { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; background: var(--card); border-radius: var(--r-sm); }
	.metric b { font-size: 18px; font-weight: 800; }
	.metric span { font-size: 10.5px; color: var(--mut); }

	/* 강의 발췌 */
	.excerpt { margin-top: 12px; padding: 0; }
	.excerpt summary { padding: 14px; font-size: 13px; font-weight: 700; cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; }
	.excerpt summary::after { content: '▾'; font-size: 11px; color: var(--mut); }
	.excerpt[open] summary { border-bottom: 1px solid var(--line); }
	.excerpt-body { padding: 14px; margin: 0; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; color: var(--ink-2); font-family: inherit; }

	/* bucket */
	.bucket { margin-top: 22px; }
	.bk-head { display: flex; align-items: center; gap: 8px; padding: 0 2px; }
	.bk-ic { width: 22px; height: 22px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex: none; }
	.bk-title { font-size: 14.5px; font-weight: 800; }
	.bk-n { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--mut); }
	.bk-desc { font-size: 11.5px; color: var(--mut); margin: 4px 2px 10px; }

	/* term card */
	.term-list { display: flex; flex-direction: column; gap: 8px; }
	.term { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
	.term-h { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
	.term-en { font-size: 15px; font-weight: 800; }
	.term-ko { font-size: 12.5px; color: var(--brand-d); font-weight: 600; }
	.term-def { font-size: 12px; line-height: 1.5; color: var(--mut); }

	/* chips */
	.chips { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
	.plus { color: var(--mut); font-size: 11px; font-weight: 700; padding: 0 1px; }
	.chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid transparent; }
	.chip-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
	.chip-ko { font-weight: 600; opacity: 0.85; }
	.chip--verified { background: #e9f6ef; color: #1f7a44; border-color: #c8ead4; }
	.chip--candidate { background: #fef3c7; color: #92400e; border-color: #fde68a; }
	.chip--unverified-with-source { background: #fef3c7; color: #92400e; border-color: #fde68a; }
	.chip--unverified-no-source { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

	/* eval */
	.eval { margin-top: 22px; padding: 14px; }
	.eval-h { font-size: 13px; font-weight: 800; margin-bottom: 10px; }
	.eval-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
	.eval-grid div { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 4px; background: var(--card); border-radius: var(--r-sm); }
	.eval-grid b { font-size: 15px; font-weight: 800; }
	.eval-grid span { font-size: 10px; color: var(--mut); text-align: center; }
	.eval-note { margin-top: 10px; font-size: 11px; color: var(--mut); line-height: 1.5; }

	.bottom-space { height: 16px; }
</style>
