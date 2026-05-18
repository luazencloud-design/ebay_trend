// Curated content for the eBay onboarding guide.
// Static (not Gemini-generated) — reliability matters here.

export interface QuickTip {
  emoji: string;
  title: string;
  body: string;
}

export interface AuctionItem {
  name: string;
  why: string;
}

export interface AuctionCategory {
  slug: string;
  emoji: string;
  title: string;
  intro: string;
  /** Used to build the eBay search URL (auction filter on). */
  ebay_query: string;
  items: AuctionItem[];
}

export const ONBOARDING_LEDE = `이베이는 꾸준히 씨앗을 뿌리고 가꾸는 **농사형 플랫폼**입니다. 신규 셀러는 알고리즘(Best Match)에 "이 상점은 활발하다"는 신호부터 보내야 합니다.

가장 빠르고 강력한 촉진제가 **$1 시작 경매**예요. 수익이 목적이 아니라 **피드백 확보 + 트래픽 유도**가 진짜 목적입니다.`;

export const QUICK_TIPS: QuickTip[] = [
  {
    emoji: "⏰",
    title: "종료 시각 — 미국 일요일 저녁",
    body: "이베이 비딩 전쟁은 미국 서부 시간 일요일 18~21시에 가장 치열. 한국 시간 월요일 오전 10~13시에 종료되게 7일 경매를 등록하세요.",
  },
  {
    emoji: "💰",
    title: "배송비로 원가 방어",
    body: "시작가는 $0.99로 두되 배송비를 Calculated 또는 Flat $5~7로 설정. 낙찰가 $1이어도 K-Packet/EMS 비용을 충당하고 본전 칠 수 있습니다.",
  },
  {
    emoji: "📊",
    title: "경매 2 : 고정가 8 황금 비율",
    body: "경매는 상점에 손님을 끌어들이는 미끼. 미끼로 들어온 바이어가 80% 비중의 Buy It Now 본 상품을 묶음으로 사 가도록 동선을 짜세요.",
  },
  {
    emoji: "📨",
    title: "손편지 + 한국 간식 동봉",
    body: "약과·말랑카우 같은 가벼운 한국 간식 + 감사 메모를 함께 발송. 배송 완료 후 \"피드백 부탁\" 메시지까지 — 100% 긍정 피드백 빠르게 누적.",
  },
];

export const SECONDARY_TIPS: QuickTip[] = [
  {
    emoji: "📅",
    title: "매일 1~2개 꾸준한 업로드",
    body: "주 1회 10개 몰아서 등록보다 매일 1~2개씩이 알고리즘 우대. 예약 등록 기능을 활용해서라도 상점이 살아 움직이게.",
  },
  {
    emoji: "🛒",
    title: "판매 전 바이어로 먼저 활동",
    body: "신규 계정이면 0.99달러짜리 디지털 상품/소품을 5~10개 먼저 구매. 바이어 피드백도 계정 점수에 합산돼 신뢰도가 빠르게 쌓입니다.",
  },
];

