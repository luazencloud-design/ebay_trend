# K-Trend — eBay 한국 상품 트렌드 대시보드

eBay에서 잘 팔리는 한국 상품 트렌드를 **카테고리 → 브랜드 → 상품 → 소싱처** 흐름으로 보여주는 웹사이트입니다.
매주 AI(Gemini)가 자동으로 데이터를 갱신하고, 정적 사이트로 배포됩니다.

> 이 문서 하나로 처음 보는 사람도 세팅·실행·구조 파악·운영까지 할 수 있도록 작성했습니다.
> 순서대로 읽으세요.

---

## 0. 30초 요약 (전체 그림)

```
[매주 월요일 새벽]
  GitHub Actions가 Gemini API 호출
        ↓
  public/data/{날짜}/ 에 CSV 5개 + JSON 2개 생성
        ↓
  git에 자동 커밋 & push
        ↓
[Vercel]  push 감지 → 자동 재배포
        ↓
[사용자]  웹사이트에서 최신 트렌드 열람
```

- **프론트엔드**: React + TypeScript + Vite (정적 사이트, 백엔드 없음)
- **데이터**: AI가 만든 CSV 파일 (DB 없음 — git이 곧 DB)
- **자동화**: GitHub Actions cron (주 1회)
- **호스팅**: Vercel (정적 배포)
- **운영비**: Gemini API 호출 비용만 (주 1회 ~₩2,000)

---

## 1. 빠른 시작 (로컬에서 띄우기)

### 사전 준비물
- **Node.js 20 이상** (`node -v`로 확인) — `--env-file` 플래그를 쓰기 때문에 20.6+ 필요
- **git**
- (데이터 직접 생성할 때만) **Gemini API 키**

### 설치 & 실행
```bash
# 1. 저장소 클론
git clone https://github.com/luazencloud-design/ebay_trend.git
cd ebay_trend

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```
→ 브라우저에서 `http://localhost:5173` 자동으로 열립니다.

이미 `public/data/`에 데이터가 들어있어서 **API 키 없이도 사이트는 바로 보입니다.**
(데이터를 직접 새로 만들고 싶을 때만 2번 섹션의 Gemini 설정이 필요)

### 프로덕션 빌드 확인
```bash
npm run build      # 타입체크 + 빌드 → dist/ 생성
npm run preview    # 빌드 결과를 로컬에서 미리보기
```

---

## 2. Gemini 데이터 생성 (선택 — 데이터를 직접 갱신할 때)

평소엔 GitHub Actions가 자동으로 하므로 **건드릴 일이 거의 없습니다.**
로컬에서 직접 돌려보고 싶을 때만 아래를 따라하세요.

### 2-1. API 키 발급
1. https://aistudio.google.com/apikey 에서 키 발급
2. **결제 활성화** 필수: https://aistudio.google.com/usage
   - 무료 한도로는 grounding(검색)이 안 됨
   - **월 지출 한도(spend cap)를 ₩50,000 이상**으로 설정 권장 (실사용 ~₩8,000)

### 2-2. .env 파일 생성
```bash
cp .env.example .env
# .env 파일을 열어서 GEMINI_API_KEY=AIza... 채우기
```

### 2-3. 리서치 실행
```bash
npm run research              # Hybrid — 프로덕션이 쓰는 표준. 이것만 쓰면 됨
```
단계별로 모델이 이미 최적화돼 있습니다 (4-3 표 참고). `research:flash-only`는
categories 단계까지 Flash로 내려 가장 싸게 돌리는 옵션이지만 인사이트 품질이
떨어져 평소엔 쓰지 않습니다.

옵션:
```bash
# 특정 날짜로 저장 (테스트/백필용)
node --env-file=.env scripts/daily-research.mjs --date 2026-06-22
```

실행하면 `public/data/{오늘날짜}/` 폴더에 데이터가 생기고, 끝에 **사용 토큰 + 비용**이 출력됩니다.
소요 시간 ~8-10분, 비용 ~$1.5 (~₩2,000).

### 2-4. 목(mock) 데이터 생성 (API 키 없이 테스트)
```bash
npm run gen:mock   # 가짜 데이터로 public/data/ 채우기 (개발/디자인 테스트용)
```
⚠️ `gen:mock`은 `public/data/`를 **전부 지우고** 새로 만듭니다. 진짜 데이터가 있으면 주의.

---

## 3. 프로젝트 구조

