// 판매 상품 카탈로그 (단일 정의 = 클라이언트·서버 공용 source of truth).
// 금액은 서버가 토스 승인 시 이 값으로 검증하므로 클라이언트가 조작 못 함.

export type ProductKind = 'one_time' | 'subscription';

export type Product = {
	id: string;
	name: string; // 토스 결제창 orderName
	desc: string;
	amount: number; // 원
	kind: ProductKind;
	durationDays?: number; // subscription 일 때 만료 계산
};

export const PRODUCTS = {
	emergency_unlock: {
		id: 'emergency_unlock',
		name: '응급실 모드 해금',
		desc: '벼락치기 압축 코스 — 시험 범위를 시간예산 안에 어근 자산으로 끝내기',
		amount: 9900,
		kind: 'one_time'
	}
} as const satisfies Record<string, Product>;

export type ProductId = keyof typeof PRODUCTS;

export function getProduct(id: string): Product | null {
	return (PRODUCTS as Record<string, Product>)[id] ?? null;
}

export function isProductId(id: string): id is ProductId {
	return id in PRODUCTS;
}