export const CATEGORIES: AuctionCategory[] = [
  {
    slug: "k-culture",
    emoji: "🎤",
    title: "K-Culture & 캐릭터 굿즈",
    intro:
      "전 세계 팬덤이 가장 두꺼운 카테고리. 1달러로 올려도 비딩이 무조건 붙고, 우편봉투로 보낼 수 있어 배송비 부담이 거의 없음.",
    ebay_query: "kpop photocard",
    items: [
      { name: "K-POP 아이돌 포토카드", why: "BTS·세븐틴·뉴진스·에스파 — 미개봉 앨범 특전이 인기" },
      { name: "콘서트 공식 굿즈 슬로건", why: "팬덤 충성도 높아 즉시 비딩" },
      { name: "한국어 학습 단어 카드", why: "K-콘텐츠 팬들의 한국어 학습 수요" },
      { name: "한국 전통 금속 책갈피", why: "기념품 + 수집 양쪽 수요, 가볍고 부서지지 않음" },
      { name: "한글 자모 디자인 스티커", why: "다이어리 꾸미기 + 한국어 학습 시너지" },
      { name: "한국 관광지 마그넷", why: "서울·부산·제주 — 조밀한 디자인이 인기" },
      { name: "한복 곰인형 키링", why: "전통 + 캐릭터 결합. 선물용 수요" },
      { name: "한국 수묵화 엽서 세트", why: "예술 컬렉터 대상, 매우 가벼움" },
      { name: "최고심·망그러진곰 굿즈", why: "한국 인디 IP의 글로벌 팬덤 증가 중" },
      { name: "포토카드 탑로더 + 데코 세트", why: "K-POP 팬 필수 소품, 반복 구매 ↑" },
    ],
  },
  {
    slug: "k-beauty-sample",
    emoji: "💄",
    title: "K-뷰티 샘플 & 소형 미용",
    intro:
      "본품은 무겁고 유통기한 부담이 있지만 샘플·소품은 가벼움. 여성 바이어의 첫 구매 유도가 쉽고 K-뷰티 명성을 활용 가능.",
    ebay_query: "korean mask pack",
    items: [
      { name: "메디힐·이니스프리 마스크팩 3~5장 묶음", why: "K-뷰티 입문템, 부피 작음" },
      { name: "닥터지·설화수 미니어처 파우치", why: "샘플 모음으로 시리즈 가치 ↑" },
      { name: "캐릭터 수면 양말", why: "K-양말은 품질로 정평, 가성비 톱" },
      { name: "동물 모양 세안 헤어밴드", why: "$1~2 도매가, 사진 빨이 좋음" },
      { name: "휴대용 미니 메이크업 브러시 5종", why: "여행자·MUA 수요" },
      { name: "네일아트 워터 슬라이드 스티커", why: "셀프 네일러 글로벌 수요 폭증" },
      { name: "한국 한정판 립밤", why: "니베아 망고/딸기 등 한정판 프리미엄" },
      { name: "캐릭터 에어팟·버즈 케이스", why: "트렌드 빠르지만 마진 좋음" },
      { name: "패션 마스크", why: "연예인 착용 스타일/독특한 패턴" },
      { name: "미니 헤어롤 (앞머리 롤)", why: "한국 여성 일상 아이템으로 호기심 ↑" },
    ],
  },
  {
    slug: "k-stationery",
    emoji: "✏️",
    title: "K-문구 & 다꾸 용품",
    intro:
      "디자인 강국 한국의 진짜 강점. 일러스트·감성·기능 다 잡고 무게도 가벼움. 다꾸(다이어리 꾸미기) 문화는 일본·미국·동남아 모두 인기.",
    ebay_query: "korean masking tape",
    items: [
      { name: "디자인 마스킹 테이프", why: "수채화·일러스트 패턴이 인기. 천유닷컴 도매가 ₩500~1,500" },
      { name: "다꾸 떡메모지 묶음", why: "감성 짙은 디자인일수록 좋음" },
      { name: "캐릭터 젤펜·볼펜 3본 세트", why: "묶음 판매로 객단가 ↑" },
      { name: "입체 팝업 카드", why: "생일·감사 카드 — 선물용 수요" },
      { name: "레트로 성냥갑 모양 메모지", why: "유니크 디자인, 인스타 인증샷 잘 받음" },
      { name: "홀로그램·글리터 스티커 팩", why: "다꾸러들의 필수템" },
      { name: "미니 포켓 다이어리", why: "손바닥 크기로 휴대성 강조" },
      { name: "빈티지 종이 패키지", why: "유럽풍 다꾸 레이어드 재료" },
      { name: "동물 모양 북마크·클립", why: "독서용 + 데스크 인테리어" },
      { name: "디자인 스케줄러 패드", why: "Weekly/Monthly 양식이 인기" },
    ],
  },
  {
    slug: "collectibles",
    emoji: "🪙",
    title: "수집품 & 취미 (Collectibles)",
    intro:
      "이베이의 뿌리. 가치가 매니아에 의해 결정돼서 $1 시작가가 예상 외로 치솟는 재미. 진위·상태가 핵심이라 사진과 설명을 정직하게.",
    ebay_query: "starbucks korea city card",
    items: [
      { name: "스타벅스 코리아 시티 카드", why: "충전 안 한 수집용, 한국 한정판이라 글로벌 컬렉터 수요" },
      { name: "포켓몬 카드 한글판 홀로그램", why: "한글판 자체가 희소가치" },
      { name: "유희왕 카드 한글판 레어", why: "동일 — 한글판 = 컬렉터 어필" },
      { name: "K리그·KBO 스포츠 카드", why: "한국 스포츠 매니아 글로벌 형성 중" },
      { name: "한국 기념 주화·구권 지폐", why: "한국은행 발행 미사용분이 안전" },
      { name: "빈티지 핀 배지·열쇠고리", why: "$1 시작 가능, 묶어 팔수록 가치" },
      { name: "산리오·캐릭터 가챠 피규어", why: "캡슐 토이는 거의 무한 수요" },
      { name: "레고 미니피겨 단품", why: "특정 시리즈는 단품으로도 비싸짐" },
      { name: "편의점 한정 콜라보 토이", why: "한국 한정 = 글로벌 희귀템" },
      { name: "한국 우표·앨범 잔여분", why: "수집용 정리분도 시장 있음" },
    ],
  },
  {
    slug: "k-lifestyle",
    emoji: "🏠",
    title: "K-생활 잡화 & 아이디어 굿즈",
    intro:
      "해외에서 신기해하는 한국 일상템. 다이소·올영 등에서 1~3천 원에 쉽게 구할 수 있어 초보가 부담 없이 시작 가능.",
    ebay_query: "korean kitchen gadget",
    items: [
      { name: "한국 반짝이 수세미", why: "해외에선 신기해하는 K-주방템" },
      { name: "요일별 분할 미니 약통", why: "건강 관리 시장 글로벌 수요" },
      { name: "캐릭터 스마트폰 그립톡", why: "디자인 다양하고 객단가 좋음" },
      { name: "실리콘 컵받침", why: "캐릭터 모양은 선물용 인기" },
      { name: "안경 파우치 + 초극세사 클리너", why: "디자인 프린팅 버전이 잘 팔림" },
      { name: "여행용 소형 압축 파우치", why: "여행 수요 글로벌, 가벼움" },
      { name: "멀티 케이블 정리 타이 세트", why: "재택근무·디지털 노마드 수요" },
      { name: "자전거 LED 밸브 라이트", why: "야간 안전용 — 작고 가벼움" },
      { name: "신발 끈 안 풀리는 실리콘 끈", why: "러너·아이 부모 타겟" },
      { name: "디자인 휴대용 손거울", why: "한국 캐릭터 디자인이 강점" },
    ],
  },
];
