// 강의자료 수확 에이전트 (PoC, 2026-05-26)
// ─────────────────────────────────────────────────────────────────────────────
// PRD §2 row 4 + §3 시나리오 B = "수확 에이전트" 의 첫 vertical slice.
//
// 파이프라인:
//   강의 텍스트 픽스처 (frontmatter에 expected_terms 라벨)
//      ↓ ① 용어 추출 (현재: INLINE_EXTRACTIONS에 하드코딩.
//                    추후 hook: LECTURE_LLM=claude → `claude -p` CLI 호출)
//   영어 의학용어 + 어근 분해
//      ↓ ② 어근 분해 (인라인 — 추출과 한 쌍으로 LLM이 같이 함)
//   {term, parts: morphemeId[]}
//      ↓ ③ NBK RAG 대조 (nbk-ch1-wordparts.json에서 form 매칭)
//   분류된 후보 + citation
//      ↓ eval
//   precision/recall + decomposition coverage + citation coverage + auto-merge rate
//
// 출력: scripts/lecture-set-{fixture}.json
//
// 비용: 0 (런타임 LLM 호출 없음). 발표 데모 = 미리 처리한 결과 시연 (PRD §4 리스크 완화).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ============================================================================
// 1) 데이터 로드
// ============================================================================

function loadFixture(name) {
	const fp = path.join(__dirname, 'lectures', `${name}.md`);
	const raw = fs.readFileSync(fp, 'utf8');
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!m) return { meta: {}, body: raw };
	const meta = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = line.match(/^([\w_]+):\s*(.*)$/);
		if (!kv) continue;
		const [, k, v] = kv;
		if (v.startsWith('[')) {
			try { meta[k] = JSON.parse(v); } catch { meta[k] = v; }
		} else {
			meta[k] = v;
		}
	}
	return { meta, body: m[2] };
}

function loadMorphemes() {
	const ts = fs.readFileSync(path.join(ROOT, 'src/lib/data/morphemes.ts'), 'utf8');
	// morphemes.ts 컨벤션: 한 줄에 morpheme 객체 한 개.
	const re = /\{[^{}\n]*id:\s*'([^']+)'[^{}\n]*type:\s*'(prefix|root|suffix)'[^{}\n]*\}/g;
	const ids = new Set();
	const unverifiedIds = new Set();
	let m;
	while ((m = re.exec(ts))) {
		const line = m[0];
		const id = m[1];
		ids.add(id);
		if (/verified:\s*false/.test(line)) unverifiedIds.add(id);
	}
	return { ids, unverifiedIds };
}

function loadTermLabels() {
	const ts = fs.readFileSync(path.join(ROOT, 'src/lib/data/terms.ts'), 'utf8');
	const labels = new Set();
	const re = /\bterm:\s*'([^']+)'/g;
	let m;
	while ((m = re.exec(ts))) labels.add(m[1].toLowerCase());
	return labels;
}

function loadCandidateMorphemes() {
	const fp = path.join(__dirname, 'candidate-morphemes-draft.json');
	if (!fs.existsSync(fp)) return new Map();
	const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
	return new Map((j.drafts || []).map((d) => [d.id, d]));
}

function loadNBK() {
	return JSON.parse(fs.readFileSync(path.join(__dirname, 'nbk-ch1-wordparts.json'), 'utf8'));
}

// NBK에서 어근 id(surface)에 해당하는 항목 찾기.
// prefix(예: 'hyper-' → 'hyper'), root(예: 'cardi/o' → 'cardi'), suffix(예: '-itis' → 'itis') 모두 처리.
function nbkSearch(nbk, surface) {
	const norm = (s) => String(s).toLowerCase().replace(/[-\/]/g, '').trim();
	const target = norm(surface);
	if (!target) return null;
	for (const bucket of ['prefixes', 'roots', 'suffixes']) {
		for (const e of nbk[bucket] || []) {
			const forms = [e.primary, ...(e.forms || [])].filter(Boolean);
			for (const f of forms) {
				const fn = norm(f);
				// root 결합형: 'cardi/o' → 'cardio' / 'cardi' 둘 다 매칭 시도
				if (fn === target || fn.replace(/o$/, '') === target) {
					return { bucket: bucket.replace(/(es|s)$/, ''), entry: e };
				}
			}
		}
	}
	return null;
}

