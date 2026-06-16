import type { ConsentDoc } from './supabase/types';

export type LegalDocMeta = {
	doc: ConsentDoc;
	version: string;
	title: string;
	required: boolean;
	path?: string;
	summary: string;
};

export const LEGAL_DOCS: LegalDocMeta[] = [
	{
		doc: 'terms',
		version: 'v1',
		title: '이용약관',
		required: true,
		path: '/legal/terms',
		summary: 'MediCraft Pro 서비스 이용에 대한 약관'
	},
	{
		doc: 'privacy',
		version: 'v1',
		title: '개인정보 처리방침',
		required: true,
		path: '/legal/privacy',
		summary: '수집 항목·목적·보유기간 등 개인정보 처리'
	},
	{
		doc: 'age_14',
		version: 'v1',
		title: '만 14세 이상입니다',
		required: true,
		summary: '회원가입은 만 14세 이상만 가능합니다'
	},
	{
		doc: 'marketing',
		version: 'v1',
		title: '마케팅 정보 수신 동의',
		required: false,
		summary: '신기능·이벤트 안내 (이메일/푸시) — 언제든 해제 가능'
	}
];

export type ConsentSnapshot = Partial<Record<ConsentDoc, { version: string; agreedAt: string }>>;
