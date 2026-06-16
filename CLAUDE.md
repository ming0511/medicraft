# MediCraft Pro

**어원으로 의학용어를 빠르게 외우게 하는** 모바일 웹앱. 대상은 의생명/의학 계열 전공자(영어 의학용어 ↔ 한국어 + 라틴/그리스 어원).

> **핵심 한 줄** — 어근(어원 조각)에 눈이 익숙해지게 만들고 → 의학용어를 "내가 아는 조각들의 조합"으로 보게 만든다. **조합하는 행위 = 의학용어를 파악하는 행위.**

- **목적** = 의학용어 빠른 암기 (통째 암기 ❌ → 어근 조합으로 *읽어내기* ✅)
- **수단** = 어원 (암기 가속 렌즈)
- **장식** = 게임화 (마스코트·XP·스트릭·랭킹은 동기 장치일 뿐 — 화면의 주인공 자리는 항상 어근/용어)
- **레버리지가 핵심 동기**: "어근 N개 익히면 용어 M개가 그냥 읽힌다." 진척은 *읽히게 된 용어 수*로 보여줌.
- **누적 cadence = 시험(cram)마다, 날(day) 아님**: 다수가 벼락치기로 학습 → 데일리 *습관*을 스파인으로 두면 진다. 스파인은 **"시험을 거칠 때마다 복리로 자라는 어근 자산"** — 통째 암기 벼락치기는 매번 0에서 시작(증발)하지만 어원 벼락치기는 어근을 남겨 다음 시험 범위 절반을 이미 친숙하게 만든다(안티-증발). 데일리/SRS는 스파인이 아니라 *시험 사이 망각 늦추는 얇은 접착제 + 더 일찍 누적하는 선택 경로*로 강등. 벼락치기 모드 = `/emergency`. (정본: PRD 차별점·시나리오 A)

이전엔 게임(캠퍼스 맵·RPG 전투·마스코트)이 주인공이고 의학용어가 그 안의 콘텐츠 소재였는데, 그 목적-수단 위계를 바로 세우는 중. ⚠️ 아래 "현재 구현 상태" 참고 — 코드는 아직 옛 구조라 미스매치가 있음.

> **제품 방향 정본 = [docs/PRD.md](docs/PRD.md).** 아래는 코드 작업용 요약이고, 방향 결정이 충돌하면 PRD가 우선. (출발 서사·타겟·지표·리스크·스코프 경계는 PRD에.)

## 학습 척추 (= 앱의 구조 원칙)

두 모드가 아니라 **하나의 경사로**:

1. **① 어근 친숙화 (어원 학습)** — `hepat/o`→간, `-megaly`→비대 가 즉각 떠오를 때까지. 빠른 드릴 + SRS는 여기. 새 어근이 처음 들어오는 곳. → **강의실**
2. **② 용어 추론 (디코딩, 주 메커니즘)** — 처음 보는 영어 용어를 아는 어근으로 *쪼개 뜻을 읽어낸다*. **가이드된 추론**: 끊는 자리(어근 경계)는 앱이 주고(분해 부담 제거), *조각 뜻 회상 → 전체 뜻 추론*은 사용자가 — 조각 뜻을 보여주느냐가 난이도 축(쉬움=보여줌·이어붙이기 / 보통+=숨김·어근 회상). 출제는 부분 어근이 이미 친숙한 용어 우선(아는 조각 ⊂ 그물) = 레버리지 체감. **뜻→용어 조립(인코딩)은 옵션/심화로 강등.** → **도서관**(차분한 추론 퍼즐) · **병동**(임상 맥락 + 속도).

데이터·도감도 이 원칙을 따름:

