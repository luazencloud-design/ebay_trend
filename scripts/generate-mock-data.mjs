// Mock data generator — produces the new CSV-based dataset.
// 4 tables per snapshot + meta.json.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toCsv } from "./lib/csv.mjs";
import { buildManifest } from "./lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");

const CATEGORIES_2026 = [
  { rank: 1,  zone: "red",  name_kr: "K-뷰티",          name_en: "K-Beauty",            change: 2,  comp: 5, margin: 35, summary: "리들샷·PDRN 등 성분 중심 K-뷰티가 시장 견인. 신제품 사이클이 빨라 경쟁이 치열함." },
  { rank: 2,  zone: "red",  name_kr: "K-팝 굿즈",       name_en: "K-Pop Merch",         change: -1, comp: 5, margin: 28, summary: "신인 그룹 컴백 시즌마다 트래픽 폭발. 라이트스틱·앨범·포카가 핵심 카테고리." },
  { rank: 3,  zone: "red",  name_kr: "캐릭터 굿즈",     name_en: "Character Goods",     change: 0,  comp: 4, margin: 42, summary: "산리오 콜라보·자체 IP 강세. 키링·인형·문구 라인업이 안정적으로 팔림." },
  { rank: 4,  zone: "red",  name_kr: "K-패션",          name_en: "K-Fashion",           change: 1,  comp: 5, margin: 30, summary: "스트릿·Y2K 무드. 셀럽 착장 컨버전 빠름. 사이즈 이슈는 항상 변수." },
  { rank: 5,  zone: "red",  name_kr: "K-스킨케어 툴",   name_en: "Skincare Tools",      change: -2, comp: 4, margin: 38, summary: "마이크로커런트·LED 디바이스가 주력. 단가 높고 리뷰가 핵심." },
  { rank: 6,  zone: "blue", name_kr: "K-문구",          name_en: "K-Stationery",        change: 4,  comp: 2, margin: 48, summary: "아이코닉·모트모트류 데일리 데코 스티커가 폭발. 영문 SEO 신선함." },
  { rank: 7,  zone: "blue", name_kr: "K-스낵",          name_en: "Korean Snacks",       change: 3,  comp: 3, margin: 32, summary: "허니버터·불닭 라인업 + 컬트 신상품. 유통기한·관세가 함정." },
  { rank: 8,  zone: "blue", name_kr: "한방 영양제",     name_en: "Herbal Supplements",  change: 5,  comp: 2, margin: 52, summary: "홍삼·콜라겐 외 새 카테고리 진입 중. 영문 광고문안이 곧 마진." },
  { rank: 9,  zone: "blue", name_kr: "K-키친웨어",      name_en: "Korean Kitchenware",  change: 0,  comp: 3, margin: 36, summary: "에어프라이어·돌솥·뚝배기. 무게/부피 이슈로 ePacket 최적화 중요." },
  { rank: 10, zone: "blue", name_kr: "전통 다도",       name_en: "Tea & Ceremony",      change: 2,  comp: 1, margin: 55, summary: "프리미엄 다완·다기 셋. 유럽 마니아층 고정 수요." },
  { rank: 11, zone: "blue", name_kr: "헤어케어",        name_en: "K-Hair Care",         change: 1,  comp: 3, margin: 40, summary: "두피 토닉·트리트먼트 앰플 강세. 헤드스파 컨셉 셀러 다수 진입." },
  { rank: 12, zone: "blue", name_kr: "K-드라마 굿즈",   name_en: "K-Drama Goods",       change: -1, comp: 3, margin: 34, summary: "신작 방영 시 단기 스파이크. 장기 SKU 운영은 어려움." },
  { rank: 13, zone: "blue", name_kr: "키덜트 토이",     name_en: "Adult Toys",          change: 6,  comp: 2, margin: 45, summary: "프라모델·피규어·블라인드박스. 글로벌 컬렉터 유입 가속." },
  { rank: 14, zone: "blue", name_kr: "K-홈데코",        name_en: "Korean Home Decor",   change: -2, comp: 4, margin: 28, summary: "쿠시아·캔들·디퓨저. 단가 낮고 배송비 비중 큼." },
  { rank: 15, zone: "blue", name_kr: "유아용품",        name_en: "Baby Goods",          change: 3,  comp: 2, margin: 38, summary: "이유식기·턱받이·아기띠. 안전 인증 마케팅 중요." },
  { rank: 16, zone: "blue", name_kr: "전통 공예",       name_en: "Traditional Craft",   change: 1,  comp: 1, margin: 60, summary: "자개·한지·도자기. 단가 높고 마진 좋지만 회전 느림." },
  { rank: 17, zone: "blue", name_kr: "테크 액세서리",   name_en: "Tech Accessories",    change: -3, comp: 4, margin: 26, summary: "케이블·그립톡·스탠드. 단가 경쟁 매우 치열." },
  { rank: 18, zone: "blue", name_kr: "K-펜시 의류",     name_en: "K-Fancy Apparel",     change: 2,  comp: 3, margin: 42, summary: "지브라급 코어 의류. 사이즈 표기 표준화가 컨버전 차이." },
  { rank: 19, zone: "blue", name_kr: "프리미엄 차",     name_en: "Premium Tea",         change: 0,  comp: 2, margin: 50, summary: "보이차·녹차 프리미엄. 박스 디자인이 곧 단가." },
  { rank: 20, zone: "blue", name_kr: "한복 모던",       name_en: "Modern Hanbok",       change: 4,  comp: 1, margin: 58, summary: "생활한복·모던 한복. 마니아 + 코스플레이 채널 두 갈래." },
];

