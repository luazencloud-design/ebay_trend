// Hybrid daily research pipeline.
//
//   ① categories.csv      ← Pro    (1 call,  needs Korean ecommerce insight + summaries)
//   ② brands.csv          ← Flash  (1 call,  400 rows tabular)
//   ③ sourcing.csv        ← Flash  (1 call,  200 rows tabular)
//   ④ products.csv        ← Flash  (1 or N calls — 600 rows is near Flash limit so split if needed)
//   ⑤ meta.json + latest.json pointer
//   ⑥ run compact-snapshots
//
// Usage:
//   node --env-file=.env scripts/daily-research.mjs
//   node --env-file=.env scripts/daily-research.mjs --date 2026-05-13
//   node --env-file=.env scripts/daily-research.mjs --pro-only       # use Pro for all (more expensive)
//   node --env-file=.env scripts/daily-research.mjs --flash-only     # use Flash for everything

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  generateJson,
  CONCURRENCY,
  usageTotals,
  usageByModel,
  estimateCostUSD,
} from "./lib/gemini-client.mjs";
import { toCsv } from "./lib/csv.mjs";
import { buildManifest } from "./lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");

const argv = process.argv.slice(2);
function flag(name) { return argv.includes(`--${name}`); }
function arg(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

// Use KST (Asia/Seoul) so the snapshot folder matches the user's local day.
// 'en-CA' locale outputs YYYY-MM-DD natively.
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const DATE = arg("date") || today;

// Model selection
const PRO = "gemini-2.5-pro";
const FLASH = "gemini-2.5-flash";
// Categories step uses Pro by default (needs Korean insight quality)
const MODEL_CATS = flag("flash-only") ? FLASH : PRO;
// Brands/sourcing/products always use Pro + Google Search grounding for
// hallucination prevention, regardless of MODEL_TABLES.
const MODEL_TABLES_LABEL = flag("flash-only") ? FLASH : PRO + " + grounding";

console.log(`\n📅 K-Trend daily research (hybrid)`);
console.log(`   Date (KST)       : ${DATE}`);
console.log(`   Categories       : ${MODEL_CATS}`);
console.log(`   Brands/Sourcing/Products : ${MODEL_TABLES_LABEL}`);
console.log(`   Concurrency      : ${CONCURRENCY}`);
console.log("");

const OUT_DIR = path.join(DATA_DIR, DATE);

// Tuning — token budgets per call.
// • Categories step uses Pro without grounding. Thinking left at default —
//   the Korean summary text actually benefits from reasoning.
// • Brands / sourcing / products use Pro + Google Search grounding. These
//   are structured-data extraction tasks where thinking is mostly waste.
//   Pro 2.5 minimum thinkingBudget is 128, so we set that (≈ 0 in practice).
// • If --flash-only is used, FLASH_OPTS applies (thinking fully disabled).
const CAT_OPTS = { maxOutputTokens: 65535 };
const FLASH_OPTS = { maxOutputTokens: 65535, thinkingBudget: 0 };
const GROUNDED_OPTS = { enableSearch: true, maxOutputTokens: 65535, thinkingBudget: 128 };

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

// Hard JSON-only suffix appended to every grounded prompt. Grounded calls
// cannot use responseMimeType: "application/json", so the model occasionally
// returns markdown tables. Recency bias = the strongest instruction goes last.
const JSON_ONLY_SUFFIX = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 출력 형식 (반드시 준수)
- 응답 전체가 하나의 JSON 객체여야 합니다.
- 첫 문자는 '{', 마지막 문자는 '}'.
- 마크다운 헤더(##), 표(|), 코드 펜스(\`\`\`), 자연어 설명문 절대 금지.
- 이 응답은 JSON.parse()로 직접 파싱됩니다. 한 글자라도 다른 내용이 섞이면 에러.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// ─── Prompts ──────────────────────────────────────────────────────────

const PROMPT_CATEGORIES = `당신은 글로벌 이커머스 리서처입니다. 오늘은 ${DATE}이고, Google Search를 적극 활용해 **실제 eBay에서 한국 셀러가 판매량/매출이 높은** 카테고리 TOP 30을 조사합니다.

⚠️ 편향 주의:
- "K-감성 소비재"(뷰티/문구/굿즈)에만 치우치지 마세요. **실제 eBay 거래량 기준**으로 작성.
- eBay Motors(자동차 부품)는 eBay 최대 카테고리 중 하나이고, 한국 순정부품(현대·기아) DIY 수요가 큽니다. **누락 금지.**
- 검토 대상 대형 카테고리(이 안에서만 고르라는 게 아니라 반드시 후보로 검토): 자동차 부품/액세서리, K-뷰티/헬스, 패션/스포츠웨어/리셀, 수집품(K-POP 굿즈·포토카드), 전자제품/액세서리, 문구/다꾸, 식품, 생활용품, 전통공예, 헤어케어, 뷰티 디바이스.
- Google Search로 "best selling korean products ebay", "ebay motors korean parts" 등 검색해서 근거 확보.

반드시 다음 JSON 스키마로만 응답하세요 (다른 텍스트, 마크다운 펜스 금지):

{
  "categories": [
    {
      "rank": 1,
      "slug": "k-beauty",
      "name_kr": "K-뷰티",
      "name_en": "K-Beauty",
      "zone": "red",
      "change": 2,
      "comp": 5,
      "margin": 35,
      "summary": "리들샷·PDRN 등 성분 중심 K-뷰티가 시장 견인. 신제품 사이클이 빨라 경쟁이 치열함."
    }
  ]
}

조건:
- 정확히 30개
- rank 1~5는 zone="red" (레드오션, 경쟁 치열), rank 6~30은 zone="blue" (블루오션, 진입 기회)
- slug: lowercase hyphenated (예: "k-beauty", "k-stationery")
- change: **지난 주 대비** 순위 변동 -10~+10 정수
- comp: 경쟁강도 1(쉬움)~5(매우 치열)
- margin: 예상 평균 마진율 15~70 정수
- summary: 1~2문장, 셀러 의사결정에 도움되는 인사이트 (한국어)
- 카테고리는 실제 eBay 판매 데이터 기준으로 다양하게 (자동차 부품·전자제품 등 비-소비재 대형 카테고리도 반드시 포함 검토)${JSON_ONLY_SUFFIX}`;

function promptBrands(categories) {
  const catList = categories
    .map((c) => `- ${c.slug}: ${c.name_kr}`)
    .join("\n");
  return `당신은 한국 상품 브랜드 큐레이터입니다. Google Search를 적극 활용해 각 카테고리에서 실재하는 한국 브랜드를 찾아주세요.

🎯 **분량 목표: 카테고리당 정확히 20개** (총 ${categories.length * 20}개).
한국 이커머스에서 활동하는 브랜드는 카테고리당 충분히 많이 존재합니다. 검색해서 채워주세요.

추천 구성:
- TOP 인기 브랜드 5~8개 (잘 알려진 메이저)
- 중견/신생 인기 브랜드 12~15개 (검색으로 발굴)
- 합쳐서 정확히 20개

⚠️ 규칙:
1. **실재하는 한국 브랜드만**. 가짜 브랜드 절대 금지.
2. 검증된 브랜드만 셀 때는 부족하지만, **이커머스에서 활동하는 한국 브랜드는 카테고리당 수십~수백 개 있음**. 검색으로 더 찾으세요.
3. 같은 브랜드가 여러 카테고리에 있어도 OK (예: 카카오프렌즈는 굿즈/문구 둘 다).

카테고리:
${catList}

응답은 다음 JSON으로만 (마크다운 펜스 금지):

{
  "brands": [
    {
      "cat_slug": "k-beauty",
      "rank": 1,
      "name": "메디큐브",
      "country": "KR",
      "change": 2,
      "initials": "메디"
    }
  ]
}

필드 규칙:
- name: 검색으로 확인된 실재 한국 브랜드 정식 명칭
- country: "KR" 기본, 글로벌 진출 브랜드는 "KR/US", "KR/JP" 가능
- change: 지난 주 대비 순위 변동 -10~+10 정수 (추정 OK)
- initials: 이름 한글/영문 2글자 (예: "메디", "JY")
- rank: 카테고리 내 인기 순위 1부터
- 카테고리당 최대 20개, 검증 불가하면 더 적게${JSON_ONLY_SUFFIX}`;
}

function promptSourcing(categories) {
  const catList = categories
    .map((c) => `- ${c.slug}: ${c.name_kr}`)
    .join("\n");
  return `당신은 한국 도매/소싱 사이트 큐레이터입니다. Google Search를 적극 활용해서 아래 카테고리에 맞는 **실제 운영 중인** 한국 B2B/도매 웹사이트를 찾아 추천하세요.

🎯 **분량 목표: 카테고리당 정확히 10개** (총 ${categories.length * 10}개).
한국 도매 플랫폼은 종합형(여러 카테고리 커버)이 많아 카테고리간 중복 OK.

추천 구성:
- 카테고리 전문 도매처 3~5개 (특화 사이트)
- 종합 도매 플랫폼 4~6개 (도매꾹, 오너클랜 등 — 여러 카테고리에 동일하게 추천 OK)
- 합쳐서 정확히 10개

⚠️ 규칙:
1. URL을 절대 추측하거나 만들어내지 마세요. 검색으로 확인된 실제 도메인만 사용.
2. **같은 사이트가 여러 카테고리에 중복 OK** — 도매꾹은 거의 모든 카테고리에 적합.
3. 카테고리 전문 사이트가 부족하면 종합 도매 플랫폼으로 채우세요.

참고: 실재하는 한국 주요 도매 플랫폼 예시 (이 목록 외에도 검색으로 더 찾아주세요):
- domeggook.com (도매꾹) — 종합 도매
- ownerclan.com (오너클랜) — 위탁판매 소싱
- dometopia.com (도매토피아) — 종합 도매
- sellmoa.com (셀모아) — B2B 소싱
- 1000za.kr (천유닷컴) — 문구/팬시 도매
- domemall.co.kr — 잡화 도매
- supercat.co.kr — 도매 종합
- gotomall.kr — 동대문 도매
- ndm.kr — 남대문 도매 플랫폼

대상 카테고리:
${catList}

응답은 다음 JSON으로만 (마크다운 펜스나 설명 텍스트 금지):

{
  "sourcing": [
    {
      "cat_slug": "k-beauty",
      "rank": 1,
      "name": "도매꾹",
      "url": "domeggook.com",
      "rely": 5,
      "fit": 4,
      "slug": "domeggook-com",
      "initials": "DM"
    }
  ]
}

필드 규칙:
- name: 사이트의 실제 한국어 명칭
- url: 실제 접속 가능 도메인 (https:// 없이, 서브패스 가능)
- rely: 신뢰도 1(소형/검증안됨)~5(대형/검증됨) 정수
- fit: 해당 카테고리 상품 적합도 1~5 정수
- slug: url의 . 과 / 를 - 로 (예: "domeggook-com", "naver-com-smartstore")
- initials: 이름 영문 2글자 대문자 (예: "DM" for 도매꾹)
- 각 카테고리당 최대 10개, 검증 가능한 사이트가 부족하면 더 적게 OK${JSON_ONLY_SUFFIX}`;
}

function promptInsights(categories) {
  const compact = categories
    .map((c) => `${c.rank}. ${c.name_kr} (${c.slug}) zone=${c.zone} change=${c.change} comp=${c.comp} margin=${c.margin}% — ${c.summary}`)
    .join("\n");

  return `당신은 eBay 한국 상품 셀러를 위한 트렌드 분석가입니다. 데이터는 **주 1회 (월요일 새벽)** 수집됩니다. 아래 카테고리 데이터를 보고 세 가지 시간 단위로 AI 인사이트를 작성해주세요.

이번 주 카테고리 TOP 20 (rank/zone/change/comp/margin/summary):
${compact}

각 인사이트는 셀러가 **무엇을 해야 하는지** 행동 지침을 포함해야 합니다.

응답은 다음 JSON 스키마로만 (마크다운 펜스, 다른 텍스트 금지):

{
  "daily": {
    "headline": "이번 주 한 줄 (15자 내외)",
    "body": "지난 주 대비 가장 큰 변화 + 이번 주 셀러 행동 추천. 2~3 문장. (예: 한방 영양제 ▲5 급상승. 홍삼/콜라겐 외 신규 진입 카테고리. 오너클랜·도매토피아 이번 주 안에 둘러볼 타이밍.)",
    "focus_categories": ["slug1", "slug2"]
  },
  "weekly": {
    "headline": "이번 달 한 줄 (20자 내외)",
    "body": "지난 4주 누적 트렌드 + 이번 달 전략 추천. 3~5 문장. (예: 키덜트 토이가 4주 연속 상승세. 프라모델·블라인드박스 글로벌 컬렉터 수요가 분기 트렌드로 자리잡음. 마진 45%로 매력적이라 이번 달 안에 진입 추천.)",
    "focus_categories": ["slug1", "slug2", "slug3"]
  },
  "yearly": {
    "headline": "2026 시장 한 줄 (25자 내외)",
    "body": "올해 K-상품 시장의 큰 그림 + 장기 포트폴리오 조언. 4~6 문장. 어떤 카테고리가 장기적으로 유망한지, 어떤 게 포화되고 있는지, 셀러는 어떤 믹스로 가야 하는지 등.",
    "focus_categories": ["slug1", "slug2", "slug3", "slug4"]
  }
}

JSON 키 이름(daily/weekly/yearly)은 그대로 유지하지만 의미는 위로 한 칸씩 이동했습니다:
- "daily" = 이번 주 인사이트 (지난 주 대비)
- "weekly" = 이번 달 인사이트 (지난 4주 누적)
- "yearly" = 연간 인사이트

조건:
- focus_categories는 반드시 위 카테고리 slug 목록에서 선택
- 톤: 데이터 기반의 자신감 있는 어드바이저. 마케팅 카피 NO, 분석가 톤 YES
- 한국어 자연스럽게, 과장 금지
- "AI가 추천하는데..." 같은 자기언급 금지`;
}

function promptProducts(categories, brandsByCat, sourcingByCat) {
  const catList = categories
    .map((c) => {
      const brands = (brandsByCat[c.slug] || []).slice(0, 15).map((b) => b.name).join(", ");
      const srcs = (sourcingByCat[c.slug] || []).map((s) => s.slug).join(", ");
      return `- ${c.slug} (${c.name_kr}): brands=[${brands}] sources=[${srcs}]`;
    })
    .join("\n");

  return `당신은 eBay에서 잘 팔리는 한국 상품 큐레이터입니다. Google Search로 시장 정보를 참고하면서 각 카테고리에서 합리적인 상품 추천을 만들어주세요.

🎯 상품명 작성 가이드 (3단계 폴백):
1. **베스트**: 검색으로 확인된 실제 SKU — 예: "조선미녀 맑은쌀 선크림 SPF50+", "메디큐브 에이지알 부스터프로"
2. **OK**: 브랜드가 실제 만드는 제품 종류 (정확한 SKU 모를 때) — 예: "메디큐브 콜라겐 패드", "이니스프리 그린티 세럼"
3. **OK**: 브랜드 없이 카테고리 대표 상품 종류 — 예: "센텔라 카밍 토너", "한방 콜라겐 젤리 스틱"

🚫 금지:
- ❌ 브랜드-카테고리 **불일치** (예: "조선미녀(K-뷰티) + 라이트스틱" → 조선미녀는 굿즈 안 만듦)
- ❌ 명백히 가짜인 SKU (실재 브랜드 + 그 브랜드가 절대 안 만들 제품)

📌 source_slugs 의미:
"이 정확한 상품이 이 사이트에 있다"가 아니라 **"이 카테고리 상품을 일반적으로 소싱할 수 있는 도매처"** 를 의미. 카테고리에 맞는 sources 중 2~3개 선택.

📌 가격/무게는 시세 기반 합리적 추정:
- ebay_usd: 해당 카테고리 평균 eBay 가격대
- krw: 소매가의 40~60% 도매가 추정
- margin: 18~68 정수 (예상 마진율 %)
- weight_g: 30~500 정수 (배송 무게)

카테고리 + 참고용 브랜드/소싱처:
${catList}

응답은 다음 JSON으로만 (마크다운 펜스 금지):

{
  "products": [
    {
      "cat_slug": "k-beauty",
      "rank": 1,
      "name": "조선미녀 맑은쌀 선크림",
      "name_en": "Beauty of Joseon Relief Sun Rice",
      "brand": "조선미녀",
      "ebay_usd": 18.50,
      "krw": 7800,
      "margin": 42,
      "weight_g": 220,
      "ebay_cat_id": "11233",
      "seo_tags": ["korean sunscreen", "kbeauty", "rice extract"],
      "change": 3,
      "source_slugs": ["domeggook-com", "ownerclan-com"]
    }
  ]
}

🎯 **분량 목표: 카테고리당 정확히 30개** (총 ${categories.length * 30}개). **반드시 채워주세요.**

추천 구성:
- 검증된 실제 SKU 5~10개 (검색으로 확인)
- 브랜드의 알려진 제품 종류 10~15개 (정확한 SKU 모르지만 브랜드가 만드는 카테고리)
- 카테고리 대표 상품 종류 5~15개 (브랜드는 카테고리 적합 한국 브랜드 선택)
- 합쳐서 정확히 30개

**중요**: "30개 못 채우면 적게 OK"가 아닙니다. 카테고리 대표 종류로 적극 채우세요. 한국 이커머스에는 카테고리당 수백~수천 종 상품이 있으니 30개는 충분히 가능합니다.

필드 규칙:
- cat_slug: 위에 제공된 목록 값 그대로 사용
- brand: 위 brands 목록에서 — 그 브랜드가 이 카테고리 제품을 만든다고 검증되면 사용. 검증 어려우면 카테고리에 가장 적합한 브랜드 선택. 정 모르면 카테고리에 맞는 새 한국 브랜드명 OK
- ebay_usd: 5~150 실수 (소수점 2자리), 카테고리 시세 기반
- krw: 1000~50000 정수
- ebay_cat_id: 5자리 숫자 문자열 (모르면 합리적 추측)
- seo_tags: 영문 검색어 3개 배열
- change: 지난 주 대비 -10~+10 정수
- source_slugs: 위 sources 목록에서 **3~5개 선택** (이 카테고리 상품을 합리적으로 다룰만한 도매처들)${JSON_ONLY_SUFFIX}`;
}

// ─── Pipeline ─────────────────────────────────────────────────────────

async function step1Categories() {
  // Categories now use grounding too — without it, the ranking is pure LLM
  // imagination biased by prompt examples (which is why eBay Motors / auto
  // parts never surfaced). Grounding anchors it to real trade data.
  console.log(`① Categories (${MODEL_CATS} + grounding)…`);
  const res = await generateJson(PROMPT_CATEGORIES, {
    label: "categories",
    model: MODEL_CATS,
    ...GROUNDED_OPTS,
  });
  if (!Array.isArray(res?.categories)) throw new Error("missing categories array");
  // ensure slugs are clean
  for (const c of res.categories) {
    if (!c.slug) c.slug = c.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  await writeText(
    path.join(OUT_DIR, "categories.csv"),
    toCsv(res.categories, ["rank", "slug", "name_kr", "name_en", "zone", "change", "comp", "margin", "summary"])
  );
  console.log(`   ✓ ${res.categories.length} categories saved\n`);
  return res.categories;
}

async function step2Brands(categories) {
  // Brands always use Pro + grounding — invented brand names are easy to spot.
  const model = PRO;
  console.log(`② Brands (${model} + grounding, thinking=128)…`);
  const res = await generateJson(promptBrands(categories), {
    label: "brands",
    model,
    ...GROUNDED_OPTS,
  });
  if (!Array.isArray(res?.brands)) throw new Error("missing brands array");
  await writeText(
    path.join(OUT_DIR, "brands.csv"),
    toCsv(res.brands, ["cat_slug", "rank", "name", "country", "change", "initials"])
  );
  console.log(`   ✓ ${res.brands.length} brands saved (grounded)\n`);
  return res.brands;
}

async function step3Sourcing(categories) {
  // Sourcing always uses Pro + Google Search grounding because URLs are the
  // single most hallucination-prone field and the value depends on them being real.
  const model = PRO;
  console.log(`③ Sourcing sites (${model} + grounding, thinking=128)…`);
  const res = await generateJson(promptSourcing(categories), {
    label: "sourcing",
    model,
    ...GROUNDED_OPTS,
  });
  if (!Array.isArray(res?.sourcing)) throw new Error("missing sourcing array");
  await writeText(
    path.join(OUT_DIR, "sourcing.csv"),
    toCsv(res.sourcing, ["cat_slug", "rank", "name", "url", "rely", "fit", "slug", "initials"])
  );
  console.log(`   ✓ ${res.sourcing.length} sourcing sites saved (grounded)\n`);
  return res.sourcing;
}

async function step4Products(categories, brands, sourcing) {
  // Products use Pro + grounding for the same reason as brands — fake product
  // names with real brand names are the most obvious form of hallucination.
  const model = PRO;
  console.log(`④ Products (${model} + grounding, thinking=128, batched)…`);
  const brandsByCat = {};
  for (const b of brands) (brandsByCat[b.cat_slug] ||= []).push(b);
  const sourcingByCat = {};
  for (const s of sourcing) (sourcingByCat[s.cat_slug] ||= []).push(s);

  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < categories.length; i += batchSize) {
    batches.push(categories.slice(i, i + batchSize));
  }

  const allProducts = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`   batch ${i + 1}/${batches.length} (${batch.length} cats)…\n`);
    const res = await generateJson(
      promptProducts(batch, brandsByCat, sourcingByCat),
      {
        label: `products[${i + 1}]`,
        model,
        ...GROUNDED_OPTS,
      }
    );
    if (!Array.isArray(res?.products)) {
      throw new Error(`products batch ${i + 1} missing products array`);
    }
    allProducts.push(...res.products);
  }

  // ── Validate & repair source_slugs ──
  // Gemini sometimes invents slugs that don't exist in sourcing.csv. Filter
  // out unknown slugs and backfill any product left with none.
  const validSourcesByCat = {};
  for (const s of sourcing) (validSourcesByCat[s.cat_slug] ||= []).push(s.slug);

  let fixedSources = 0;
  let backfilled = 0;
  for (const p of allProducts) {
    const valid = validSourcesByCat[p.cat_slug] || [];
    const original = Array.isArray(p.source_slugs) ? p.source_slugs : [];
    const filtered = original.filter((s) => valid.includes(s));
    if (filtered.length === 0 && valid.length > 0) {
      // Backfill with 4 category-matching sources, picked by rank-rotated index
      const take = Math.min(4, valid.length);
      const start = (p.rank - 1) % valid.length;
      const picks = [];
      for (let k = 0; k < take; k++) picks.push(valid[(start + k) % valid.length]);
      p.source_slugs = picks;
      backfilled++;
    } else if (filtered.length !== original.length) {
      p.source_slugs = filtered;
      fixedSources++;
    }
  }
  if (fixedSources || backfilled) {
    console.log(
      `   ⚙ repaired source_slugs: ${fixedSources} cleaned, ${backfilled} backfilled`
    );
  }

  await writeText(
    path.join(OUT_DIR, "products.csv"),
    toCsv(allProducts, [
      "cat_slug","rank","name","name_en","brand","ebay_usd","krw","margin",
      "weight_g","ebay_cat_id","seo_tags","change","source_slugs"
    ])
  );
  console.log(`   ✓ ${allProducts.length} products saved (grounded)\n`);
  return allProducts;
}