- **`morphemes[]` 가 1급 데이터.** `term.parts: morphemeId[]` — 용어 = 어근 조합으로 정의. (어원이 용어의 속성이 아니라, 용어가 어원의 조합)
- **도감 = 어근 도감.** `/dex` = 어근 그리드(Unit별·type별·origin별 + 마스터 ★ 상태). 용어는 그 밑 파생 뷰("이 어근으로 읽히는 용어들"). 진척 지표 = "어근 N개 친숙 · M개 마스터", 뱃지·랭킹도 어근 기준. 어근 = *모으는 자산*(유한·고레버리지), 용어 = 그 자산이 *해금하는 보상*(열린 집합).
- **커리큘럼 = 어원 순서.** Unit 1 = 최빈출 접미·접두(`-itis -osis -ectomy -otomy hyper- hypo- -emia ...`), Unit 2~ 빈도·난이도순. body system(심장학/신경학...)은 학습 순서가 아니라 *필터 태그*.

## 닫힌 루프 (학습 코어를 감싸는 두 면 — 자세한 건 PRD)

- **적응** — "오늘 복습할 어근" 큐가 시간(SRS due)만이 아니라 *약점 점수*(정답률·응답속도·최근등장·간격)로 짜임 = **약점 가중 복습 큐**. due 아니어도 약한 어근을 끌어옴. 별도 버튼/화면 없이 복습 큐 하나에 녹임. 전부 결정적 데이터 분석 — **런타임 LLM 없음.**
- **수확** — 강의자료(PDF/PPT) → 용어 추출 → 어근 분해 → **RAG로 신뢰 출처(NBK) 대조 + citation** → `verified:false` 후보 → *애매한 것만* 사람 편집 → 그물 합류. **AI(LLM)는 오직 여기**(오프라인 콘텐츠 생성: 어근 분해·`meaningKo` 드래프트). 코어 앱 런타임은 결정적. → `scripts/llm-draft-morphemes.mjs`
  - **검증 = 출처와 대조(사람 권위 아님).** 정확성은 RAG·출처가 판정 → 검수자는 정확성 검증자가 아니라 *편집자*(출처없음 go/no-go·뜻 다중 고르기·출처충돌 채택·`meaningKo` 작성). 학습자는 검증 안 시킴(소비자, 선택적 신고만). 자세한 건 PRD 데이터 신뢰성·검수자 역할.
- 수확(입력) ↔ 약점 가중 복습(출력) = 같은 어근 그물 위 두 면. 이 루프가 닫히는 것 자체가 복제 불가 도메인 자산 (수업 평가축 = 도메인 데이터 + 에이전트 + evaluation을 한 줄기로 충족).

## 진짜 일은 셋

(a) 어근 데이터 + 빈도순 커리큘럼, (b) 어근 친숙화 드릴, (c) 용어 추론(디코딩) 인터랙션 — 이 셋을 잘. 나머지(4지선다 RPG 전투·캠퍼스 맵 탐험·랭킹·마스코트·XP)는 chrome — 옷은 얇게. (위 닫힌 루프의 적응·수확은 chrome 아님 — 코어를 감싸는 진짜 일.)

## 현재 구현 상태 (재정립 중)

