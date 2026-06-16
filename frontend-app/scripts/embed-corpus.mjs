// 수확 RAG 코퍼스 인제스트 — NBK 단어조각을 Gemini 임베딩 → Supabase pgvector(nbk_corpus) upsert.
// 1회성·idempotent (PK 충돌 시 merge). 코퍼스 JSON 이 바뀔 때만 재실행.
//
//   node scripts/embed-corpus.mjs            # 인제스트
//   node scripts/embed-corpus.mjs --dry      # 임베딩/업서트 없이 파싱 결과만 출력
//
// 필요한 env (.env): PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
// 런타임(lecture-rag.ts)은 같은 모델/차원으로 "쿼리"만 임베딩 → 여기는 "문서" 임베딩(taskType 다름).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;
// 무료 티어 = 분당 100건(batchEmbedContents 는 content 1개당 1건으로 카운트).
// 한도 아래로 두기 위해 배치를 작게 + 배치 사이 간격.
const BATCH = 80;
const INTER_BATCH_MS = 62_000; // 다음 배치 전 대기(분당 윈도우 리셋)
const DRY = process.argv.includes('--dry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── .env 로더 (SvelteKit 밖이라 직접 파싱) ────────────────────────
function loadEnv() {
	try {
		const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
		for (const line of raw.split('\n')) {
			const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
			if (!m) continue;
			let v = m[2].trim().replace(/^["']|["']$/g, '');
			if (!(m[1] in process.env)) process.env[m[1]] = v;
		}
	} catch {
		/* .env 없으면 실제 env 사용 */
	}
}
loadEnv();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ── NBK JSON → 깨끗한 코퍼스 엔트리 ───────────────────────────────
// scripts JSON 은 워크리스트라 글리치 가능(접미사에 설명문 prepend 등) → 표면형 정제.
function cleanSurfaces(forms) {
	const out = new Set();
	for (const f of forms) {
		// 콤마/공백으로 쪼개 word-part 패턴 토큰만: 선택적 -, 알파벳, 선택적 /o, 선택적 -.
		for (const tok of String(f).split(/[,\s]+/)) {
			const m = tok.match(/^-?[a-z]{1,15}(\/[a-z]+)?-?$/i);
			if (m) out.add(tok.toLowerCase());
		}
	}
	return [...out];
}

const norm = (s) => String(s).toLowerCase().replace(/[-/]/g, '').trim();

function buildCorpus() {
	const nbk = JSON.parse(readFileSync(resolve(ROOT, 'scripts/nbk-ch1-wordparts.json'), 'utf8'));
	const sourceLabel = 'NBK607453 ch.1 (Medical Terminology 2nd ed., Open RN, CC-BY 4.0)';
	const url = nbk.source?.split(' ')[0] ?? 'https://www.ncbi.nlm.nih.gov/books/NBK607453/';
	const entries = [];
	const seen = new Set();
	for (const [bucketKey, type] of [['prefixes', 'prefix'], ['roots', 'root'], ['suffixes', 'suffix']]) {
		for (const e of nbk[bucketKey] ?? []) {
			const forms = [e.primary, ...(e.forms ?? [])].filter(Boolean);
			const surfaces = cleanSurfaces(forms);
			if (surfaces.length === 0 || !e.meaning) continue;
			const surface = surfaces[0]; // 대표 표면형 (가장 먼저 매칭된 정제 토큰)
			const key = `${type}:${norm(surface)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			entries.push({
				id: `nbk-ch1:${key}`,
				surface,
				bucket: type,
				meaning: e.meaning,
				source: sourceLabel,
				citation: `${e.meaning} — ${type} "${surface}". ${sourceLabel}. ${url}`,
				// 임베딩 대상: 표면형 변이 + 타입 + 뜻. 어근 회상을 위해 표면형을 앞에.
				content: `${surfaces.join(', ')} (${type}): ${e.meaning}`
			});
		}
	}
	return entries;
}

// ── Gemini 문서 임베딩 (배치) ─────────────────────────────────────
async function embedChunk(chunk) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
				body: JSON.stringify({
					requests: chunk.map((t) => ({
						model: `models/${EMBED_MODEL}`,
						content: { parts: [{ text: t }] },
						outputDimensionality: EMBED_DIMS,
						taskType: 'RETRIEVAL_DOCUMENT'
					}))
				})
			}
		);
		if (res.ok) {
			const data = await res.json();
			return (data.embeddings ?? []).map((e) => e.values ?? []);
		}
		const body = await res.text();
		if (res.status === 429) {
			// 한도 → 제안된 retryDelay(없으면 62s) 만큼 대기 후 재시도.
			const m = body.match(/"retryDelay":\s*"(\d+)s"/);
			const waitMs = (m ? Number(m[1]) + 2 : 62) * 1000;
			console.log(`\n  429 한도 — ${Math.round(waitMs / 1000)}s 대기 후 재시도 (${attempt + 1}/5)`);
			await sleep(waitMs);
			continue;
		}
		throw new Error(`Gemini embed ${res.status}: ${body.slice(0, 300)}`);
	}
	throw new Error('Gemini embed: 429 재시도 소진');
}

async function embedDocs(texts) {
	const out = [];
	for (let i = 0; i < texts.length; i += BATCH) {
		const chunk = texts.slice(i, i + BATCH);
		out.push(...(await embedChunk(chunk)));
		process.stdout.write(`  임베딩 ${Math.min(i + BATCH, texts.length)}/${texts.length}\r`);
		if (i + BATCH < texts.length) await sleep(INTER_BATCH_MS); // 다음 배치 전 분당 윈도우 대기
	}
	console.log('');
	return out;
}

// ── Supabase upsert (PostgREST) ───────────────────────────────────
async function upsert(rows) {
	const res = await fetch(`${SUPABASE_URL}/rest/v1/nbk_corpus`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			apikey: SERVICE_KEY,
			authorization: `Bearer ${SERVICE_KEY}`,
			prefer: 'resolution=merge-duplicates,return=minimal'
		},
		body: JSON.stringify(rows)
	});
	if (!res.ok) throw new Error(`Supabase upsert ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// ── main ──────────────────────────────────────────────────────────
const corpus = buildCorpus();
console.log(`코퍼스 엔트리 ${corpus.length}개 파싱됨.`);
console.log('샘플:', corpus.slice(0, 3).map((c) => `${c.surface} → ${c.meaning}`).join(' | '));

if (DRY) {
	console.log('--dry: 임베딩/업서트 생략.');
	process.exit(0);
}
if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
	console.error('env 부족: PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY 필요');
	process.exit(1);
}

const vectors = await embedDocs(corpus.map((c) => c.content));
const rows = corpus.map((c, i) => ({
	id: c.id,
	surface: c.surface,
	bucket: c.bucket,
	meaning: c.meaning,
	source: c.source,
	citation: c.citation,
	content: c.content,
	embedding: JSON.stringify(vectors[i]) // pgvector 는 "[...]" 문자열로 받음
}));

// 업서트도 청크로 (페이로드 크기 제한 회피).
for (let i = 0; i < rows.length; i += 50) {
	await upsert(rows.slice(i, i + 50));
	process.stdout.write(`  업서트 ${Math.min(i + 50, rows.length)}/${rows.length}\r`);
}
console.log(`\n완료: ${rows.length}개 nbk_corpus 에 upsert.`);