// ============================================================================
// 2) ① 용어 추출 + ② 어근 분해  (인라인 LLM 출력)
//
// 현재: 이 대화에서 Claude(어시스턴트)가 픽스처 보고 작성한 결과를 하드코딩.
// 추후 hook: process.env.LECTURE_LLM === 'claude' 면 `claude -p` CLI 호출로 교체.
// (LLM 호출 자리만 갈아끼우면 됨 — 출력 스키마는 동일하게 유지)
// ============================================================================

// ① 추출 = 영어 의학용어 후보 리스트 (분해 전)
const INLINE_EXTRACTED = {
	'cardiology-week-3': [
		'arrhythmia', 'tachycardia', 'bradycardia',
		'endocarditis', 'pericarditis',
		'myocardial infarction', 'atherosclerosis', 'cardiomegaly',
		'hypertension', 'angiography',
		'hyperlipidemia', 'hyperglycemia',
		'hepatomegaly', 'cardiologist'
	]
};

// ② 분해 = 각 용어를 morpheme id 배열로 (어근 분해 결과)
const INLINE_DECOMPOSED = {
	'cardiology-week-3': {
		'arrhythmia':            ['a', 'rhythm', 'ia'],
		'tachycardia':           ['tachy', 'cardi', 'ia'],
		'bradycardia':           ['brady', 'cardi', 'ia'],
		'endocarditis':          ['endo', 'cardi', 'itis'],
		'pericarditis':          ['peri', 'cardi', 'itis'],
		'myocardial infarction': ['my', 'cardi', 'al', 'infarction'],
		'atherosclerosis':       ['ather', 'scler', 'osis'],
		'cardiomegaly':          ['cardi', 'megaly'],
		'hypertension':          ['hyper', 'tension'],          // tension = NBK 미수록 (영어 일반명사)
		'angiography':           ['angi', 'graphy'],
		'hyperlipidemia':        ['hyper', 'lipid', 'emia'],    // lipid = NBK는 lip/o, 분해 선택의 문제
		'hyperglycemia':         ['hyper', 'glyc', 'emia'],     // glyc = 후보풀(NBK 출처)
		'hepatomegaly':          ['hepat', 'megaly'],           // 모두 검수됨, terms.ts에 없음 → 즉시 합류
		'cardiologist':          ['cardi', 'logist']            // logist = 후보풀(NBK 출처)
	}
};

async function extractTerms(fixtureName /* , body */) {
	if (process.env.LECTURE_LLM === 'claude') {
		throw new Error('LECTURE_LLM=claude hook not yet wired up. (Plan: shell out to `claude -p "..."` with the extraction system prompt.)');
	}
	if (!INLINE_EXTRACTED[fixtureName]) {
		throw new Error(`No inline extraction for "${fixtureName}". Add to INLINE_EXTRACTED or set LECTURE_LLM=claude.`);
	}
	return INLINE_EXTRACTED[fixtureName];
}

async function decomposeTerms(fixtureName, terms) {
	if (process.env.LECTURE_LLM === 'claude') {
		throw new Error('LECTURE_LLM=claude hook not yet wired up. (Plan: shell out to `claude -p "..."` with the decomposition system prompt + known morpheme catalog.)');
	}
	const map = INLINE_DECOMPOSED[fixtureName];
	if (!map) throw new Error(`No inline decomposition for "${fixtureName}".`);
	const missing = terms.filter((t) => !map[t]);
	if (missing.length) throw new Error(`Missing decomposition for: ${missing.join(', ')}`);
	return terms.map((term) => ({ term, parts: map[term] }));
}

// ============================================================================
// 3) ③ NBK RAG 대조 + 분류
// ============================================================================

// 각 morpheme id를 상태로 분류:
//   - 'verified'                 : morphemes.ts에 있고 검수됨 → 즉시 학습 큐
//   - 'candidate'                : candidate-morphemes-draft.json에 있음 → 검수 대기 (NBK 출처)
//   - 'unverified-with-source'   : 새 어근, NBK에서 찾음 → 후보로 추가 가능
//   - 'unverified-no-source'     : 새 어근, 어디에도 없음 → 검수자 go/no-go
function classifyParts(parts, morphIds, unverifiedIds, candidateMap, nbk) {
	return parts.map((id) => {
		if (morphIds.has(id) && !unverifiedIds.has(id)) {
			return { id, status: 'verified' };
		}
		if (candidateMap.has(id)) {
			const c = candidateMap.get(id);
			return { id, status: 'candidate', source: c.source || 'nbk-ch1', meaning: c.meaningKo || c.meaning };
		}
		const hit = nbkSearch(nbk, id);
		if (hit) {
			return { id, status: 'unverified-with-source', source: 'nbk-ch1', nbkMeaning: hit.entry.meaning, bucket: hit.bucket };
		}
		return { id, status: 'unverified-no-source' };
	});
}

