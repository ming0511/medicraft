# Google 로그인 + 결제 실제 동작시키기

코드는 전부 구현돼 있다(Supabase SSR 인증 · Google OAuth · 토스 결제 위젯 · 서버 승인 · entitlements/RLS · 웹훅). **남은 건 외부 계정/키 설정뿐.** 값이 비면 기능이 graceful no-op 되도록 짜여 있어, 아래를 채우는 순간 켜진다.

키는 전부 `frontend-app/.env` 에 넣는다(이미 스캐폴드 생성됨, gitignore 됨).

---

## 1. Supabase 프로젝트 (로그인·결제 권한의 백엔드)

### 1-1. 프로젝트 생성
1. https://supabase.com → 로그인 → **New project**
2. 이름/DB 비밀번호/리전(Northeast Asia – Seoul `ap-northeast-2` 권장) 입력 → 생성(1~2분)

### 1-2. 키 복사 → `.env`
**Project Settings → API Keys** 에서:
| 대시보드 | `.env` 키 |
|---|---|
| Project URL | `PUBLIC_SUPABASE_URL` |
| `anon` `public` | `PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> service_role 은 RLS를 우회하는 마스터 키 — 서버 전용. 절대 커밋/클라이언트 노출 금지.

### 1-3. 마이그레이션 적용 (테이블·RLS 생성)
**SQL Editor → New query** 에 아래 파일 내용을 **순서대로** 붙여넣고 Run:
1. `frontend-app/supabase/migrations/0001_auth_consents.sql` (profiles, consents)
2. `frontend-app/supabase/migrations/0002_payments.sql` (entitlements, payments)
3. `frontend-app/supabase/migrations/0003_grants.sql` (테이블 권한)
4. `frontend-app/supabase/migrations/0004_leaderboard.sql` (랭킹: profiles 점수 컬럼 + 전체 읽기 정책)
5. `frontend-app/supabase/migrations/0005_user_state.sql` (학습 상태 크로스기기 동기화: user_state 블롭)

생성되는 것: `profiles` `consents` `entitlements` `payments` `user_state` 테이블 + RLS 정책(본인 행만 쓰기, 결제 권한 쓰기는 service_role만) + 가입 트리거. 랭킹용으로 `profiles` 는 로그인 사용자 전체가 서로 읽을 수 있음(닉네임·학교·캐릭터·XP). `user_state` 는 진행도·SRS·통계 등 localStorage 학습 상태를 유저당 한 행(JSONB)에 미러링 → 다른 기기/캐시 삭제 후에도 복원.

---

## 2. Google OAuth (Google으로 시작 버튼)

Google 로그인 = Google Cloud의 OAuth 클라이언트를 Supabase가 중개하는 구조. 둘 다 설정해야 한다.

### 2-1. Google Cloud Console — OAuth 클라이언트 만들기
1. https://console.cloud.google.com → 프로젝트 생성/선택
2. **APIs & Services → OAuth consent screen** → External → 앱 이름/지원 이메일 입력 → 저장 (테스트 단계면 Publishing status는 Testing이어도 됨, 단 테스트 사용자에 본인 이메일 추가)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** 에 Supabase 콜백 추가:
     ```
     https://<프로젝트-ref>.supabase.co/auth/v1/callback
     ```
     (`<프로젝트-ref>` = Project URL의 서브도메인. Supabase Auth → Providers → Google 화면에도 이 URL이 안내된다 — 그대로 복사)
   - 생성 후 **Client ID** 와 **Client secret** 복사

### 2-2. Supabase — Google provider 켜기
1. Supabase **Authentication → Sign In / Providers → Google** → Enable
2. 위에서 받은 **Client ID / Client Secret** 붙여넣기 → 저장

### 2-3. Supabase — Redirect 허용 목록 (필수)
**Authentication → URL Configuration**:
- **Site URL**: 개발 중엔 `http://localhost:5173` (배포 후 운영 도메인으로 변경)
- **Redirect URLs** 에 추가:
  ```
  http://localhost:5173/**
  https://<운영도메인>/**
  ```