이전 버전(macOS 스타일 학습 대시보드, https://github.com/ming0511/medicraft) → 픽셀 사이드뷰 RPG 컨셉(`wireframes/pro-mobile.html`, 폐기) → **모던 소프트 앱 톤**(둥근 카드·파스텔 그린·둥근 산세리프·클레이 마스코트, 토스 `동네걷기`/`Greenibble` 류)으로 전 라우트 구현 완료. **시각 톤·인프라(SvelteKit/Tailwind/Paraglide/PWA)는 유지**하되, 위 척추(어근 1급 데이터·친숙화/조합·어근 도감)로 **구조를 재정립하는 중**. 현재 코드의 미스매치(= 해야 할 일):

- **데이터**: `morphemes[]` 1급 + `term.parts: morphemeId[]` 마이그레이션은 됨(현재 ~57용어/~84어근). 남은 일 = 어근당 용어가 2~5개씩 겹치도록 콘텐츠 보강(아직 ~71%가 1회만 등장이라 "해금 그물"이 약함).
- **강의실**: "어원 분해 학습" 라벨인데 실제론 그냥 플래시카드(분해 안 함) → ①어근 친숙화로 재작성.
- **도감**: 용어 리스트가 1급, 어근은 딸린 칩 → 어근 도감으로 뒤집기 (`/dex/[root]`가 이미 어근 상세 형태라 출발점 됨).
- **병동**: 4지선다 JRPG 전투 = 별개 메커니즘 → ②용어 추론(디코딩) 테마로 흡수.
- **캠퍼스 홈**: 주인공이 "XP + 단계 보상바" → "어근 N개 → 용어 M개 해금"으로.

> `wireframes/pro-mobile.html`은 폐기된 픽셀 RPG 기획서 — 더 이상 기준 아님 (히스토리로만 보존). `wireframes/ref-mockups.html`은 게임 UI/UX 패턴 레퍼런스(StS식 어원 카드 조립 / Duolingo식 한 화면 한 개념 / Reigns식 맵).

## 디자인 시스템

- **톤**: 모던 모바일 헬스케어/교육 앱. 밝은 화이트 베이스 + 파스텔 그린 액센트(`--brand: #2fb968`), 둥근 카드(`border-radius` 12~22px), 부드러운 그림자, 필(pill) 버튼. 다크/픽셀/레트로 요소 없음.
- **폰트**: Pretendard Variable (jsdelivr CDN, `layout.css`에서 `@import`).
- **토큰**: `src/routes/layout.css`의 `:root` CSS 변수 (`--brand`, `--ink`, `--mut`, `--card`, `--line`, `--r-lg/md/sm`, `--shadow-*`, `--brand-grad`) + 공통 클래스 `.app-bar` `.card` `.pill-btn(--primary/--ghost)` `.chip` `.tag`. 새 화면은 이 토큰/클래스를 재사용.
- **아이콘**: `src/lib/components/Icon.svelte` — lucide-svelte 래퍼. `<Icon name="flame" size={16} />` (name 목록 = `ICONS` 맵). `currentColor` 상속이라 부모 `color`로 색 지정. 모든 UI 이모지는 이걸로 교체됨. (lucide-svelte dist 가 확장자 없는 import 를 써서 `vite.config.ts`에 `ssr.noExternal: ['lucide-svelte']` 필요)
- **마스코트**: `src/lib/components/Mascot.svelte` — CSS 클레이 블롭 (4색 variant: 0민트/1하늘/2복숭아/3라벤더). `Profile.character`(0~3)가 마스코트 색을 가리킴. **플레이스홀더이며 추후 3D 에셋으로 교체 예정.** 환자 캐릭터는 `src/lib/sprites.ts`의 `patientEmoji`(🤒, 임시).
- **하단 탭**: `src/lib/components/BottomNav.svelte` — 캠퍼스 / 도감 / 랭킹 / 설정.
- 폼팩터: 모바일 전용, 데스크톱은 `max-w-[420px]` 가운데 정렬뿐.

## 화면 구조

(현재 라우트 = 옛 구조. ⟶ 표시는 재정립 방향)

- `/` 랜딩 — 히어로(마스코트) + Google/게스트 CTA (OAuth 미연동, 둘 다 `/onboarding`행). ⟶ "어근 N개 = 용어 M개" 레버리지 훅 노출
- `/onboarding` — Step1 닉네임(필수)·학교(드롭다운, `src/lib/data/schools.ts`) / Step2 마스코트 색 선택
- `/campus` — 홈 대시보드. 현재: 히어로(오늘 익힌 용어 수 + XP + 단계 보상바) → 오늘의 복습 카드 → 모드 리스트. ⟶ 주인공을 "지난 시험들로 모은 어근 N개 → 이번 시험범위 M개가 *이미 풀림*(누적 복리)" + 오늘 복습할 어근(약점 가중)으로. 스트릭은 보조 장식.
- `/bojeongsa` 보정사 시험범위 — **비즈니스 스파인**(PRD §6). 14 신체계통을 1급 커리큘럼으로: 계통별 그물 보유량(빈 계통=보강 타겟, 정직하게 노출) + 사용자 커버율(읽힌 용어/보유 용어). 계통 카드 탭 → `/library?system=<id>`로 그 계통만 디코딩. 데이터·계산 = `src/lib/data/bojeongsa.ts`(순수·결정적). 옛 9 카테고리 → 보정사 14계통 매핑 = 카테고리 + 어근 세분화(간담췌=hepat/chole/pancreat, 외피=cutane). 현재 9계통 보유·5계통 빈칸(내분비·여성생식·임신출산·남성생식·감각). campus에 커버율 카드로 진입.
- `/classroom` 강의실 — **①어근 친숙화**. 어근 단위 플래시카드 SRS, 단방향(앞=어원 폼 → 뒤=한국어 뜻 + 예시 용어 2개), 좌우 스와이프 평가(왼=SRS0/오른=SRS3), 탭=뒤집기, 세션 분량=`DAILY_GOAL`(=10) 남은 만큼(+`EXTRA_BATCH`씩 추가 가능), 큐=due 우선+새 어근(Unit 낮은 순→용어 多). 스펠링/이형태/영문 뜻은 일부러 노출 안 함(스펠링 암기 부담 제거).
- `/library` 도서관 — **②용어 추론 (차분한 디코딩 퍼즐)**. ✅ 디코딩으로 재작성됨: 영어 용어 → (난이도별 분해) → 한국어 뜻 4지선다 → 답 후 분해 공개. 평가는 구성 어근 *전부*의 SRS에 push(닫힌 루프). 난이도 = 조각 뜻 노출 여부 축(쉬움=뜻 표시 / 보통=탭으로 확인 / 어려움=통째). 큐=친숙도 티어 A→B 우선(`decodingQueue`). `?system=<id>` = 보정사 계통 필터, `?d=` = 난이도 자동시작.
- `/ward` 병동 — 현재: JRPG 사이드뷰 환자 진료 4지선다 전투(HP 바, 한→영 = 역방향). ⟶ **②용어 추론 (임상 맥락+속도)** — 환자 증상→영어 용어를 어근으로 디코드, RPG는 옷
- `/dex` 도감 — **어근 도감**. 현재: 학습 용어 카테고리별 리스트 + 검색 + 펼치면 정의·어원 칩(→`/dex/[root]`) + 뱃지. ⟶ 어근 그리드가 1급(Unit/type/origin별, 마스터 ★), 용어는 어근 밑 파생 뷰. `/dex/[root]` = 어원 상세(마스터 ★, 관련 용어) — 이미 이 형태
- `/ranking` 랭킹 — 시상대 + 순위 리스트 (RIVALS는 로컬 시뮬레이션, Phase 2에 실동기화). ⟶ 어근 마스터 수 기준
- `/settings` 설정 — 프로필 편집 · 진행도 요약 · 데이터 초기화
- `/emergency` 응급실 — **벼락치기 모드 (스파인)**. 미구현, campus에서 잠금 노출 = 벼락치기 WTP 훅. 범위 + 남은 시간 입력 → 앱이 결정적으로 레버리지×약점×범위포함도로 정렬한 시간예산 압축 코스("90분: 어근 18개 → 시험범위 64개 커버"). 통째 암기와 달리 어근을 남겨 다음 벼락치기 단축(복리). 런타임 LLM 0. 무료=내장 유닛 범위 / 유료="내 강의자료 업로드"(Phase 2). 진단 쇼크(범위 중 안 외운 수) → 압축코스 → 결제가 한 모드에 흐름.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes: `$state`, `$props`, `$derived`)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + `layout.css` 디자인 토큰
- **i18n**: Paraglide.js (ko/en, `frontend-app/messages/`)
- **PWA**: 모바일 홈 화면 설치 (`static/manifest.json`, `src/service-worker.ts`)
- **Deploy**: Vercel (`@sveltejs/adapter-vercel`)
- **Package Manager**: pnpm (workspace)

