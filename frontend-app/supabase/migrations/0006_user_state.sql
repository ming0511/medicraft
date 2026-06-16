-- MediCraft Pro: 학습 상태 크로스기기 동기화
-- Supabase 대시보드 SQL Editor 에 붙여넣고 실행 (0001~0003 이후)
--
-- 진행도/SRS/통계 등 여러 localStorage 키를 유저당 한 행의 JSONB 블롭으로 미러링.
-- 정규화 대신 블롭 미러 = localStorage 모양 그대로 보존 + last-write-wins(updated_at) 충돌 해결.
-- profiles/consents 는 기존 전용 테이블 유지(여기서 중복 저장 안 함).

-- ── user_state ────────────────────────────────────────
create table if not exists public.user_state (
	id uuid primary key references auth.users(id) on delete cascade,
	state jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "user_state_self_read" on public.user_state;
create policy "user_state_self_read"
	on public.user_state for select
	using (auth.uid() = id);

drop policy if exists "user_state_self_insert" on public.user_state;
create policy "user_state_self_insert"
	on public.user_state for insert
	with check (auth.uid() = id);

drop policy if exists "user_state_self_update" on public.user_state;
create policy "user_state_self_update"
	on public.user_state for update
	using (auth.uid() = id);

-- 테이블 수준 GRANT (0003 참고 — 행 접근은 RLS 가 계속 본인 행으로 제한)
grant select, insert, update on public.user_state to authenticated;
grant all on public.user_state to service_role;