### 3-1. 최상위
```
ebay_trend/
├── README.md                  ← 이 문서
├── PLAN.md                    ← 초기 기획서 + 구현 현황
├── package.json               ← 의존성 + npm 스크립트
├── vite.config.ts             ← Vite 빌드 설정
├── tsconfig.json              ← TypeScript 설정
├── vercel.json                ← Vercel 배포 설정 (SPA 라우팅 + 캐시 헤더)
├── index.html                 ← 앱 진입 HTML (폰트 CDN 로드)
├── .env.example               ← 환경변수 템플릿 (.env는 git 제외)
├── .github/workflows/
│   └── daily-research.yml     ← 주간 자동 데이터 갱신 워크플로
├── src/                       ← 프론트엔드 소스 (아래 3-2)
├── scripts/                   ← 데이터 생성 파이프라인 (아래 3-3)
└── public/data/               ← 생성된 데이터 (아래 3-4)
```

### 3-2. 프론트엔드 (`src/`)

```
src/
├── main.tsx                   ← React 엔트리포인트 (#root에 App 마운트)
├── App.tsx                    ← 루트: 라우팅 + 데이터 manifest 로드 + 레이아웃
├── types.ts                   ← 전체 TypeScript 타입 정의 (데이터 스키마)
├── vite-env.d.ts              ← Vite 타입 보강
│
├── views/                     ← 페이지 단위 컴포넌트
│   ├── Stage1Dashboard.tsx    ← [1단계] 카테고리 랭킹 그리드 (메인)
│   ├── Stage2Category.tsx     ← [2단계] 카테고리 상세 (브랜드/상품/소싱처 3분할)
│   ├── Stage3Sourcing.tsx     ← [3단계] 소싱처별 추천 상품 리스트
│   └── OnboardingPage.tsx     ← 초보 셀러 시작 가이드 (정적 콘텐츠)
│
├── components/                ← 재사용 UI 조각
│   ├── Topbar.tsx             ← 상단 네비게이션 (대시보드/시작가이드)
│   ├── DateSelector.tsx       ← 날짜(주차) 선택 캘린더 드롭다운
│   ├── CalendarPicker.tsx     ← 주차 리스트 캘린더 (DateSelector 내부)
│   ├── AIInsights.tsx         ← AI 인사이트 카드 (이번주/이번달/올해 탭)
│   ├── CategoryCard.tsx       ← 카테고리 카드 (Stage1 그리드 아이템)
│   ├── ProductCard.tsx        ← 상품 행 (Stage3 리스트 아이템)
│   ├── RankRow.tsx            ← 브랜드/상품/소싱처 공용 랭킹 행 (Stage2)
│   ├── Panel.tsx              ← Stage2 3분할 패널 컨테이너
│   ├── Toolbar.tsx            ← 필터/정렬 툴바 (+ Group/Btn/Spacer)
│   ├── Crumb.tsx              ← 브레드크럼 네비게이션
│   ├── Change.tsx             ← 순위 변동 배지 (▲▼)
│   ├── Competition.tsx        ← 경쟁강도 막대 (★)
│   ├── MarginBar.tsx          ← 마진율 막대 그래프
│   ├── ZonePill.tsx           ← 레드존/블루존 배지
│   ├── SurgeBadge.tsx         ← 급상승 배지 (변동 +4 이상)
│   ├── MiniBadge.tsx          ← NEW/HOT 미니 배지
│   ├── Reliability.tsx        ← 소싱처 신뢰도 별점
│   ├── Sparkline.tsx          ← 미니 추세 그래프 (SVG)
│   ├── TrendChart.tsx         ← Stage2 트렌드 차트 (SVG)
│   ├── HintBanner.tsx         ← 안내 배너 (insights 없을 때 폴백)
│   ├── TweaksPanel.tsx        ← 우하단 ⚙ 설정 (타이포/카드 밀도)
│   └── icons/index.tsx        ← SVG 아이콘 모음
│
├── hooks/                     ← React 커스텀 훅
│   ├── useAsync.ts            ← 비동기 데이터 로딩 (loading/error/data)
│   ├── useHistoryRoute.ts     ← 브라우저 히스토리 기반 라우팅 (뒤로가기 지원)
│   └── useTweaks.ts           ← 타이포/밀도 설정 (localStorage 영구화)
│
├── lib/                       ← 순수 유틸 (UI 아님)
│   ├── data-loader.ts         ← CSV/JSON fetch + 파싱 + 캐시
│   ├── csv-parser.ts          ← 브라우저용 CSV 파서
│   ├── url-route.ts           ← URL ↔ Route 객체 변환
│   └── format.ts             ← 통화/숫자 포맷, className 유틸(cx)
│
├── data/
│   └── onboarding-content.ts  ← 시작 가이드 콘텐츠 (하드코딩, AI 아님)
│
└── styles/
    └── index.css              ← 전체 스타일 (디자인 시스템 + 모든 컴포넌트)
```

