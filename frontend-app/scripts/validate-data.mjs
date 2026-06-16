#!/usr/bin/env node
// 데이터 무결성 검사 — morphemes.ts / terms.ts 가 서로 맞는지, 깨진 필드가 없는지.
// `pnpm run validate` (또는 `pnpm check` 안에서 자동 실행). 에러가 있으면 비정상 종료.
// morphemes.ts / terms.ts 는 단순 데이터 파일이라 정규식 파싱으로 충분.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const morphSrc = readFileSync(join(root, 'src/lib/data/morphemes.ts'), 'utf8');
const termSrc = readFileSync(join(root, 'src/lib/data/terms.ts'), 'utf8');

const errors = [];
const warnings = [];

// --- parse morphemes ---
// only the array literal between `export const morphemes: Morpheme[] = [` and `\n];`
const mArrMatch = morphSrc.match(/export const morphemes: Morpheme\[\] = \[([\s\S]*?)\n\];/);
if (!mArrMatch) errors.push('morphemes.ts: `morphemes` 배열을 찾지 못함 (포맷 변경?)');
const morphemes = [];
if (mArrMatch) {
	for (const line of mArrMatch[1].split('\n')) {
		const t = line.trim();
		if (!t.startsWith('{')) continue;
		const id = t.match(/\bid:\s*'([^']*)'/)?.[1];
		const form = t.match(/\bform:\s*'([^']*)'/)?.[1];
		const type = t.match(/\btype:\s*'([^']*)'/)?.[1];
		const meaning = t.match(/\bmeaning:\s*'((?:[^'\\]|\\.)*)'/)?.[1];
		const meaningKo = t.match(/\bmeaningKo:\s*'((?:[^'\\]|\\.)*)'/)?.[1];
		const unit = t.match(/\bunit:\s*(\d+)/)?.[1];
		const verified = /\bverified:\s*false\b/.test(t) ? false : true;
		const cv = t.match(/\bcombiningVowel:\s*'([^']*)'/)?.[1];
		morphemes.push({ id, form, type, meaning, meaningKo, unit: unit ? +unit : undefined, verified, cv, raw: t });
	}
}

// --- parse terms ---
const tArrMatch = termSrc.match(/const rawTerms: Term\[\] = \[([\s\S]*?)\n\];/);
if (!tArrMatch) errors.push('terms.ts: `rawTerms` 배열을 찾지 못함 (포맷 변경?)');
const terms = [];
if (tArrMatch) {
	for (const m of tArrMatch[1].matchAll(/\{\s*id:\s*'([^']*)'[^}]*?parts:\s*\[([^\]]*)\][^}]*?\}/g)) {
		const id = m[1];
		const parts = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
		terms.push({ id, parts });
	}
}

// --- checks ---
const ids = new Set();
for (const m of morphemes) {
	if (!m.id) { errors.push(`morpheme without id: ${m.raw?.slice(0, 60)}`); continue; }
	if (ids.has(m.id)) errors.push(`morpheme id 중복: '${m.id}'`);
	ids.add(m.id);
	if (!m.form) errors.push(`morpheme '${m.id}': form 누락`);
	if (!m.meaning) errors.push(`morpheme '${m.id}': meaning 누락`);
	if (m.type && !['prefix', 'root', 'suffix'].includes(m.type)) errors.push(`morpheme '${m.id}': 잘못된 type '${m.type}'`);
	if (m.unit == null || m.unit < 1) errors.push(`morpheme '${m.id}': unit 누락/비정상`);
	if (m.verified && (!m.meaningKo || !m.meaningKo.trim())) warnings.push(`morpheme '${m.id}': 검수됨인데 meaningKo 비어 있음 → 학습에서 제외됨`);
	if (m.type === 'suffix' && m.form && !m.form.includes('-')) warnings.push(`morpheme '${m.id}': suffix인데 form에 '-' 없음 ('${m.form}')`);
	if (m.type === 'prefix' && m.form && !m.form.includes('-')) warnings.push(`morpheme '${m.id}': prefix인데 form에 '-' 없음 ('${m.form}')`);
}

const used = new Set();
const termIds = new Set();
for (const t of terms) {
	if (termIds.has(t.id)) errors.push(`term id 중복: '${t.id}'`);
	termIds.add(t.id);
	if (!t.parts.length) errors.push(`term '${t.id}': parts 비어 있음`);
	for (const p of t.parts) {
		used.add(p);
		if (!ids.has(p)) errors.push(`term '${t.id}': 존재하지 않는 morpheme id '${p}'`);
	}
}
for (const m of morphemes) {
	if (m.id && !used.has(m.id)) warnings.push(`morpheme '${m.id}': 아무 용어에서도 안 쓰임`);
}

// --- report ---
console.log(`morphemes: ${morphemes.length} (검수 ${morphemes.filter((m) => m.verified).length} / 한국어 뜻 있음 ${morphemes.filter((m) => m.meaningKo && m.meaningKo.trim()).length})`);
console.log(`terms: ${terms.length}, 용어가 쓰는 어원: ${used.size}`);
if (warnings.length) {
	console.log(`\n⚠️  경고 ${warnings.length}:`);
	for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
	console.error(`\n❌ 에러 ${errors.length}:`);
	for (const e of errors) console.error('  - ' + e);
	process.exit(1);
}
console.log('\n✅ 데이터 무결성 OK');
