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
import { toCsv, parseCsv } from "./lib/csv.mjs";
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

// Write to a temp dir first; swap into place only when ALL steps succeed.
// Prevents a half-finished run from leaving categories.csv updated while
// brands/products/sourcing stay stale (→ empty category pages).
const FINAL_DIR = path.join(DATA_DIR, DATE);
const OUT_DIR = path.join(DATA_DIR, `.${DATE}.tmp`);

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

// ─── Real rank-change computation (vs previous snapshot) ──────────────
// Gemini must NOT invent `change` — we own the previous week's data, so we
// compute it: change = prevRank - curRank (+ = moved up, - = moved down).
let _prevDateCache;
async function getPrevSnapshotDate() {
  if (_prevDateCache !== undefined) return _prevDateCache;
  let names = [];
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    names = entries
      .filter(
        (e) =>
          e.isDirectory() &&
          /^\d{4}-\d{2}-\d{2}$/.test(e.name) &&
          e.name < DATE
      )
      .map((e) => e.name)
      .sort();
  } catch {}
  _prevDateCache = names.length ? names[names.length - 1] : null;
  return _prevDateCache;
}

// Build a Map<key, rank> from the previous snapshot's CSV.
async function loadPrevRankMap(file, keyFn) {
  const prevDate = await getPrevSnapshotDate();
  if (!prevDate) return new Map();
  try {
    const text = await fs.readFile(path.join(DATA_DIR, prevDate, file), "utf8");
    const rows = parseCsv(text, { numericCols: ["rank"] });
    const map = new Map();
    for (const r of rows) map.set(keyFn(r), r.rank);
    return map;
  } catch {
    return new Map();
  }
}

