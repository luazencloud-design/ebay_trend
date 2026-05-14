# Gemini 일일 리서치 프롬프트 모음

매일 1회 실행하여 `public/data/YYYY-MM-DD/` 폴더에 JSON 파일을 떨굽니다.
스키마는 `src/types.ts`와 정확히 일치해야 합니다.

---

## 프롬프트 ①: 카테고리 인덱스 (`categories.json`)

```
당신은 글로벌 이커머스 리서처입니다.
오늘 날짜는 {{YYYY-MM-DD}}이고, eBay에서 한국 상품이 가장 잘 팔리는 카테고리 TOP 20을 조사합니다.

다음 JSON 스키마로 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "date": "{{YYYY-MM-DD}}",
  "generated_at": "{{ISO 8601 timestamp}}",
  "source": "gemini-2.5-pro",
  "categories": [
    {
      "rank": 1,
      "zone": "red",            // "red" = 1~5위 레드오션, "blue" = 6~20위 블루오션
      "name_kr": "K-뷰티",
      "name_en": "K-Beauty",
      "slug": "k-beauty",       // lowercase, hyphenated
      "change": 2,              // 어제 대비 순위 변동. 양수=상승, 음수=하락, 0=유지
      "comp": 5,                // 경쟁강도 1~5
      "margin": 35,             // 예상 평균 마진율 %
      "summary": "리들샷·PDRN 등 성분 중심 K-뷰티가 시장 견인. 신제품 사이클이 빨라 경쟁이 치열함."
    }
    // ... 총 20개
  ]
}

조건:
- rank 1~5: zone="red" (레드오션)
- rank 6~20: zone="blue" (블루오션, 진입 기회)
- change는 정수, -10~+10 범위
- summary는 1~2 문장, 셀러 의사결정에 도움되는 인사이트
```

---

## 프롬프트 ②: 카테고리 상세 (`categories/{slug}.json`)

각 카테고리마다 1회씩 실행 (총 20회):

```
당신은 eBay 한국 상품 카테고리 "{{name_kr}}" ({{slug}})의 상세 데이터를 조사합니다.

다음 JSON 스키마로 응답하세요:

{
  "category": { /* 위 categories[]에서 가져온 객체 그대로 */ },
  "brands": [
    {
      "rank": 1,
      "name": "메디큐브",
      "country": "KR",          // "KR", "KR/US", "KR/JP" 등
      "change": 2,              // 7일 전 대비 순위 변동
      "initials": "메디"         // 2자 약어 (한글 또는 영문)
    }
    // ... 총 20개
  ],
  "products": [
    {
      "rank": 1,
      "name": "콜라겐 글로우 토너",
      "brand": "메디큐브",
      "ebay_price_usd": 18.50,
      "change": 3              // 7일 전 대비
    }
    // ... 총 30개
  ],
  "sourcing": [
    {
      "rank": 1,
      "name": "스타일난다 도매",
      "url": "wholesale.stylenanda.kr",
      "rely": 5,               // 신뢰도 1~5
      "fit": 5,                // 이 카테고리 적합도 1~5
      "slug": "wholesale-stylenanda-kr",
      "initials": "스타"
    }
    // ... 총 10개
  ]
}
```

---

## 프롬프트 ③: 소싱처 상품 리스트 (`sourcing/{cat_slug}__{src_slug}.json`)

각 (카테고리 × 소싱처) 조합마다 실행 — 카테고리 1개당 10개 = 총 200회 (또는 캐시 활용):

```
당신은 도매 사이트 "{{src_name}}" ({{src_url}})에서 eBay "{{cat_name_kr}}" 카테고리로 판매하기 좋은
한국 상품 50개를 추천합니다.

다음 JSON 스키마로 응답하세요:

{
  "category_slug": "{{cat_slug}}",
  "sourcing_slug": "{{src_slug}}",
  "sourcing_site": { /* 위 sourcing[]에서 가져온 객체 그대로 */ },
  "products": [
    {
      "id": "{{cat_slug}}-{{src_slug}}-1",
      "name_kr": "아이코닉 두들 데일리 데코 스티커팩",
      "name_en": "Iconic Doodle Daily Deco Sticker Pack",
      "krw": 2500,             // 도매가 (원)
      "usd": 9.99,             // 예상 eBay 판매가 (달러)
      "margin": 45,            // 예상 마진율 %
      "weight_g": 30,          // 포장 후 무게 (그램)
      "ebay_cat_id": "11233",  // eBay 카테고리 ID
      "seo": [
        "korean stickers",
        "kawaii planner",
        "deco sticker"
      ]
    }
    // ... 총 50개
  ]
}
```

---

## 실행 가이드

1. **매일 새벽 4시 (KST)** GitHub Actions / Vercel Cron으로 트리거
2. 날짜 폴더 생성: `public/data/{{오늘 날짜}}/`
3. 위 3개 프롬프트를 순서대로 실행하고 결과를 해당 경로에 저장
4. `public/data/latest.json` 갱신: `{"date": "{{오늘 날짜}}"}`
5. `node scripts/compact-snapshots.mjs` 실행 (오래된 스냅샷 압축)
6. git commit & push → Vercel 자동 배포

**API 호출 비용 최적화 팁**: 카테고리 인덱스는 매일, 상세/소싱은 격일 또는 변동 있는 카테고리만 갱신.
