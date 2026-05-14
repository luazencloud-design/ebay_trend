# K-Trend

eBay 셀러를 위한 한국 상품 트렌드 리서치 워크벤치. Gemini가 매일 1회 리서치 결과를 JSON으로 떨궈주면, 정적 React SPA가 그걸 카테고리 → 브랜드 → 상품 → 소싱처 → 추천 상품 순으로 보여줍니다.

전체 기획 의도와 정책은 [PLAN.md](PLAN.md) 참조.

## 빠른 시작

```bash
npm install          # 의존성 설치
npm run gen:mock     # public/data/에 목 JSON 생성 (이미 들어가 있음)
npm run dev          # 개발 서버 (http://localhost:5173)
```

## Gemini 연동 (실제 데이터)

1. **API 키 발급**: https://aistudio.google.com/apikey
2. **.env 파일 생성**:
   ```bash
   cp .env.example .env
   # .env 파일을 열어 GEMINI_API_KEY=... 채우기
   ```
3. **리서치 실행** (Hybrid 모드, 기본):
   ```bash
   npm run research              # 4 호출, Pro(요약) + Flash(표 데이터)
   npm run research:pro-only     # 전부 Pro (가장 정확, 가장 비쌈)
   npm run research:flash-only   # 전부 Flash (가장 저렴)
   ```

   실행이 끝나면 토큰 사용량과 실제 비용이 모델별로 분리 출력됩니다.

4. **옵션**:
   - `node --env-file=.env scripts/daily-research.mjs --date 2026-05-13` — 특정 날짜로 저장

### 호출 구성 (4 호출, CSV 출력)

| 호출 | 산출물 | 모델 (Hybrid) | 비고 |
|---|---|---|---|
| ① | `categories.csv` (20행) | **Pro** | summary 한국어 인사이트 필요 |
| ② | `brands.csv` (400행) | Flash | 정형 데이터 |
| ③ | `sourcing.csv` (200행) | Flash | 정형 데이터 |
| ④ | `products.csv` (600행) | Flash | 정형 데이터 + source_slugs 매칭 |

### 모델별 예상 비용 (유료 결제 기준)

| 모드 | 일일 | 월간 |
|---|---|---|
| **`research` (Hybrid, 기본)** | **~$0.5** | **~$15** |
| `research:pro-only` | ~$1.5 | ~$45 |
| `research:flash-only` | ~$0.04 | ~$1.2 |

> Hybrid가 권장 — Pro의 한국어 인사이트 품질을 유지하면서 표 데이터는 Flash로 처리해 비용 70% 절감.

**자동화 (GitHub Actions / Vercel Cron)**: 매일 새벽 4시 KST에 `npm run research` 실행 → git commit → 자동 배포.
필요하면 워크플로 yaml도 준비해 드립니다.

> **Node 20.6+** 필요 — `--env-file` 플래그 사용. 더 낮은 버전이면 `dotenv`로 대체 가능.

## 주요 스크립트

| 명령 | 용도 |
|---|---|
| `npm run dev` | 로컬 개발 서버 (Vite HMR) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run gen:mock` | 목 JSON 데이터 재생성 |
| `npm run research` | Gemini로 카테고리 + 상세 리서치 |
| `npm run research:full` | + 소싱처별 상품 리스트까지 |
| `npm run compact` | 오래된 스냅샷 자동 압축 (일/주/월/분기) |

## 프로젝트 구조

```
src/
├── main.tsx                  # 엔트리
├── App.tsx                   # 라우팅 + 토픽바 + Tweaks
├── types.ts                  # 데이터 스키마 (Gemini 응답과 1:1 매칭)
├── lib/
│   ├── data-loader.ts        # JSON fetch + 캐시
│   └── format.ts             # KRW/USD/cx 유틸
├── hooks/
│   ├── useAsync.ts
│   └── useTweaks.ts          # localStorage 영구화
├── components/               # 재사용 가능한 원자/조합 컴포넌트
│   ├── icons/index.tsx
│   ├── Change.tsx            # ▲▼ 변동 배지
│   ├── Competition.tsx       # 경쟁강도 1~5 바
│   ├── ZonePill.tsx          # 레드/블루 존 칩
│   ├── SurgeBadge.tsx        # +4 이상 급상승 칩 (그린 펄스)
│   ├── MiniBadge.tsx         # NEW / HOT
│   ├── Sparkline.tsx         # SVG 스파크라인
│   ├── Reliability.tsx       # 신뢰도 별점
│   ├── MarginBar.tsx
│   ├── TrendChart.tsx        # 2025 vs 2026 트렌드선
│   ├── Topbar.tsx
│   ├── PeriodSwitch.tsx      # 2025/2026/비교 토글
│   ├── HintBanner.tsx
│   ├── Toolbar.tsx           # + ToolbarGroup, ToolbarBtn, ToolbarSpacer
│   ├── Panel.tsx
│   ├── RankRow.tsx
│   ├── Crumb.tsx
│   ├── CategoryCard.tsx
│   ├── ProductCard.tsx
│   └── TweaksPanel.tsx       # 우하단 FAB → 타이포/밀도 토글
└── views/
    ├── Stage1Dashboard.tsx   # 카테고리 TOP 20
    ├── Stage2Category.tsx    # 브랜드/상품/소싱처 3분할
    └── Stage3Sourcing.tsx    # 소싱처별 추천 상품 50선

public/data/
├── 2025-final/               # 2025년 결산 (고정)
│   ├── categories.csv        # 카테고리 인덱스 (20행)
│   ├── brands.csv            # 카테고리당 20개 (400행)
│   ├── products.csv          # 카테고리당 30개 (600행, source_slugs 포함)
│   ├── sourcing.csv          # 카테고리당 10개 (200행)
│   └── meta.json             # 생성 시각, 사용 모델
├── 2026-05-12/               # 매일 새 폴더가 누적됨 (같은 구조)
└── latest.json               # {"date": "2026-05-12"}

scripts/
├── generate-mock-data.mjs    # 목 데이터 생성기
├── gemini-prompts.md         # 일일 리서치 프롬프트 3종
└── compact-snapshots.mjs     # 보존 정책 (30일/180일/1년)
```

## 데이터 흐름

```
[매일 새벽 4시 KST]
   Gemini  ─┬─→ public/data/{오늘날짜}/categories.json
            ├─→ public/data/{오늘날짜}/categories/<slug>.json (×20)
            ├─→ public/data/{오늘날짜}/sourcing/<cat>__<src>.json (×200)
            └─→ public/data/latest.json 갱신
                ↓
            scripts/compact-snapshots.mjs (오래된 스냅샷 정리)
                ↓
            git push → Vercel 자동 배포
```

Gemini 프롬프트 3종은 [scripts/gemini-prompts.md](scripts/gemini-prompts.md)에서 그대로 복사해 쓰면 됩니다.

## 기간 토글

- **2025**: `public/data/2025-final/` 고정 결산 데이터
- **2026 (오늘)**: `latest.json`이 가리키는 가장 최신 스냅샷
- **비교**: 두 기간 동시 로드 (현재 UI 비활성 — Stage1 토글만 동작)

## 배포

Vite 정적 빌드 → Vercel / Netlify / 어디든 정적 호스팅. 별도 백엔드 불필요.

```bash
npm run build      # → dist/
npx vercel deploy  # 또는 git push만 해도 자동 배포
```
