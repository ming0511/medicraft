-- MediCraft Pro: Data API 롤 권한 부여(GRANT)
-- Supabase 대시보드 SQL Editor 에 붙여넣고 실행 (0001, 0002 이후)
--
-- 배경: 프로젝트 생성 시 "Automatically expose new tables" 를 끄면(권장),
--   새 테이블에 API 롤(anon/authenticated/service_role)의 테이블 권한이
--   자동 부여되지 않는다. RLS 정책(행 수준)과 별개로, 테이블 수준 GRANT 가 없으면
--   PostgREST 가 "permission denied for table" (42501) 로 막힌다.
--   아래에서 필요한 만큼만 명시적으로 부여한다. 행 수준 접근은 RLS 가 계속 제한한다.

-- ── authenticated (로그인 사용자) ──────────────────────
-- RLS 정책이 auth.uid() = 본인 행만 허용하므로, GRANT 해도 남의 행은 못 본다.
grant select, insert, update on public.profiles     to authenticated;
grant select, insert         on public.consents      to authenticated;
grant select                 on public.entitlements   to authenticated;  -- 쓰기는 service_role 만
grant select                 on public.payments       to authenticated;  -- 쓰기는 service_role 만

-- bigserial PK 삽입에 필요한 시퀀스 사용권 (consents.id)
grant usage, select on sequence public.consents_id_seq to authenticated;

-- ── service_role (서버 라우트: 결제 승인 후 기록, RLS 우회) ──
grant all on public.profiles, public.consents, public.entitlements, public.payments to service_role;
grant usage, select on all sequences in schema public to service_role;