async function step4bInsights(categories) {
  // Lightweight Pro call (no grounding, minimal thinking). Generates daily,
  // weekly, and yearly seller-actionable insights in one shot.
  const model = PRO;
  console.log(`④b AI insights (${model}, no grounding, thinking=128)…`);
  const res = await generateJson(promptInsights(categories), {
    label: "insights",
    model,
    maxOutputTokens: 65535,
    thinkingBudget: 128,
  });
  const bundle = {
    generated_at: new Date().toISOString(),
    source_model: model,
    daily: res.daily,
    weekly: res.weekly,
    yearly: res.yearly,
  };
  await writeText(
    path.join(OUT_DIR, "insights.json"),
    JSON.stringify(bundle, null, 2) + "\n"
  );
  console.log(`   ✓ insights saved (daily / weekly / yearly)\n`);
  return bundle;
}

async function step5MetaAndLatest() {
  // Reflect actual models used per step. brands/sourcing/products all use
  // Pro + Google Search grounding regardless of MODEL_TABLES (which only
  // affects flags like --flash-only).
  await writeText(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify({
      date: DATE,
      generated_at: new Date().toISOString(),
      source_models: {
        categories: MODEL_CATS,
        brands: PRO + " + grounding",
        sourcing: PRO + " + grounding",
        products: PRO + " + grounding",
      },
    }, null, 2) + "\n"
  );
  await writeText(
    path.join(DATA_DIR, "latest.json"),
    JSON.stringify({ date: DATE }, null, 2) + "\n"
  );
  const manifest = await buildManifest(DATA_DIR);
  console.log(
    `⑤ meta.json + latest.json + index.json → ${DATE} ` +
      `(${manifest.snapshots.length} snapshots indexed)\n`
  );
}