## Project Structure

```
medicraft/
├── wireframes/
│   ├── pro-mobile.html          # 폐기된 픽셀 RPG 기획서 (히스토리)
│   └── ref-mockups.html         # 게임 UI/UX 패턴 레퍼런스 (StS / Duolingo / Reigns)
├── frontend-app/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── layout.css            # 디자인 토큰 + 공통 클래스 (수정 시 전 화면 영향)
│   │   │   └── ...                   # 각 화면 +page.svelte
│   │   ├── lib/
│   │   │   ├── components/            # Mascot, BottomNav, Icon
│   │   │   ├── data/                  # terms.ts (의학 용어 — ⟶ morphemes 1급으로 재구성 예정), schools.ts
│   │   │   ├── stores/                # progress / srs / puzzle-stats / profile (localStorage)
│   │   │   ├── sprites.ts             # 환자 이모지 (임시)
│   │   │   └── paraglide/             # i18n 자동 생성 (수정 금지)
│   │   ├── service-worker.ts
│   │   ├── hooks.server.ts
│   │   └── hooks.ts                   # paraglide reroute
│   ├── messages/                # ko.json, en.json
│   └── static/                  # 아이콘·manifest
└── CLAUDE.md
```

## Commands

```bash
cd frontend-app
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm preview      # 빌드 미리보기
pnpm check        # svelte-check 타입 검사
```