### 3-3. 데이터 파이프라인 (`scripts/`)

```
scripts/
├── daily-research.mjs         ← ★ 메인 파이프라인 (Gemini 호출 → CSV 생성)
├── generate-mock-data.mjs     ← 목 데이터 생성 (API 키 없이 테스트용)
├── compact-snapshots.mjs      ← 오래된 스냅샷 압축 (저장공간 관리)
├── canonical-categories.json  ← ★ 고정 카테고리 목록 (이름 잠금 — 4번 섹션)
├── gemini-prompts.md          ← 프롬프트 위치 안내
└── lib/
    ├── gemini-client.mjs      ← Gemini SDK 래퍼 (재시도/백오프/토큰추적/병렬)
    ├── csv.mjs                ← Node용 CSV 읽기/쓰기
    └── manifest.mjs           ← public/data/index.json 생성 (날짜 목록)
```

### 3-4. 생성된 데이터 (`public/data/`)

```
public/data/
├── index.json                 ← 사용 가능한 스냅샷 날짜 목록 (프론트가 먼저 읽음)
├── latest.json                ← 최신 스냅샷 날짜 포인터
├── 2025-final/                ← 2025 연간 결산 (고정)
└── 2026-06-15/                ← 주간 스냅샷 (월요일마다 새 폴더)
    ├── categories.csv         ← 카테고리 30개 (순위/변동/마진/요약)
    ├── brands.csv             ← 브랜드 600개 (카테고리당 20)
    ├── products.csv           ← 상품 900개 (카테고리당 30)
    ├── sourcing.csv           ← 소싱처 300개 (카테고리당 10)
    ├── insights.json          ← AI 인사이트 (이번주/이번달/올해)
    └── meta.json              ← 생성 시각 + 사용 모델 기록
```

---

## 4. 핵심 개념 (반드시 이해할 것)

### 4-1. 고정 카테고리 (Canonical Categories)
`scripts/canonical-categories.json`에 30개 카테고리가 **slug + 한글/영문 이름**과 함께 정의돼 있습니다.

- **이름은 한 번 정해지면 절대 바뀌면 안 됩니다.** Gemini가 매주 카테고리를 새로 지어내면, 같은 카테고리가 "수집용 트레이딩 카드" → "트카"처럼 이름이 흔들려서 **주간 순위 비교가 깨집니다.**
- 그래서 Gemini는 이 목록을 받아서 **순위만 매기고**, 진짜 새 트렌드를 발견하면 **새 항목을 추가**할 수 있습니다 (자동으로 이 파일에 누적, 안전상한 주 10개).
- **수동 편집 규칙: 행 추가/삭제는 OK, 기존 이름 변경은 금지.**

### 4-2. 순위 변동은 "계산"한다 (AI가 지어내지 않음)
`change`(▲▼ 순위 변동) 값은 Gemini가 추정하지 않습니다. 코드가 **이전 주 스냅샷과 직접 비교**해서 계산합니다:
```
change = 이전순위 − 현재순위   (+면 상승 ▲, -면 하락 ▼)
```
이전 주에 없던 신규 항목은 `change = 0`. (`scripts/daily-research.mjs`의 `applyRealChange`)

### 4-3. 모델 선택 (Hybrid)
단계마다 다른 모델/설정을 씁니다 — 정확성이 필요한 곳만 비싸게:

| 단계 | 모델 | Grounding(검색) | 이유 |
|---|---|---|---|
| ① categories | Pro | ✅ | 실제 트렌드 + 한국어 요약 품질 |
| ② brands | Pro | ✅ | 실재하는 브랜드 검증 |
| ③ sourcing | Flash | ❌ | URL 미표시라 검증 불필요 |
| ④ products | Flash | ❌ | 상류에서 검증된 브랜드 기반이라 충분 |
| ④b insights | Pro | ❌ | 한국어 인사이트 품질 |

> `grounding`(Google 검색)은 정확하지만 느리고 비쌉니다. categories/brands에만 씁니다.

### 4-4. 안전장치
- **원자적 쓰기**: `public/data/.{날짜}.tmp/`에 먼저 다 만들고, 전부 성공해야 진짜 폴더로 교체. 중간 실패 시 이전 데이터 그대로 유지.
- **재시도**: 429(한도)/503(과부하)/timeout 자동 재시도. 503은 긴 백오프(20~100초).
- **병렬 실행**: 배치를 동시 호출 (`pMap`, 동시성 6). 순차 대비 ~4배 빠름.