const BRAND_POOL = {
  "k-beauty":       ["메디큐브","조선미녀","닥터지","코스알엑스","달바","라네즈","이니스프리","넘버즈인","베리썸","어노브","라운드랩","푸리토","토니모리","비플레인","토리든","스킨푸드","악마티카","토코보","더오디너리K","넘버9"],
  "k-pop-merch":    ["하이브 머치","SM 아티스트","JYP 굿즈","YG 셀렉트","스타쉽","큐브","위버스","엠와이","스타비","콘서트키트","케이오티","BTS Official","TWICE Shop","에이티즈","스트레이키즈","뉴진스","아이브","엔하이픈","투바투","르세라핌"],
  "character-goods":["산리오 코리아","라인프렌즈","카카오프렌즈","조구만","에스더버니","위글위글","오롤리데이","디즈니K","포스코핀","벨리곰","베어브릭","스누피K","푸바오 굿즈","토토","므므","튜브타임","젤리캣 K","리락쿠마 K","잔망루피","포로로"],
  "k-fashion":      ["무신사 스탠다드","젝시믹스","안다르","스파오","코드그라피","마뗑킴","널디","오아이오아이","디스이즈네버댓","디스코드","어메이즈","마하그리드","엘무드","굿네이버스","이미스","오언","콜리","아카이브볼드","리이","와이드앵글"],
  "skincare-tools": ["메디뷰티","큐오피","메디스킨","라뮤끄","쥬얼리캣","도리뮤트","쉘피","유스킨","엠씨씨","라이팩","디바이스랩","글로우K","퓨라셀","엔뷰","라보떼","스킨에디션","더뷰티스킨","셀더마","지블레","톤업스튜디오"],
  "k-stationery":   ["아이코닉","모트모트","포인트오브뷰","1000ZA","위글위글","디비디","오연","투엠캣츠","더우드","콜리","녹색문구","노네임드","어반러브","포멜로","에디션데님","프리하다","프랭클린플래너 K","마쉬","코트","뉴노트"],
};