## 데이터 신뢰성 (어원·용어 정확성)

의학 학습 앱이라 어원·뜻 정확성이 핵심. 규칙:

- **검증 = 출처와 대조(사람 권위 아님).** 진짜 권위는 누구의 지식이 아니라 인용한 신뢰 출처. "맞는지 아는 것"이 아니라 "출처와 맞춰보는 것" → RAG가 그 대조를 자동화하고 citation을 단다. 어느 출처에도 없으면 **안 가르침**(후보로만). 사람(검수자)은 정확성 검증자가 아니라 *애매한 것 편집자*(출처없음 go/no-go·뜻 다중 고르기·출처충돌 채택·`meaningKo` 작성). 학습자는 검증 안 시킴.
- **외부 자료에서 가져온 항목은 `source` 키 + (검수 전이면) `verified: false`.** `source` 생략 = 직접 큐레이션한 원본 세트(검수됨). `SOURCES` 맵(`morphemes.ts`)에 출처·라이선스 정의 — 설정 화면에 크레딧 노출. 1차 소스 = NBK OER 교재(CC-BY, `scripts/nbk-ch1-wordparts.json`), Wikipedia(CC-BY-SA)는 *대조용만* (ShareAlike 전염 주의 — 직접 합치지 말 것).
- **`meaningKo`는 우리말로 직접 작성** — 영어 뜻 기계번역 금지. 비어 있으면 `learnableMorphemes`에서 빠져 학습 큐에 안 나옴. 영어 `meaning`도 가능하면 우리 표현으로 다시 씀(원본 표현 복사 회피 + CC-BY-SA 회피).
- **`learnableMorphemes`** (= `verified !== false` && `meaningKo` 있음) 만 학습(강의실 큐)에 사용. 후보(`verified: false`)는 도감 검색에만 노출("후보" 배지).
- **`scripts/validate-data.mjs`** (= `pnpm run validate`, `pnpm check`에 포함) — `term.parts` id가 morpheme에 다 존재하는지, 안 쓰이는 morpheme, 빈/깨진 필드, suffix/prefix form 형식 등 검사. 데이터 깨지면 check 실패.
- `scripts/`의 `*.json`은 *워크리스트/참고용* — 자동 파싱이라 잔글리치·원본 오타 가능. 그대로 박지 말고 한 항목씩 검수해서 `morphemes.ts`에 옮길 것.

## Conventions

- 한국어 UI 기본, Paraglide.js로 다국어 지원
- 데이터 저장: localStorage만 (백엔드 없음). 진행도=`medicraft.progress`, 프로필=`medicraft.profile`, 용어 SRS=`mediflash_srs`(어근 SRS는 같은 스토어에 `m:` 접두 키)
- 새 화면/기능은 위 "학습 척추" 원칙에 비춰볼 것 — 어근/용어가 주인공인가?
- Git 브랜치: `develop` → `main` 머지 방식