---

## 5. 운영 (GitHub Actions 자동화)

### 5-1. 작동 방식
`.github/workflows/daily-research.yml`:
- **매주 월요일 01:00 KST** 자동 실행 (cron: `0 16 * * 0` = 일요일 16:00 UTC)
- `npm run research` 실행 → 데이터 생성 → 자동 git commit & push
- Actions 탭에서 **수동 실행(Run workflow)**도 가능 (날짜 입력 옵션)

### 5-2. 필수 설정 (최초 1회)
GitHub 저장소 → Settings → Secrets and variables → Actions:
- **`GEMINI_API_KEY`** 시크릿 등록 (필수)

### 5-3. 수동으로 한 번 돌리기
GitHub 저장소 → Actions 탭 → "Weekly Gemini Research" → Run workflow

### 5-4. 비용
- 주 1회 실행 = **~$1.5/회 (~₩2,000)**, 월 ~₩8,000
- 토큰 사용량은 실행 로그 마지막에 모델별로 출력됨
- ⚠️ Gemini spend cap에 걸리면 429로 실패 → AI Studio에서 한도 확인

---

## 6. 배포 (Vercel)

- GitHub `main` 브랜치에 push → Vercel이 자동 감지 → 재배포 (~1분)
- 설정: `vercel.json` (SPA fallback + 캐시 헤더)
  - Framework Preset: **Vite**
  - Build Command: `npm run build`
  - Output Directory: `dist`
- 별도 백엔드/환경변수 불필요 (프론트는 API 키를 쓰지 않음)

---

## 7. 자주 하는 작업 (Cheatsheet)

| 하고 싶은 것 | 명령/방법 |
|---|---|
| 로컬에서 사이트 보기 | `npm run dev` |
| 빌드 검증 | `npm run build` |
| 타입만 체크 | `npm run typecheck` |
| 데이터 직접 생성 | `npm run research` (`.env` 필요) |
| 목 데이터로 테스트 | `npm run gen:mock` |
| 카테고리 추가/삭제 | `scripts/canonical-categories.json` 편집 (이름 변경 금지) |
| 프롬프트 수정 | `scripts/daily-research.mjs`의 `prompt*()` 함수들 |
| 시작 가이드 내용 수정 | `src/data/onboarding-content.ts` |
| 스타일 수정 | `src/styles/index.css` |
| cron 주기 변경 | `.github/workflows/daily-research.yml`의 `cron` |

---

## 8. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `npm run research` → `GEMINI_API_KEY not set` | `.env` 파일 없거나 키 비어있음 |
| 실행 중 `429 ... spending cap` | Gemini 월 한도 초과 → AI Studio에서 한도 상향 |
| 실행 중 `503 high demand` | Gemini 서버 일시 과부하 → 자동 재시도함. 계속되면 잠시 후 재실행 |
| Actions가 45/90분 timeout | 호출 누적 지연 → 보통 자동 재시도로 해결. `timeout-minutes` 조정 가능 |
| 카테고리가 매주 "신규"로만 뜸 | canonical 이름이 바뀐 것 → `canonical-categories.json` 확인 |
| 사이트에 빈 카테고리 | 데이터 생성이 중간 실패 → 원자적 쓰기로 방지되지만, 의심되면 재실행 |
| 로컬에서 `file://`로 열면 안 됨 | 반드시 `npm run dev` 또는 `npm run preview`로 (CORS) |

---

## 9. 기술 스택 한눈에

| 영역 | 기술 |
|---|---|
| 빌드 | Vite 5 |
| 프론트 | React 18 + TypeScript 5 |
| 스타일 | 순수 CSS (oklch 색공간, CSS 변수) |
| 폰트 | Pretendard + JetBrains Mono (CDN) |
| 데이터 | CSV/JSON 정적 파일 (DB 없음) |
| AI | Google Gemini 2.5 (Pro/Flash) + Search grounding |
| 자동화 | GitHub Actions (cron) |
| 호스팅 | Vercel |

---

## 10. 더 읽을거리
- [PLAN.md](PLAN.md) — 초기 기획 의도 + 데이터 모델 + 압축 정책 상세
- [scripts/gemini-prompts.md](scripts/gemini-prompts.md) — 프롬프트 위치 안내
- 코드 내 주석 — 핵심 로직마다 "왜 이렇게 했는지" 설명 달려 있음
