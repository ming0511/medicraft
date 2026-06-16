# Phase 1 셋업 — Supabase + Google OAuth + 동의사항

> 코드는 다 들어가 있음. **외부 설정**만 하면 동작함. 30~40분.

## 1. Supabase 프로젝트 생성

1. https://supabase.com 로그인 → New Project
2. Region: `Northeast Asia (Seoul)` 권장 (ap-northeast-2)
3. DB 비밀번호 안전한 곳에 저장
4. 프로젝트 생성 완료까지 ~2분

## 2. DB 스키마 적용

1. Supabase 대시보드 → SQL Editor → New query
2. `frontend-app/supabase/migrations/0001_auth_consents.sql` 전체 복사·붙여넣기
3. Run

확인: Table Editor 에서 `profiles`, `consents` 테이블 보이고 자물쇠(🔒) 아이콘으로 RLS 활성화 표시.

## 3. Google Cloud OAuth 클라이언트

1. https://console.cloud.google.com 새 프로젝트 (또는 기존)
2. **APIs & Services → OAuth consent screen**
   - User type: External
   - 앱 이름: `MediCraft Pro`
   - 사용자 지원 이메일·개발자 연락처: 본인 이메일
   - Scopes: 기본(email, profile, openid) 그대로
   - Test users: 본인 Google 계정 추가 (게시 전엔 여기 등록된 계정만 로그인 가능)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `MediCraft Pro Web`
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - (배포 도메인이 있으면 그것도)
   - Authorized redirect URIs:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
       (Supabase 대시보드 → Authentication → Providers → Google 에서 redirect URL 복사)
4. Client ID + Client Secret 복사

## 4. Supabase 에 Google provider 활성화

1. Supabase 대시보드 → **Authentication → Providers → Google**
2. Enable Sign in with Google: ON
3. Client ID, Client Secret 붙여넣기
4. Authorized Client IDs: (비워둬도 됨)
5. Save

## 5. 로컬 .env 설정

`frontend-app/.env` 파일 생성 (`.env.example` 복사):

```bash
PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (Settings → API → anon public key)
```

Service role key 는 **Phase 1 에선 불필요** (Phase 3 결제 웹훅에서 사용).

## 6. 실행

```bash
cd frontend-app
pnpm dev
```

http://localhost:5173 →
1. "Google로 시작" 클릭 → Google 동의 화면 → 콜백 → `/onboarding`
2. Step 0 동의사항 (전체 동의 또는 필수 3개)
3. Step 1 닉네임·학교
4. Step 2 마스코트
5. 캠퍼스 입장 → Supabase Table Editor 에서 `profiles` 와 `consents` 행 확인

## 7. 배포 시 (Vercel)

- Vercel 환경변수에 `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` 추가
- Google Cloud OAuth client 의 Authorized origins / redirect URIs 에 배포 도메인 추가
- Supabase 대시보드 → Authentication → URL Configuration 의 Site URL 을 배포 도메인으로 설정

## 다음 단계 (이 PR 범위 아님)

- **Phase 2**: 진행도/SRS localStorage → Supabase 마이그레이션 (디바이스 동기화)
- **Phase 3**: 토스 결제 인프라 (SDK + 웹훅 + `orders`/`subscriptions` 테이블)
- **Phase 4**: 보안 점검 (RLS 정책 audit, CSP, 시크릿 노출 검사 등)

## 약관 갱신 시

1. `src/routes/legal/terms/+page.svelte` (또는 privacy) 내용 갱신
2. `src/lib/legal.ts` 의 `version` 을 `v2` 등으로 올림
3. 로그인 시 `consents` 테이블에서 최신 버전 동의 여부 확인 → 미동의면 약관 재동의 화면 노출 (구현 미포함, 갱신 시점에 추가)