// Overwrite each row's `change` with the real delta vs previous snapshot.
// Rows with no previous match (new this week) get change = 0.
function applyRealChange(rows, prevMap, keyFn) {
  let moved = 0;
  let fresh = 0;
  for (const r of rows) {
    const prev = prevMap.get(keyFn(r));
    if (prev == null) {
      r.change = 0;
      fresh++;
    } else {
      r.change = prev - r.rank;
      if (r.change !== 0) moved++;
    }
  }
  return { moved, fresh };
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

// ─── Canonical category taxonomy ───────────────────────────────────────
// Lives in scripts/canonical-categories.json. Slugs + Korean/English names
// are LOCKED once added — never rename (breaks rank-change tracking).
// Gemini may propose up to N new categories per week; accepted ones get
// appended to the JSON file and become permanently locked thereafter.
const CANONICAL_FILE = path.join(__dirname, "canonical-categories.json");

async function loadCanonical() {
  try {
    const data = JSON.parse(await fs.readFile(CANONICAL_FILE, "utf8"));
    return {
      maxNewPerWeek: data.max_new_per_week ?? 3,
      categories: Array.isArray(data.categories) ? data.categories : [],
    };
  } catch (e) {
    console.warn(`   ⚠ canonical file missing/invalid (${e.message}) — starting empty`);
    return { maxNewPerWeek: 3, categories: [] };
  }
}

async function saveCanonical(categories, maxNewPerWeek) {
  const data = {
    _comment:
      "Canonical category taxonomy. Slugs and Korean/English names are LOCKED once added. Gemini adds new entries automatically (max N/week). For manual edits: only add or remove rows — never rename existing ones (breaks rank-change tracking).",
    max_new_per_week: maxNewPerWeek,
    updated_at: new Date().toISOString(),
    categories,
  };
  await fs.writeFile(CANONICAL_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ─── Prompts ──────────────────────────────────────────────────────────

function promptCategories(canonical, maxNew) {
  const existing = canonical
    .map((c) => `  - "${c.slug}" → ${c.name_kr} (${c.name_en})`)
    .join("\n");

  return `당신은 한국 상품 eBay 수출 트렌드 분석가입니다. 오늘은 ${DATE}이고, Google Search로 실제 eBay 판매 데이터를 참고해 한국 상품 카테고리 TOP 30을 ranking 하세요.

📋 기존 캐노니컬 카테고리 (${canonical.length}개) — 이름 변경 절대 금지:
${existing}

⚠️ 절대 규칙:
1. **기존 카테고리와 의미가 같으면** slug/name_kr/name_en을 **정확히 그대로** 사용. 한 글자라도 다르면 시스템 거부.
2. 동일 카테고리의 다른 이름 버전을 "새 카테고리"로 제출 **금지**.
   예: 위 목록에 "수집용 트레이딩 카드"(trading-cards)가 있는데 "트카", "포토카드 콜렉팅" 등으로 새로 추가 금지.
3. 진짜로 새로운 트렌드 카테고리만 **최대 ${maxNew}개까지** 추가 가능. 신규 항목은:
   - slug: lowercase, 단어 사이 하이픈 (예: "k-baking-tools")
   - name_kr: 명확한 한국어 명칭
   - name_en: 영문 명칭
   - 한 번 추가되면 영원히 잠금됨 — 신중하게 작명할 것.
4. 응답 총 30개. 기존 ${Math.min(canonical.length, 30)}개 중 트렌드 + 신규 0~${maxNew}개 = 30.

응답은 다음 JSON 스키마로만 (마크다운 펜스 금지):

{
  "categories": [
    {
      "rank": 1,
      "slug": "kpop-goods",
      "name_kr": "K-POP 굿즈/포토카드",
      "name_en": "K-POP Goods & Photocards",
      "zone": "red",
      "change": 0,
      "comp": 5,
      "margin": 28,
      "summary": "신인 그룹 컴백 시즌 트래픽 폭증."
    }
  ]
}

필드 규칙:
- rank: 1~30 (Google Search 기반 실제 판매량 순)
- zone: rank 1~5 = "red", 6~30 = "blue"
- change: **0으로 두세요** — 시스템이 자동 계산
- comp: 1(쉬움)~5(매우 치열) 정수
- margin: 예상 평균 마진율 15~70 정수
- summary: 1~2문장 한국어 인사이트${JSON_ONLY_SUFFIX}`;
}

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
  const { categories: canonical, maxNewPerWeek } = await loadCanonical();
  const canonicalBySlug = new Map(canonical.map((c) => [c.slug, c]));

  console.log(
    `① Categories (${MODEL_CATS} + grounding) — ${canonical.length} canonical, +${maxNewPerWeek}/week max`
  );
  const res = await generateJson(promptCategories(canonical, maxNewPerWeek), {
    label: "categories",
    model: MODEL_CATS,
    ...GROUNDED_OPTS,
  });
  if (!Array.isArray(res?.categories)) throw new Error("missing categories array");

  // ── Process Gemini's response ──
  // - Existing canonical match: enforce stored name_kr/name_en (don't trust drift)
  // - New entry (slug not in canonical): validate, accept up to maxNewPerWeek
  // - Dedupe by slug
  const seen = new Set();
  const kept = [];
  const newAdditions = [];
  let dropped = 0;

  for (const c of res.categories) {
    if (!c.slug || typeof c.slug !== "string") {
      dropped++;
      continue;
    }
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);

    const canon = canonicalBySlug.get(c.slug);
    if (canon) {
      // existing — lock names to canonical
      c.name_kr = canon.name_kr;
      c.name_en = canon.name_en;
      kept.push(c);
    } else {
      // new candidate — validate
      if (newAdditions.length >= maxNewPerWeek) {
        console.log(`   ⚠ skipped new "${c.slug}" — weekly cap of ${maxNewPerWeek} reached`);
        continue;
      }
      if (!/^[a-z][a-z0-9-]{1,40}$/.test(c.slug)) {
        console.log(`   ⚠ skipped malformed slug "${c.slug}"`);
        continue;
      }
      if (!c.name_kr || !c.name_en) {
        console.log(`   ⚠ skipped "${c.slug}" — missing name_kr/name_en`);
        continue;
      }
      const entry = {
        slug: c.slug,
        name_kr: String(c.name_kr).trim(),
        name_en: String(c.name_en).trim(),
        added: DATE,
      };
      newAdditions.push(entry);
      kept.push(c);
    }
  }

  // Sort by rank, take top 30, renumber + recolor zones
  kept.sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const top30 = kept.slice(0, 30);
  for (let i = 0; i < top30.length; i++) {
    top30[i].rank = i + 1;
    top30[i].zone = i < 5 ? "red" : "blue";
  }

  if (dropped) console.log(`   ⚙ dropped ${dropped} malformed entries`);
  if (newAdditions.length > 0) {
    console.log(
      `   ✨ ${newAdditions.length} new canonical: ${newAdditions.map((n) => n.name_kr).join(", ")}`
    );
    // Persist updated canonical (append new entries)
    await saveCanonical([...canonical, ...newAdditions], maxNewPerWeek);
  }

  // Real change vs previous snapshot — slug-based matching is now bulletproof
  // because (a) existing slugs are locked, (b) new slugs are net-new so 0 is correct.
  const prevDate = await getPrevSnapshotDate();
  const prevMap = await loadPrevRankMap("categories.csv", (r) => r.slug);
  const { moved, fresh } = applyRealChange(top30, prevMap, (r) => r.slug);
  console.log(
    `   ↕ change vs ${prevDate ?? "(없음)"}: ${moved}개 변동, ${fresh}개 신규(=0)`
  );

  await writeText(
    path.join(OUT_DIR, "categories.csv"),
    toCsv(top30, ["rank", "slug", "name_kr", "name_en", "zone", "change", "comp", "margin", "summary"])
  );
  console.log(`   ✓ ${top30.length} categories saved\n`);
  return top30;
}

// Split a category array into chunks of `size`.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function step2Brands(categories) {
  // Batched (10 cats/call) so each grounded call stays small enough to avoid
  // header timeouts on 30-category runs. Pro + grounding throughout.
  const model = PRO;
  const batches = chunk(categories, 10);
  console.log(`② Brands (${model} + grounding, ${batches.length} batches)…`);

  const all = [];
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`   batch ${i + 1}/${batches.length} (${batches[i].length} cats)…\n`);
    const res = await generateJson(promptBrands(batches[i]), {
      label: `brands[${i + 1}]`,
      model,
      ...GROUNDED_OPTS,
    });
    if (!Array.isArray(res?.brands)) throw new Error(`brands batch ${i + 1} missing array`);
    all.push(...res.brands);
  }

  // Real change vs previous snapshot, matched by cat_slug + brand name.
  const prevMap = await loadPrevRankMap("brands.csv", (r) => `${r.cat_slug}|${r.name}`);
  applyRealChange(all, prevMap, (r) => `${r.cat_slug}|${r.name}`);

  await writeText(
    path.join(OUT_DIR, "brands.csv"),
    toCsv(all, ["cat_slug", "rank", "name", "country", "change", "initials"])
  );
  console.log(`   ✓ ${all.length} brands saved (grounded)\n`);
  return all;
}