const PRODUCT_POOL = {
  "k-beauty":       ["콜라겐 글로우 토너","리들샷 100","PDRN 앰플","센텔라 카밍 크림","비타민C 세럼","프로폴리스 마스크","글래스 글로우 미스트","콜라겐 아이크림","뮤신 에센스","히알루론산 부스터"],
  "k-pop-merch":    ["미니 앨범 + 포카","공식 라이트스틱","랜덤 포카팩","콘서트 후드","오피셜 머치 백","팬미팅 포토북","엠디 키링","콜라보 비니","굿즈 박스","응원봉 케이스"],
  "character-goods":["산리오 봉제 인형","라인프렌즈 키링","카카오 무드등","베어브릭 100%","포스코핀 텀블러","잔망루피 마스킹테이프","젤리캣 안경","디즈니 비니","튜브 인형","벨리곰 가방"],
  "k-fashion":      ["오버핏 후드","와이드 슬랙스","크롭 가디건","스트릿 그래픽 티","다크 워시 데님","버킷햇","니트 베스트","코어 후드","윈드브레이커","트레이닝 셋업"],
  "skincare-tools": ["LED 마스크 4세대","마이크로커런트 디바이스","고주파 리프팅 기기","EMS 페이셜","두피 마사지기","진동 클렌저","쿨링 마사지볼","헤드스파 디바이스","초음파 토닝기","광 테라피 펜"],
  "k-stationery":   ["아이코닉 데일리 스티커팩","위글위글 마스킹테이프","1000ZA 데코 스티커","모트모트 플래너","포인트오브뷰 노트","젤펜 세트","글리터 펜","스크랩북 키트","데일리 다이어리","투명 클리어 파일"],
};

const PRODUCT_EN_POOL = {
  "k-beauty":       ["Collagen Glow Toner","Riddle Shot 100","PDRN Ampoule","Centella Calming Cream","Vitamin C Serum","Propolis Mask","Glass Glow Mist","Collagen Eye Cream","Mucin Essence","Hyaluronic Booster"],
  "k-pop-merch":    ["Mini Album + Photocard","Official Lightstick","Random Photocard Pack","Concert Hoodie","Official Merch Bag","Fanmeeting Photobook","MD Keyring","Collab Beanie","Goods Box","Lightstick Case"],
  "character-goods":["Sanrio Plush","Line Friends Keyring","Kakao Mood Lamp","Bearbrick 100%","Pos Coffin Tumbler","Janmang Loopy Masking Tape","Jellycat Glasses","Disney Beanie","Tube Plush","Belly Bear Bag"],
  "k-fashion":      ["Overfit Hoodie","Wide Slacks","Crop Cardigan","Street Graphic Tee","Dark Wash Denim","Bucket Hat","Knit Vest","Core Hoodie","Windbreaker","Track Set"],
  "skincare-tools": ["LED Mask Gen 4","Microcurrent Device","RF Lifting Tool","EMS Facial","Scalp Massager","Vibrating Cleanser","Cooling Massage Ball","Headspa Device","Ultrasonic Toner","Light Therapy Pen"],
  "k-stationery":   ["Iconic Daily Sticker Pack","Wiggle Wiggle Masking Tape","1000ZA Deco Sticker","Motemote Planner","Point of View Notebook","Gel Pen Set","Glitter Pen","Scrapbook Kit","Daily Diary","Clear A4 File"],
};

