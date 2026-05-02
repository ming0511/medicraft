# MediCraft Pro

의학 용어 어원 조합 퍼즐 학습 모바일 웹앱. 의생명 전공자가 캠퍼스→병원을 무대로 한 사이드뷰 RPG 안에서 라틴/그리스 어원을 조합해 의학 용어를 학습.

## Status

이전 버전(macOS 스타일 학습 대시보드, https://github.com/ming0511/medicraft)에서 모바일 사이드뷰 RPG 컨셉으로 전면 리디자인 중. 현재 라우트는 비워졌고, 인프라(SvelteKit/Tailwind/Paraglide/PWA)와 데이터 자산(`src/lib/data/`, `src/lib/stores/`)만 보존.

## 기획서

- [`wireframes/pro-mobile.html`](wireframes/pro-mobile.html) — 6개 화면(랜딩 → 온보딩 → 캠퍼스맵 → 강의실 → 도서관 → 병동전투) + 5가지 구조 결정

### 5가지 구조 결정 (확정)

1. **화면 분할**: 게임뷰 50% · UI 50%
2. **캠퍼스 동선**: 좌우 스크롤 1축 (학교 ↔ 병원)
3. **모드 진입**: 풀스크린 씬 전환 (모달 X)
4. **컨트롤**: 탭(자동이동) + 스와이프(카메라)
5. **전투 구도**: JRPG 사이드뷰 (좌 플레이어 · 우 환자)

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes 문법: `$state`, `$props`, `$derived`)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` 플러그인)
- **i18n**: Paraglide.js (ko/en, `frontend-app/messages/`)
- **PWA**: 모바일 홈 화면 설치 지원 (`static/manifest.json`, `src/service-worker.ts`)
- **Deploy**: Vercel (`@sveltejs/adapter-vercel`)
- **Package Manager**: pnpm (workspace)

## Project Structure

```
medicraft/
├── wireframes/
│   └── pro-mobile.html       # MediCraft Pro 기획서 (절대 기준)
├── frontend-app/
│   ├── src/
│   │   ├── routes/           # 새 디자인 라우트 (구축 중)
│   │   ├── lib/
│   │   │   ├── data/terms.ts       # 의학 용어 데이터 (보존)
│   │   │   ├── stores/             # SRS 알고리즘·통계 (보존)
│   │   │   └── paraglide/          # i18n 자동 생성 (수정 금지)
│   │   ├── service-worker.ts
│   │   ├── hooks.server.ts
│   │   └── hooks.ts                # paraglide reroute
│   ├── messages/             # 번역 파일 (ko.json, en.json)
│   └── static/               # 아이콘·manifest
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

## Conventions

- **타깃 폼팩터**: 모바일 전용. 데스크톱은 `max-w-[420px]` 가운데 정렬만 (PC 전용 레이아웃 없음)
- **비주얼**: 사이드뷰 ASCII 아트 + 모노스페이스 텍스트 UI. 박스 드로잉 문자(`┌┐└┘│─`), chunky 검정 테두리 + 3px offset 그림자, 흑백 베이스. 와이어프레임 자체가 톤매너의 기준
- 한국어 UI 기본, Paraglide.js로 다국어 지원
- 데이터 저장: localStorage (백엔드 없음)
- Git 브랜치: `develop` → `main` 머지 방식