async function step3Sourcing(categories) {
  // Batched for the same reason. URLs are hallucination-prone so grounding stays on.
  const model = PRO;
  const batches = chunk(categories, 10);
  console.log(`③ Sourcing sites (${model} + grounding, ${batches.length} batches)…`);

  const all = [];
  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`   batch ${i + 1}/${batches.length} (${batches[i].length} cats)…\n`);
    const res = await generateJson(promptSourcing(batches[i]), {
      label: `sourcing[${i + 1}]`,
      model,
      ...GROUNDED_OPTS,
    });
    if (!Array.isArray(res?.sourcing)) throw new Error(`sourcing batch ${i + 1} missing array`);
    all.push(...res.sourcing);
  }

  await writeText(
    path.join(OUT_DIR, "sourcing.csv"),
    toCsv(all, ["cat_slug", "rank", "name", "url", "rely", "fit", "slug", "initials"])
  );
  console.log(`   ✓ ${all.length} sourcing sites saved (grounded)\n`);
  return all;
}

async function step4Products(categories, brands, sourcing) {
  // Products step is structured-data heavy (900 rows, ~47% of run cost +
  // ~50% of runtime under Pro). Switched to Flash: grounding still
  // anchors real product data; cost drops ~33x on output tokens;
  // runtime ~4x faster. Negligible quality impact on tabular output.
  const model = FLASH;
  console.log(`④ Products (${model} + grounding, batched)…`);
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

  // Real change vs previous snapshot, matched by cat_slug + product name.
  const prevMap = await loadPrevRankMap("products.csv", (r) => `${r.cat_slug}|${r.name}`);
  applyRealChange(allProducts, prevMap, (r) => `${r.cat_slug}|${r.name}`);

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

async function step5Meta() {
  // meta.json goes inside the temp snapshot dir (part of the atomic unit).
  await writeText(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify({
      date: DATE,
      generated_at: new Date().toISOString(),
      source_models: {
        categories: PRO + " + grounding",
        brands: PRO + " + grounding",
        sourcing: PRO + " + grounding",
        products: PRO + " + grounding",
      },
    }, null, 2) + "\n"
  );
  console.log(`⑤ meta.json written\n`);
}

// Atomic commit: swap temp dir into the real date folder, then update the
// global pointer + manifest. Only reached if every prior step succeeded.
async function commitSnapshot() {
  await fs.rm(FINAL_DIR, { recursive: true, force: true });
  await fs.rename(OUT_DIR, FINAL_DIR);
  await writeText(
    path.join(DATA_DIR, "latest.json"),
    JSON.stringify({ date: DATE }, null, 2) + "\n"
  );
  const manifest = await buildManifest(DATA_DIR);
  console.log(
    `⑥ committed → ${DATE} · latest.json + index.json updated ` +
      `(${manifest.snapshots.length} snapshots)\n`
  );
}

function step7Compact() {
  console.log("⑦ Compacting old snapshots…");
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
  // Fresh temp dir
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const categories = await step1Categories();
  const brands = await step2Brands(categories);
  const sourcing = await step3Sourcing(categories);
  await step4Products(categories, brands, sourcing);
  await step4bInsights(categories);
  await step5Meta();
  await commitSnapshot();   // ← atomic swap; only here is FINAL_DIR touched
  step7Compact();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ Done in ${secs}s\n`);
  printUsageSummary();
}

main().catch(async (err) => {
  console.error("\n❌ Pipeline failed:");
  console.error(err);
  // Clean up the temp dir so a failed run leaves the previous snapshot intact.
  await fs.rm(OUT_DIR, { recursive: true, force: true }).catch(() => {});
  console.error("\n(이전 스냅샷은 그대로 유지됨 — 임시 폴더만 정리)");
  printUsageSummary();
  process.exit(1);
});