const SOURCING_POOL = {
  "k-beauty":       [["스타일난다 도매","wholesale.stylenanda.kr",5,5],["코스맥스 B2B","b2b.cosmax.com",5,5],["뷰티콜리","beauty.colee.kr",4,5],["미앤모이스처","mnm-wholesale.com",4,4],["서울코스메틱","seoulcosmetic.kr",4,4],["글로비뷰티","globe-beauty.kr",3,4],["K뷰티헙","kbeautyhub.com",4,5],["오아시스","oasis-cos.kr",3,3],["로컬코스","localcos.kr",3,3],["뷰티마스터","beautymaster.kr",4,4]],
  "k-pop-merch":    [["위버스 머치","wholesale.weverse.io",5,5],["케이팝타운 B2B","b2b.kpoptown.com",4,5],["케이타운포유","ktown4u-b2b.com",4,5],["뮤직플랜트","musicplant.kr",4,4],["케이팝셀러","kpopseller.kr",3,4],["민트뮤직 도매","mintmusic.b2b.kr",3,3],["엠더블유 도매","mw-wholesale.kr",4,4],["애플뮤직 K","applemusic-kr.com",3,3],["서울콜렉션","seoulkpop.kr",3,4],["스타셀러","starseller.kr",4,4]],
  "character-goods":[["1000ZA 도매","1000za.kr",5,5],["산리오 코리아 B2B","b2b.sanrio.kr",5,5],["라인프렌즈 도매","linefriends-b2b.com",5,5],["케릭터마켓","charmarket.kr",4,4],["굿즈팩토리","goodsfactory.kr",4,4],["피규어월드","figureworld.kr",4,3],["더캐릭터","thecharacter.kr",3,4],["벨리굿즈","bellygoods.kr",3,4],["K굿즈마켓","kgoodsmarket.com",4,4],["스마일캐릭","smilechar.kr",3,3]],
  "k-fashion":      [["남대문 패션도매","ndm-fashion.kr",5,5],["동대문스타일","ddm-style.kr",5,5],["스파오 B2B","b2b.spao.com",4,4],["무신사 도매","wholesale.musinsa.kr",4,5],["룩핀도매","lookpin-b2b.kr",4,4],["스타일딜","styledeal.kr",3,4],["서울패션","seoulfashion.kr",4,4],["젝시믹스 B2B","b2b.xexymix.com",4,4],["코드샵","codeshop.kr",3,3],["스트릿K","streetk.kr",3,4]],
  "skincare-tools": [["메디큐브 디바이스","b2b.medicube.kr",5,5],["뷰티디바이스랩","beautydevice.kr",4,5],["글로벌뷰티텍","globalbeautytech.com",4,4],["스킨테크코리아","skintech.kr",4,4],["디바이스마켓","devicemarket.kr",3,4],["뷰티엔지니어","beautyeng.kr",3,3],["K-DeviceHub","kdevicehub.com",4,4],["프리미엄코스","premium-cos.kr",3,3],["디바이스랩K","devicelab-k.kr",4,4],["뷰티앤테크","beautyntech.kr",3,3]],
  "k-stationery":   [["1000ZA 도매몰","1000za.kr",5,5],["아이코닉 B2B","b2b.iconic.kr",5,5],["모트모트 도매","wholesale.motemote.kr",5,5],["포인트오브뷰 B2B","b2b.pointofview.kr",4,5],["문구마켓","stationerymarket.kr",4,4],["페이퍼월드","paperworld.kr",3,4],["K-Stationery Hub","kstationeryhub.com",4,5],["데스크K","deskk.kr",3,3],["오피스데일리","officedaily.kr",3,4],["문구굿즈","munguogoods.kr",3,3]],
};

const SEO_POOL = [
  ["korean stickers","kawaii planner","deco sticker"],
  ["korean planner","weekly notebook","kpop planner"],
  ["washi tape","korean stationery","deco tape"],
  ["korean cosmetics","glass skin","kbeauty"],
  ["pdrn ampoule","korean serum","skin booster"],
  ["korean snacks","spicy noodles","honey butter"],
  ["korean kitchen","stone bowl","ttukbaegi"],
  ["korean fashion","y2k style","seoul fashion"],
  ["korean kpop","random photocard","official merch"],
  ["korean herbal","red ginseng","collagen jelly"],
];

const COUNTRIES = ["KR","KR","KR","KR","KR/US","KR","KR","KR/JP","KR","KR"];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function poolFor(map, slug) {
  return map[slug] || map["k-beauty"];
}

