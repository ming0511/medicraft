import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConsentDoc } from '$lib/supabase/types';
import { LEGAL_DOCS, type ConsentSnapshot } from '$lib/legal';

const KEY = 'medicraft.consents';

export function loadConsents(): ConsentSnapshot {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return {};
		return JSON.parse(raw) as ConsentSnapshot;
	} catch {
		return {};
	}
}

export function saveConsents(snap: ConsentSnapshot) {
	try {
		localStorage.setItem(KEY, JSON.stringify(snap));
	} catch {
		// ignore
	}
}

export function hasRequiredConsents(snap: ConsentSnapshot): boolean {
	return LEGAL_DOCS.filter((d) => d.required).every((d) => {
		const c = snap[d.doc];
		return c && c.version === d.version;
	});
}

export async function recordConsents(
	agreed: Record<ConsentDoc, boolean>,
	supabase: SupabaseClient | null
): Promise<ConsentSnapshot> {
	const now = new Date().toISOString();
	const snap: ConsentSnapshot = {};
	for (const meta of LEGAL_DOCS) {
		if (!agreed[meta.doc] && !meta.required) continue;
		if (agreed[meta.doc]) {
			snap[meta.doc] = { version: meta.version, agreedAt: now };
		}
	}
	saveConsents(snap);

	if (supabase) {
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (user) {
			const rows = LEGAL_DOCS.map((meta) => ({
				user_id: user.id,
				doc: meta.doc,
				version: meta.version,
				agreed: Boolean(agreed[meta.doc]),
				agreed_at: now
			}));
			await supabase.from('consents').insert(rows);
		}
	}

	return snap;
}
