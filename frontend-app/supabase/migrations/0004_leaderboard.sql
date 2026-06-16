-- MediCraft Pro: 랭킹(리더보드)
-- Supabase 대시보드 SQL Editor 에 붙여넣고 실행 (0001~0003 이후)

-- ── profiles 에 점수 컬럼 추가 ──────────────────────────
alter table public.profiles
	add column if not exists xp integer not null default 0,
	add column if not exists stats_updated_at timestamptz;

-- ── 랭킹 표시용 전체 읽기 정책 ──────────────────────────
-- 랭킹은 로그인한 모든 사용자가 서로의 점수를 볼 수 있어야 함.
-- profiles 에는 닉네임·학교·캐릭터·XP 등 랭킹 표시용 공개 데이터만 있음.
-- 기존 self-read 정책을 모두-read 로 교체.
drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all"
	on public.profiles for select
	to authenticated
	using (true);

-- 정렬 가속 인덱스
create index if not exists profiles_xp_idx on public.profiles (xp desc);
