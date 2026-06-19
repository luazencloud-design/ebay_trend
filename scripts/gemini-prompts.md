# Gemini 프롬프트 — 어디에 있고 어떻게 동작하나

> ⚠️ 실제 프롬프트는 이 문서가 아니라 **`scripts/daily-research.mjs` 코드 안**에 있습니다.
> 프롬프트를 수정하려면 코드의 `prompt*()` 함수를 고치세요. 이 문서는 그 위치와 동작 원리만 안내합니다.

## 프롬프트 함수 위치 (`scripts/daily-research.mjs`)

| 함수 | 만드는 것 | 모델 | Grounding |
|---|---|---|---|
| `promptCategories(canonical)` | 카테고리 30개 순위 | Pro | ✅ |
| `promptBrands(batch)` | 카테고리당 브랜드 20개 | Pro | ✅ |
| `promptSourcing(batch)` | 카테고리당 소싱처 10개 | Flash | ❌ |
| `promptProducts(batch, brands, sourcing)` | 카테고리당 상품 30개 | Flash | ❌ |
| `promptInsights(categories)` | 주간/월간/연간 AI 인사이트 | Pro | ❌ |

각 프롬프트 끝에는 `JSON_ONLY_SUFFIX`가 붙습니다 (grounding 호출은 JSON 강제 모드를
못 써서, 마크다운으로 새는 걸 막는 안전장치).

## 출력 스키마
프롬프트가 만드는 데이터의 정확한 컬럼은 다음 두 곳을 보세요:
- **프론트 타입**: `src/types.ts` (Category, Brand, Product, SourcingSite, Insight…)
- **CSV 컬럼 순서**: `daily-research.mjs`의 각 `toCsv(...)` 호출

## 데이터 흐름 (요약)

```
canonical-categories.json (고정 카테고리 30개)
        ↓ promptCategories
① categories.csv   ← 순위만 매김 (이름은 canonical에서 잠금)
        ↓ promptBrands (categories 입력)
② brands.csv
        ↓ promptSourcing (categories 입력)
③ sourcing.csv
        ↓ promptProducts (categories + brands + sourcing 입력)
④ products.csv     ← source_slugs 검증/백필
        ↓ promptInsights (categories 입력)
④b insights.json
        ↓
⑤ meta.json → ⑥ 원자적 커밋 → ⑦ 압축
```

## 핵심 규칙 (코드가 강제하는 것 — 프롬프트만으론 안 됨)
1. **카테고리 이름 잠금**: Gemini가 이름을 바꿔도 코드가 canonical 값으로 덮어씀.
   새 카테고리만 허용 (안전상한 주 10개). → `step1Categories`
2. **순위 변동 계산**: `change`는 Gemini 출력을 무시하고 이전 주 스냅샷과 비교해 계산.
   → `applyRealChange`
3. **소싱처 slug 검증**: 상품의 `source_slugs`가 실제 sourcing.csv에 있는지 확인 후 백필.
   → `step4Products`

## 프롬프트를 수정할 때 주의
- 카테고리 목록을 바꾸려면 프롬프트가 아니라 `canonical-categories.json`을 편집.
- 분량(브랜드 20/상품 30 등)을 바꾸면 프롬프트 텍스트 + 검증 로직 양쪽 확인.
- grounding 켜고 끄는 건 각 step의 `...GROUNDED_OPTS` / `...FLASH_OPTS`로 제어.
