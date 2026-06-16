// 데이터셋 에이전트 PoC (2026-05-19)
// ─────────────────────────────────────────────────────────────────────────────
// 외부 데이터 파이프라인의 빈 칸을 LLM으로 채우는 단계:
//
//   NBK 의학교재 HTML
//      ↓ (parse-nbk-wordparts.py)
//   nbk-ch1-wordparts.json     ← 153개 어원 후보, 영어 뜻만
//      ↓ (이 스크립트)         ← ★ 새 단계: LLM이 한국어 뜻 초안 + 노트 작성 ★
//   candidate-morphemes-draft.json   ← 후보 morpheme (verified: false)
//      ↓ (사람 검수 — "OK" 한 항목만)
//   morphemes.ts (학습 데이터)
//
// 라이선스: NBK = CC-BY 4.0 (출처 표시 의무, 자유 재가공). source: 'nbk-ch1' 필드로
// 항목별 추적 → attribution 자동 충족. Wikipedia(CC-BY-SA)는 대조용만(전염 회피).
//
// 사용:
//   node scripts/llm-draft-morphemes.mjs           # 후보 추출 + 프롬프트만 출력 (dry-run)
//   node scripts/llm-draft-morphemes.mjs --write   # candidate-morphemes-draft.json 생성

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── 1) NBK JSON 읽고 morphemes.ts에 아직 안 들어간 후보만 추리기 ─────────────
const nbk = JSON.parse(fs.readFileSync(path.join(__dirname, 'nbk-ch1-wordparts.json'), 'utf8'));
const morphTs = fs.readFileSync(path.join(ROOT, 'src/lib/data/morphemes.ts'), 'utf8');
const existingIds = new Set((morphTs.match(/id:\s*'([^']+)'/g) || []).map((m) => m.match(/'([^']+)'/)[1]));

