-- MediCraft Pro Phase 1: 프로필 + 동의사항
-- Supabase 대시보드 SQL Editor 에 붙여넣고 실행

-- ── profiles ──────────────────────────────────────────
create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	nickname text,
	school text,
	character smallint check (character between 0 and 3),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
	on public.profiles for select
	using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
	on public.profiles for insert
	with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
	on public.profiles for update
	using (auth.uid() = id);

-- ── consents (감사 로그: 동의 이력 누적, 갱신 안 함) ───
create table if not exists public.consents (
	id bigserial primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	doc text not null check (doc in ('terms', 'privacy', 'age_14', 'marketing')),
	version text not null,
	agreed boolean not null,
	agreed_at timestamptz not null default now()
);

create index if not exists consents_user_doc_idx
	on public.consents (user_id, doc, agreed_at desc);

alter table public.consents enable row level security;

drop policy if exists "consents_self_read" on public.consents;
create policy "consents_self_read"
	on public.consents for select
	using (auth.uid() = user_id);

drop policy if exists "consents_self_insert" on public.consents;
create policy "consents_self_insert"
	on public.consents for insert
	with check (auth.uid() = user_id);

-- ── auth.users 트리거: 가입 시 profiles 빈 행 생성 (옵션) ──
-- 온보딩에서 upsert 하므로 필수는 아니지만, RLS 정책상 행이 미리 있어도 무해.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();