앱이 `signInWithOAuth` 에서 `redirectTo=<origin>/auth/callback?next=/onboarding` 로 돌아오는데, origin이 허용 목록에 없으면 Supabase가 거부한다.

### 동작 흐름 (코드상 이미 연결됨)
랜딩 `Google으로 시작` → `signInWithOAuth({provider:'google'})` → Google 동의 → `/auth/callback` 의 `exchangeCodeForSession` → 세션 쿠키 → `/onboarding`. 온보딩에서 프로필/동의가 `profiles`·`consents`에 저장됨.

---

## 3. 토스페이먼츠 (결제)

### 지금 당장 (가짜 결제 스모크 테스트)
`.env`에 이미 토스 공개 docs 테스트 키가 들어 있다 → 결제 위젯이 뜨고 전 플로우(승인→entitlements 부여→해금)가 가짜 결제로 동작한다. **단, 결제는 로그인 필요** → 1·2번(Supabase+Google)이 먼저 켜져야 결제까지 테스트 가능.

### 진짜 결제로 전환 (요청하신 목표)
실결제는 **가맹점 심사**를 거쳐야 하므로 사업자 정보가 필요하다(코드는 그대로, 키만 교체):
1. https://app.tosspayments.com/signup 가입 → 개발자센터
2. **내 개발정보 → API 키** 에서 **내 상점의 테스트 키**(`test_gck_…`/`test_gsk_…`)로 먼저 교체해 실제 내 상점 환경에서 테스트
3. **전자결제(PG) 신청** → 사업자등록·정산계좌 등 심사 → 승인되면 **라이브 키**(`live_gck_…`/`live_gsk_…`) 발급
4. `.env`의 `PUBLIC_TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`를 라이브 키로 교체 → 운영 배포

> 클라이언트 키(`PUBLIC_`)는 브라우저 노출 OK, 시크릿 키는 서버 전용. 금액 위변조는 서버(`confirmAndGrant`)가 카탈로그(`products.ts`) 가격과 대조해 막는다.

### 웹훅 (취소·환불 동기화, 선택)
토스 개발자센터 **→ 웹훅** 에 등록:
```
https://<운영도메인>/api/payments/webhook
```
취소/부분취소 이벤트 시 해당 entitlement를 `refunded`로 회수한다. (로컬 테스트는 ngrok 등으로 터널링)

---

## 4. 배포 (Vercel) 환경변수
로컬 `.env`의 4개 키(+토스 2개)를 Vercel **Project → Settings → Environment Variables** 에도 동일하게 등록. `PUBLIC_` 접두는 빌드 시 클라이언트 번들에 들어가고, 나머지(`SUPABASE_SERVICE_ROLE_KEY`, `TOSS_SECRET_KEY`)는 서버 런타임 전용으로만 노출된다. 배포 후 Supabase Site URL / Redirect URLs / Google redirect URI를 운영 도메인으로도 추가.

---

## 체크리스트
- [ ] Supabase 프로젝트 생성 + URL/anon/service_role → `.env`
- [ ] 마이그레이션 0001, 0002, 0003, 0004, 0005 SQL Editor 실행
- [ ] Google Cloud OAuth 클라이언트 + redirect URI(`.../auth/v1/callback`)
- [ ] Supabase Google provider에 Client ID/Secret
- [ ] Supabase Site URL + Redirect URLs(`localhost:5173/**`)
- [ ] `pnpm dev` → 랜딩에서 Google 로그인 → 온보딩 진입 확인
- [ ] 결제: docs 테스트 키로 해금 플로우 확인 → 이후 내 상점/라이브 키로 교체
- [ ] (배포 시) Vercel 환경변수 + 운영 도메인 redirect 등록