function step6Compact() {
  console.log("⑥ Compacting old snapshots…");
  const res = spawnSync(
    process.execPath,
    [path.join(__dirname, "compact-snapshots.mjs")],
    { stdio: "inherit" }
  );
  if (res.status !== 0) console.log("   ⚠ compaction exited non-zero, continuing");
  console.log("");
}

function printUsageSummary() {
  console.log("📊 Gemini usage");
  console.log(`   Total calls : ${usageTotals.calls}`);
  let grandTotal = 0;
  for (const [model, u] of Object.entries(usageByModel)) {
    const cost = estimateCostUSD(model, u);
    grandTotal += cost.total;
    console.log(
      `   ${model.padEnd(20)} ` +
        `${String(u.calls).padStart(3)} calls · ` +
        `in ${u.promptTokens.toLocaleString().padStart(8)} · ` +
        `out ${(u.outputTokens + u.thoughtTokens).toLocaleString().padStart(8)} · ` +
        `$${cost.total.toFixed(4)}`
    );
  }
  const krw = (grandTotal * 1380).toFixed(0);
  console.log(`   ───────────────────────────────────────────────────────────`);
  console.log(`   TOTAL                                              $${grandTotal.toFixed(4)} ≈ ₩${krw}`);
}

async function main() {
  const t0 = Date.now();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const categories = await step1Categories();
  const brands = await step2Brands(categories);
  const sourcing = await step3Sourcing(categories);
  await step4Products(categories, brands, sourcing);
  await step4bInsights(categories);
  await step5MetaAndLatest();
  step6Compact();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ Done in ${secs}s\n`);
  printUsageSummary();
}

main().catch((err) => {
  console.error("\n❌ Pipeline failed:");
  console.error(err);
  printUsageSummary();
  process.exit(1);
});
