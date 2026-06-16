-- MediCraft Pro Phase 3: 결제 + 권한(entitlements)
-- Supabase 대시보드 SQL Editor 에 붙여넣고 실행 (0001 이후)
--
-- 설계 원칙: 권한(entitlements)은 서버가 source of truth.
--   - 학습자는 자기 권한을 읽기(select)만 가능.
--   - 삽입/수정 정책 없음 → authenticated/anon 으로는 못 씀(RLS 차단).
--   - 토스 결제 승인이 끝난 서버 라우트가 service_role 키로만 삽입 → self-grant 불가.

-- ── entitlements (해금된 권한: 단건결제·구독 공통) ──────
create table if not exists public.entitlements (
	id bigserial primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	product text not null,                       -- products.ts 의 product id (예: 'emergency_unlock')
	order_id text not null unique,               -- 토스 주문번호 (멱등 키)
	payment_key text,                            -- 토스 paymentKey
	amount integer not null,                     -- 결제 금액(원)
	status text not null default 'active'        -- active | refunded
		check (status in ('active', 'refunded')),
	expires_at timestamptz,                      -- 구독 만료(단건결제는 null = 영구)
	granted_at timestamptz not null default now()
);

create index if not exists entitlements_user_product_idx
	on public.entitlements (user_id, product, status);

alter table public.entitlements enable row level security;

-- 읽기만: 자기 권한 조회. (쓰기 정책 없음 = service_role 만 삽입/수정)
drop policy if exists "entitlements_self_read" on public.entitlements;
create policy "entitlements_self_read"
	on public.entitlements for select
	using (auth.uid() = user_id);

-- ── payments (결제 시도 감사 로그: 누적, 상태 추적) ──────
create table if not exists public.payments (
	id bigserial primary key,
	user_id uuid references auth.users(id) on delete set null,
	order_id text not null,
	payment_key text,
	product text,
	amount integer,
	status text not null                          -- requested | confirmed | failed | refunded
		check (status in ('requested', 'confirmed', 'failed', 'refunded')),
	raw jsonb,                                    -- 토스 응답 원본(디버깅·정산)
	created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

-- 읽기만: 자기 결제 이력. (쓰기는 service_role 서버 라우트만)
drop policy if exists "payments_self_read" on public.payments;
create policy "payments_self_read"
	on public.payments for select
	using (auth.uid() = user_id);