function brandsFor(catSlug) {
  const pool = poolFor(BRAND_POOL, catSlug).slice(0, 20);
  const changes = [2,1,0,-1,-3,1,5,0,-2,4,1,-1,0,2,3,-1,0,1,2,0];
  return pool.map((name, i) => ({
    cat_slug: catSlug,
    rank: i + 1,
    name,
    country: COUNTRIES[i % COUNTRIES.length],
    change: changes[i],
    initials: name.replace(/[^가-힣A-Za-z]/g, "").slice(0, 2),
  }));
}

function sourcingFor(catSlug) {
  const pool = poolFor(SOURCING_POOL, catSlug).slice(0, 10);
  return pool.map(([name, url, rely, fit], i) => ({
    cat_slug: catSlug,
    rank: i + 1,
    name,
    url,
    rely,
    fit,
    slug: slugify(url),
    initials: name.replace(/[^A-Za-z가-힣]/g, "").slice(0, 2).toUpperCase(),
  }));
}

function productsFor(catSlug, sourcingList) {
  const namesKr = poolFor(PRODUCT_POOL, catSlug);
  const namesEn = poolFor(PRODUCT_EN_POOL, catSlug);
  const brands = poolFor(BRAND_POOL, catSlug);
  const changes = [3,0,1,-2,1,0,4,-1,2,0];
  const out = [];
  for (let i = 0; i < 30; i++) {
    const nameKr = namesKr[i % namesKr.length] + (i >= namesKr.length ? ` v${Math.floor(i / namesKr.length) + 1}` : "");
    const nameEn = namesEn[i % namesEn.length] + (i >= namesEn.length ? ` v${Math.floor(i / namesEn.length) + 1}` : "");
    const brand = brands[(i * 3) % brands.length];
    const ebayUsd = +(8 + (i % 10) * 3.5 + (i % 3) * 1.5).toFixed(2);
    const krw = Math.floor(1500 + (i % 8) * 850 + (i % 3) * 400);
    const margin = Math.max(18, Math.min(68, 28 + ((i * 7) % 35)));
    const weight = 30 + ((i * 17) % 320);
    const ebayCatId = String(11000 + ((i * 137) % 90000));
    const seo = SEO_POOL[i % SEO_POOL.length];

    // Pick 2-3 sourcing slugs deterministically
    const srcCount = 2 + (i % 2);
    const srcOffset = i % sourcingList.length;
    const srcSlugs = [];
    for (let s = 0; s < srcCount; s++) {
      srcSlugs.push(sourcingList[(srcOffset + s * 3) % sourcingList.length].slug);
    }

    out.push({
      cat_slug: catSlug,
      rank: i + 1,
      name: nameKr,
      name_en: nameEn,
      brand,
      ebay_usd: ebayUsd,
      krw,
      margin,
      weight_g: weight,
      ebay_cat_id: ebayCatId,
      seo_tags: seo,
      change: changes[i % 10],
      source_slugs: srcSlugs,
    });
  }
  return out;
}