// ============================================================================
// 4) 메인
// ============================================================================

async function main() {
	const fixtureName = process.argv[2] || 'cardiology-week-3';
	console.log(`\n[강의자료 수확 에이전트] fixture = ${fixtureName}\n`);

	const { meta, body } = loadFixture(fixtureName);
	const { ids: morphIds, unverifiedIds } = loadMorphemes();
	const termLabels = loadTermLabels();
	const candidateMap = loadCandidateMorphemes();
	const nbk = loadNBK();

	console.log(`[로드] morphemes ${morphIds.size}개 (미검수 ${unverifiedIds.size}개) · terms ${termLabels.size}개 · NBK 후보 풀 ${candidateMap.size}개 · NBK raw ${(nbk.counts && nbk.counts.total) || 'n/a'}개`);

	// ① 용어 추출 (분해 전 — 영어 의학용어 문자열 리스트)
	const extractedTerms = await extractTerms(fixtureName);
	console.log(`\n[① 용어 추출]  ${extractedTerms.length}개`);
	for (const t of extractedTerms) console.log(`    · ${t}`);

	// ② 어근 분해 (각 용어 → morpheme id 배열)
	const extracted = await decomposeTerms(fixtureName, extractedTerms);
	console.log(`\n[② 어근 분해]  ${extracted.length}개`);
	for (const { term, parts } of extracted) {
		console.log(`    · ${term.padEnd(26)} →  ${parts.join(' + ')}`);
	}

	// ③ NBK 대조 + 분류
	console.log(`\n[③ NBK RAG 대조 + 분류]`);
	const results = extracted.map(({ term, parts }) => {
		const classified = classifyParts(parts, morphIds, unverifiedIds, candidateMap, nbk);
		const alreadyInTerms = termLabels.has(term.toLowerCase());
		const allVerified = classified.every((p) => p.status === 'verified');
		const allSourced = classified.every((p) => p.status !== 'unverified-no-source');
		const unresolved = classified.filter((p) => p.status === 'unverified-no-source');
		const newCandidates = classified.filter((p) => p.status === 'unverified-with-source');
		return { term, parts, classified, alreadyInTerms, allVerified, allSourced, unresolved, newCandidates };
	});

	// 결과 분류 출력 (사용자가 한 눈에 보게)
	const inNet = results.filter((r) => r.alreadyInTerms);
	const autoMerge = results.filter((r) => !r.alreadyInTerms && r.allVerified);
	const afterPromote = results.filter((r) => !r.alreadyInTerms && !r.allVerified && r.allSourced);
	const blocked = results.filter((r) => r.unresolved.length > 0);

	const print = (rs, header, prefix) => {
		console.log(`\n  ── ${header} (${rs.length}) ──`);
		for (const r of rs) {
			const sourced = r.classified.filter((p) => p.status === 'candidate' || p.status === 'unverified-with-source').map((p) => p.id);
			const tail = prefix === '🔎' ? `  ← 신규 어근: ${sourced.join(', ')} (출처: nbk-ch1)`
				: prefix === '❓' ? `  ← 출처없음: ${r.unresolved.map((p) => p.id).join(', ')}`
				: '';
			console.log(`    ${prefix} ${r.term.padEnd(26)} ${r.parts.join(' + ').padEnd(34)}${tail}`);
		}
	};
	print(inNet,        '기존 그물에 이미 있음 (재확인)',                       '✓');
	print(autoMerge,    '새 용어, 어근 모두 검수됨 (자동 합류 가능)',           '➕');
	print(afterPromote, '새 용어, 새 어근(NBK 출처 있음) — 검수자 편집 후 합류', '🔎');
	print(blocked,      '새 어근, NBK에도 없음 — 검수자 go/no-go',              '❓');

	// === eval ===
	const expected = new Set((meta.expected_terms || []).map((s) => String(s).toLowerCase()));
	const extractedSet = new Set(extracted.map((e) => e.term.toLowerCase()));
	const tp = [...extractedSet].filter((t) => expected.has(t)).length;
	const precision = extractedSet.size > 0 ? tp / extractedSet.size : 0;
	const recall = expected.size > 0 ? tp / expected.size : 0;

	const allPartsFlat = results.flatMap((r) => r.classified);
	const verifiedCount = allPartsFlat.filter((p) => p.status === 'verified').length;
	const sourcedCount = allPartsFlat.filter((p) => p.status !== 'unverified-no-source').length;
	const newTerms = results.filter((r) => !r.alreadyInTerms);
	const autoRate = newTerms.length > 0 ? autoMerge.length / newTerms.length : null;

	console.log('\n[evaluation]');
	console.log(`  추출 precision   = ${(precision * 100).toFixed(1)}%   (${tp}/${extractedSet.size} extracted ∈ expected)`);
	console.log(`  추출 recall      = ${(recall * 100).toFixed(1)}%   (${tp}/${expected.size} expected ∈ extracted)`);
	console.log(`  분해 커버리지     = ${(verifiedCount / allPartsFlat.length * 100).toFixed(1)}%   (${verifiedCount}/${allPartsFlat.length} parts ∈ verified morphemes)`);
	console.log(`  citation 커버리지 = ${(sourcedCount / allPartsFlat.length * 100).toFixed(1)}%   (${sourcedCount}/${allPartsFlat.length} parts have source)`);
	console.log(`  자동 통과율       = ${autoRate !== null ? (autoRate * 100).toFixed(1) + '%' : 'N/A'}   (${autoMerge.length}/${newTerms.length} 새 용어가 검수자 손 안 거치고 합류)`);

	// === 출력 JSON ===
	const newCandAgg = new Map();
	const noSourceAgg = new Map();
	for (const r of results) {
		for (const p of r.newCandidates) {
			if (!newCandAgg.has(p.id)) {
				newCandAgg.set(p.id, { id: p.id, bucket: p.bucket, source: 'nbk-ch1', verified: false, nbkMeaning: p.nbkMeaning, usedIn: [r.term] });
			} else {
				newCandAgg.get(p.id).usedIn.push(r.term);
			}
		}
		for (const p of r.unresolved) {
			if (!noSourceAgg.has(p.id)) noSourceAgg.set(p.id, { id: p.id, usedIn: [r.term] });
			else noSourceAgg.get(p.id).usedIn.push(r.term);
		}
	}

	const output = {
		_meta: {
			generated: new Date().toISOString().slice(0, 10),
			fixture: fixtureName,
			pipeline: '강의 텍스트 → ① 용어 추출 (인라인 Claude) → ② 어근 분해 (인라인) → ③ NBK RAG 대조 (스크립트)',
			llm_runtime: 'inline (Claude in conversation, hardcoded in INLINE_EXTRACTED/DECOMPOSED)',
			llm_hook: 'LECTURE_LLM=claude → `claude -p` (미구현, 자리만 비워둠)',
			next_step: '검수자가 needs_curator + candidate_morphemes 통과 처리 → morphemes.ts/terms.ts 머지'
		},
		fixture: {
			title: meta.title || fixtureName,
			source: meta.source || '',
			body: body.trim()
		},
		extracted_terms: extractedTerms,
		eval: {
			extraction_precision: +precision.toFixed(3),
			extraction_recall: +recall.toFixed(3),
			decomposition_coverage: +(verifiedCount / allPartsFlat.length).toFixed(3),
			citation_coverage: +(sourcedCount / allPartsFlat.length).toFixed(3),
			auto_merge_rate: autoRate !== null ? +autoRate.toFixed(3) : null,
			counts: {
				extracted: extracted.length,
				already_in_terms: inNet.length,
				auto_mergeable: autoMerge.length,
				after_candidate_promotion: afterPromote.length,
				blocked_on_curator: blocked.length
			}
		},
		terms: results.map((r) => ({
			term: r.term,
			parts: r.parts,
			verified: false,
			already_in_terms: r.alreadyInTerms,
			all_parts_verified: r.allVerified,
			needs_curator: r.unresolved.length > 0,
			classified: r.classified
		})),
		candidate_morphemes: [...newCandAgg.values()],
		needs_curator: [...noSourceAgg.values()]
	};

	// 앱이 import 가능한 위치로 출력 — 한 곳에 두면 동기화 이슈 없음
	const outDir = path.join(ROOT, 'src/lib/data/lectures');
	fs.mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, `${fixtureName}.json`);
	fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
	console.log(`\n[완료] ${path.relative(ROOT, outPath)}\n`);
}

main().catch((err) => {
	console.error('[실패]', err.message);
	process.exit(1);
});