function nbkId(entry) {
	let p = (entry.primary || entry.forms?.[0] || '').toLowerCase();
	return p.replace(/^-+|-+$/g, '').replace(/\/o$/, '').replace(/\//g, '').trim();
}

const allCandidates = [];
for (const [bucket, type] of [['prefixes', 'prefix'], ['roots', 'root'], ['suffixes', 'suffix']]) {
	for (const e of nbk[bucket] || []) {
		const id = nbkId(e);
		if (!id || existingIds.has(id)) continue;
		allCandidates.push({ id, type, forms: e.forms, meaning: e.meaning });
	}
}

// ── 2) 고레버리지 15개 선별 (기존 어근과 조합돼 즉시 새 용어 풀리는 것) ─────
// PoC 단계라 수동 선별. 자동화 단계는 다음 — 빈도 기반 또는 LLM에게 선별까지 시키기.
const SELECTED_IDS = [
	// prefixes (5): hypo는 hyper의 짝, anti·auto·dia·epi 모두 고빈도
	'hyp', 'anti', 'aut', 'dia', 'epi',
	// roots (5): 모두 이미 있는 어근과 조합 가능
	//   arthr+itis=arthritis, angi+oma=angioma, glyc+emia=hyperglycemia 등
	'arthr', 'angi', 'glyc', 'carcin', 'erythr',
	// suffixes (5): 가장 강한 레버리지 ─ 모든 root와 조합돼 새 용어 폭발
	//   cardi+logy=cardiology, cardi+megaly=cardiomegaly, neur+logist=neurologist 등
	'logy', 'logist', 'megaly', 'ectomy', 'cyte'
];

const selected = SELECTED_IDS.map((id) => {
	const c = allCandidates.find((x) => x.id === id);
	if (!c) throw new Error('Selected id not in NBK candidates: ' + id);
	return c;
});

console.log(`[추출] NBK 153개 → 기존 채택 ${existingIds.size}개 → 미채택 후보 ${allCandidates.length}개 → PoC 선별 ${selected.length}개\n`);

// ── 3) LLM 프롬프트 생성 (호출은 Claude Code 환경에서 = Claude Max 활용) ────
const SYSTEM_PROMPT = `당신은 의학용어 학습 앱의 데이터 큐레이션 어시스턴트입니다.
NBK 의학교재(CC-BY 4.0)에서 추출한 어원 조각(morpheme)에 대해, 한국어 뜻과 사용 노트를 작성하세요.

규칙:
- meaningKo: 우리말로 직접 작성. 영어 뜻을 그대로 번역하지 말고 한국 의학용어에서 통용되는 표현으로.
  예: "Inflammation" → "염증" (○), "염증성" (X — 형용사 접미라도 명사형으로)
- note: 사용 시 주의점/조합 규칙/이형태가 있을 때만. 없으면 빈 문자열.
  예: "모음 앞에서는 hyp-, 자음 앞에서는 hypo-"
- combiningVowel: root 타입이고 결합형이 명시된 경우만 (대부분 'o'). 없으면 생략.
- verified: false 고정 (사람 검수 대기).
- source: 'nbk-ch1' 고정.

출력은 morphemes.ts의 Morpheme 인터페이스를 따르는 JSON 객체.`;

function userPromptFor(entry) {
	return `타입: ${entry.type}
표면형: ${entry.forms.join(', ')}
영어 뜻: ${entry.meaning}

위 어원의 한국어 뜻(meaningKo)과 (필요 시) 사용 노트(note)를 작성하세요.`;
}

if (!process.argv.includes('--write')) {
	console.log('[dry-run] --write 플래그 없음. 프롬프트만 출력합니다.\n');
	console.log('--- SYSTEM ---');
	console.log(SYSTEM_PROMPT);
	console.log('\n--- USER (예시 1개) ---');
	console.log(userPromptFor(selected[0]));
	console.log('\n[다음 단계] --write 로 실행하면 candidate-morphemes-draft.json 생성');
	process.exit(0);
}

// ── 4) Claude Max 환경에서는 LLM 호출 = Claude Code 대화에서 직접 작성 ──────
// 이 PoC에서는 Claude(이 대화의 어시스턴트)가 위 프롬프트에 따라 직접 작성한 결과를
// inline 으로 박았습니다. 다음 단계는 Anthropic SDK / Claude Agent SDK 로 자동화.
const LLM_DRAFTS = {
	// ─── prefixes ───
	hyp: {
		form: 'hypo-, hyp-', variants: ['hyp', 'hypo'],
		meaningKo: '저-, 아래, 결핍',
		note: '자음 앞에서는 hypo-, 모음 앞에서는 hyp-. hyper- 의 짝(과↔저).',
		origin: 'Gk. hypo', unit: 1
	},
	anti: {
		form: 'anti-',
		meaningKo: '~에 대항하는, 항-',
		note: 'antibody(항체), antibiotic(항생제) 등 약물·면역 용어에 빈출.',
		origin: 'Gk. anti', unit: 1
	},
	aut: {
		form: 'auto-, aut-', variants: ['aut', 'auto'],
		meaningKo: '자기-, 스스로',
		note: 'autoimmune(자가면역), autopsy(부검: 자기 눈으로 봄).',
		origin: 'Gk. autos', unit: 2
	},
	dia: {
		form: 'dia-',
		meaningKo: '통과하여, 가로질러, ~를 통한',
		note: 'diabetes(당뇨: 통과해 흐름), dialysis(투석), diagnosis(진단).',
		origin: 'Gk. dia', unit: 2
	},
	epi: {
		form: 'epi-, ep-', variants: ['ep', 'epi'],
		meaningKo: '위에, 덮은',
		note: '모음 앞에서는 ep-. epidermis(표피), epigastric(상복부).',
		origin: 'Gk. epi', unit: 2
	},

	// ─── roots ───
	arthr: {
		form: 'arthr/o', combiningVowel: 'o',
		meaningKo: '관절',
		note: 'arthritis(관절염), arthroscopy(관절경) — 정형외과 핵심 어근.',
		origin: 'Gk. arthron', unit: 2
	},
	angi: {
		form: 'angi/o', combiningVowel: 'o',
		meaningKo: '혈관',
		note: 'angiography(혈관조영술), angioplasty(혈관성형술). vessel(맥관).',
		origin: 'Gk. angeion', unit: 2
	},
	glyc: {
		form: 'glyc/o', combiningVowel: 'o',
		meaningKo: '당, 포도당',
		note: 'hyperglycemia(고혈당), hypoglycemia(저혈당) — 내분비/대사 핵심.',
		origin: 'Gk. glykys', unit: 2
	},
	carcin: {
		form: 'carcin/o', combiningVowel: 'o',
		meaningKo: '암, 악성종양',
		note: 'carcinoma(암종), carcinogenic(발암성). 그리스어 "게(crab)" 에서 — 종양의 모양.',
		origin: 'Gk. karkinos', unit: 2
	},
	erythr: {
		form: 'erythr/o', combiningVowel: 'o',
		meaningKo: '적색, 적-',
		note: 'erythrocyte(적혈구), erythema(홍반). 혈액학에서 빈출.',
		origin: 'Gk. erythros', unit: 2
	},

	// ─── suffixes (가장 강한 레버리지) ───
	logy: {
		form: '-logy',
		meaningKo: '~학(學), 학문',
		note: 'cardiology(심장학), neurology(신경학), nephrology(신장학) — 모든 장기 어근과 조합.',
		origin: 'Gk. logos', unit: 1
	},
	logist: {
		form: '-logist',
		meaningKo: '~학자, ~과 전문의',
		note: 'cardiologist(심장전문의), neurologist(신경과 전문의). -logy 의 사람 버전.',
		origin: 'Gk. logos + -ist', unit: 1
	},
	megaly: {
		form: '-megaly',
		meaningKo: '비대, 거대',
		note: 'cardiomegaly(심비대), hepatomegaly(간비대), splenomegaly(비장비대).',
		origin: 'Gk. megas', unit: 1
	},
	ectomy: {
		form: '-ectomy',
		meaningKo: '절제술, 적출',
		note: 'appendectomy(충수절제), nephrectomy(신장적출), hysterectomy(자궁적출).',
		origin: 'Gk. ek + tomē', unit: 1
	},
	cyte: {
		form: '-cyte',
		meaningKo: '세포',
		note: 'erythrocyte(적혈구), leukocyte(백혈구), lymphocyte(림프구). cyt/o(세포) 어근의 접미 형태.',
		origin: 'Gk. kytos', unit: 1
	}
};

const drafts = selected.map((entry) => {
	const llm = LLM_DRAFTS[entry.id];
	if (!llm) throw new Error('Missing LLM draft for: ' + entry.id);
	return {
		id: entry.id,
		form: llm.form,
		type: entry.type,
		...(llm.variants ? { variants: llm.variants } : {}),
		...(llm.combiningVowel ? { combiningVowel: llm.combiningVowel } : {}),
		meaning: entry.meaning,
		meaningKo: llm.meaningKo,
		origin: llm.origin,
		unit: llm.unit,
		note: llm.note,
		source: 'nbk-ch1',
		verified: false
	};
});

const outPath = path.join(__dirname, 'candidate-morphemes-draft.json');
fs.writeFileSync(
	outPath,
	JSON.stringify(
		{
			_meta: {
				generated: new Date().toISOString().slice(0, 10),
				source: 'scripts/nbk-ch1-wordparts.json (NBK Open RN, CC-BY 4.0)',
				generator: 'Claude (via Claude Code, Max subscription)',
				prompt_system: SYSTEM_PROMPT,
				selected_strategy: '기존 morphemes.ts 73개와 조합돼 즉시 새 용어 풀리는 고레버리지 15개',
				next_step: '사람 검수 → verified: true → morphemes.ts 머지'
			},
			drafts
		},
		null,
		2
	)
);

console.log(`[완료] ${drafts.length}개 후보 morpheme draft 생성 → ${path.relative(ROOT, outPath)}`);
console.log('\n선별된 항목:');
for (const d of drafts) console.log(`  [${d.type.padEnd(7)}] ${d.id.padEnd(10)} ${d.form.padEnd(20)} → ${d.meaningKo}`);