function tweakForYear(categories, year) {
  return categories.map((c) => {
    if (year === 2025) {
      return {
        ...c,
        change: 0,
        margin: Math.max(15, c.margin - 4 - ((c.rank % 5) - 2)),
      };
    }
    return c;
  });
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

async function generateSnapshot(date, label, categoriesIn, modelLabel) {
  const root = path.join(DATA_DIR, date);

  const categories = categoriesIn.map((c) => ({ ...c, slug: slugify(c.name_en) }));

  // Write categories.csv
  await writeText(
    path.join(root, "categories.csv"),
    toCsv(categories, ["rank", "slug", "name_kr", "name_en", "zone", "change", "comp", "margin", "summary"])
  );

  // Compose brands / sourcing / products across all categories
  const allBrands = [];
  const allSourcing = [];
  const allProducts = [];

  for (const c of categories) {
    const brs = brandsFor(c.slug);
    const srcs = sourcingFor(c.slug);
    const prs = productsFor(c.slug, srcs);
    allBrands.push(...brs);
    allSourcing.push(...srcs);
    allProducts.push(...prs);
  }

  await writeText(
    path.join(root, "brands.csv"),
    toCsv(allBrands, ["cat_slug", "rank", "name", "country", "change", "initials"])
  );

  await writeText(
    path.join(root, "sourcing.csv"),
    toCsv(allSourcing, ["cat_slug", "rank", "name", "url", "rely", "fit", "slug", "initials"])
  );

  await writeText(
    path.join(root, "products.csv"),
    toCsv(allProducts, [
      "cat_slug","rank","name","name_en","brand","ebay_usd","krw","margin",
      "weight_g","ebay_cat_id","seo_tags","change","source_slugs"
    ])
  );

  // meta.json
  await writeText(
    path.join(root, "meta.json"),
    JSON.stringify({
      date,
      generated_at: new Date().toISOString(),
      source_models: {
        categories: modelLabel + " (mock)",
        tables: modelLabel + " (mock)",
      },
    }, null, 2) + "\n"
  );

  // insights.json (mock)
  await writeText(
    path.join(root, "insights.json"),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      source_model: modelLabel + " (mock)",
      daily: {
        headline: "한방 영양제 ▲5 급상승",
        body: "어제 대비 한방 영양제가 5계단 상승하며 8위로 진입. 콜라겐 젤리·홍삼 외 신규 카테고리 진입 중. 오너클랜·도매토피아에 새 상품 진열 확인 권장. 마진율 52%로 진입 매력 ↑.",
        focus_categories: ["herbal-supplements", "k-beauty"],
      },
      weekly: {
        headline: "키덜트 토이 일주일째 상승세",
        body: "프라모델·피규어·블라인드박스 카테고리가 지난 주 내내 상승. 글로벌 컬렉터 수요가 가속되고 있어 마진 45%에도 회전 빠름. 다음 주 신상 입고 일정 미리 확인하고 SEO 키워드 (gunpla, kpop figure, blind box) 강화 추천. K-팝 굿즈와 묶음 판매도 효과적.",
        focus_categories: ["adult-toys", "k-pop-merch", "character-goods"],
      },
      yearly: {
        headline: "2026 K-상품: 콘텐츠 IP × 헬스의 해",
        body: "올해 K-시장의 큰 줄기는 두 가지. 첫째, 콘텐츠 IP 굿즈(K-팝·캐릭터·드라마)가 단가 ↓ 마진 ↓ 회전 ↑로 박리다매 전략. 둘째, 한방 영양제·이너뷰티가 단가 ↑ 마진 ↑ 충성도 ↑로 자리잡음. 셀러는 두 축을 7:3 또는 5:5로 믹스해 운영 위험 분산 권장. 레드존 K-뷰티는 신규 진입 자제, 진입한다면 PDRN 같은 신성분으로 세분화.",
        focus_categories: ["herbal-supplements", "k-pop-merch", "k-beauty", "modern-hanbok"],
      },
    }, null, 2) + "\n"
  );

  console.log(
    `✓ ${label} (${date}) — ${categories.length} cats, ${allBrands.length} brands, ${allProducts.length} products, ${allSourcing.length} sources`
  );
}

async function main() {
  await fs.rm(DATA_DIR, { recursive: true, force: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  await generateSnapshot("2025-final", "2025 결산", tweakForYear(CATEGORIES_2026, 2025), "yearly-final");
  await generateSnapshot("2026-05-12", "2026 오늘", CATEGORIES_2026, "gemini-2.5-pro");

  await writeText(
    path.join(DATA_DIR, "latest.json"),
    JSON.stringify({ date: "2026-05-12" }, null, 2) + "\n"
  );
  const m = await buildManifest(DATA_DIR);
  console.log(`✓ latest.json + index.json (${m.snapshots.length} snapshots)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
