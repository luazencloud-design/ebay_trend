import {
  CATEGORIES,
  ONBOARDING_LEDE,
  QUICK_TIPS,
  SECONDARY_TIPS,
  type QuickTip,
  type AuctionCategory,
} from "../data/onboarding-content";

function ebaySearchUrl(query: string): string {
  // LH_Auction=1 filters to auction-only listings
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Auction=1`;
}

function TipCard({ tip }: { tip: QuickTip }) {
  return (
    <article className="ob-tip">
      <div className="ob-tip-emoji">{tip.emoji}</div>
      <div className="ob-tip-body">
        <h3 className="ob-tip-title">{tip.title}</h3>
        <p className="ob-tip-text">{tip.body}</p>
      </div>
    </article>
  );
}

function CategorySection({ c }: { c: AuctionCategory }) {
  return (
    <section className={"ob-cat ob-cat-" + c.slug}>
      <header className="ob-cat-head">
        <div className="ob-cat-emoji">{c.emoji}</div>
        <div className="ob-cat-main">
          <h2 className="ob-cat-title">{c.title}</h2>
          <p className="ob-cat-intro">{c.intro}</p>
        </div>
        <a
          className="ob-cat-link"
          href={ebaySearchUrl(c.ebay_query)}
          target="_blank"
          rel="noopener noreferrer"
        >
          eBay 경매 검색 →
        </a>
      </header>

      <ol className="ob-item-list">
        {c.items.map((it, i) => (
          <li key={i} className="ob-item">
            <span className="ob-item-num mono">{String(i + 1).padStart(2, "0")}</span>
            <div className="ob-item-body">
              <div className="ob-item-name">{it.name}</div>
              <div className="ob-item-why">{it.why}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Tiny inline parser for **bold** inside the lede (no full markdown). */
function renderLede(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function OnboardingPage() {
  return (
    <div className="stage onboarding">
      <header className="ob-hero">
        <span className="ob-hero-eyebrow">시작 가이드</span>
        <h1 className="ob-hero-title">
          eBay 첫 <span className="ob-hero-accent">90일</span>
          <br />
          $1 경매로 상점 깨우기
        </h1>
        <p className="ob-hero-lede">
          {ONBOARDING_LEDE.split("\n\n").map((para, i) => (
            <span key={i} className="ob-lede-para">
              {renderLede(para)}
            </span>
          ))}
        </p>
      </header>

      <section className="ob-tips-grid">
        {QUICK_TIPS.map((t) => (
          <TipCard key={t.title} tip={t} />
        ))}
      </section>

      <section className="ob-cats">
        <div className="ob-cats-head">
          <h2 className="ob-cats-title">$1 경매 추천 상품 50선</h2>
          <p className="ob-cats-sub">
            도매·다이소·문구시장에서 1,000~3,000원에 쉽게 구할 수 있고, 우편봉투나
            소형 포장물로 보낼 수 있는 무게 가벼운 아이템들. 카테고리별 검색 링크로
            현재 진행 중인 진짜 경매를 바로 확인하세요.
          </p>
        </div>

        {CATEGORIES.map((c) => (
          <CategorySection key={c.slug} c={c} />
        ))}
      </section>

      <section className="ob-secondary">
        <div className="ob-cats-head">
          <h2 className="ob-cats-title">알아두면 좋은 보너스 팁</h2>
        </div>
        <div className="ob-tips-grid">
          {SECONDARY_TIPS.map((t) => (
            <TipCard key={t.title} tip={t} />
          ))}
        </div>
      </section>

      <footer className="ob-footer">
        <p>
          이 가이드는 일반적인 전략을 안내합니다. 실제 상품·가격·관세는 항상 직접
          확인하세요. 데이터 기반 트렌드는{" "}
          <a href="/" className="ob-footer-link">
            대시보드
          </a>
          에서 매주 갱신됩니다.
        </p>
      </footer>
    </div>
  );
}
