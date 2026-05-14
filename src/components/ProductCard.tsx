import type { Product } from "../types";
import { fmtKRW, fmtUSD } from "../lib/format";
import { IconExternal } from "./icons";

interface ProductCardProps {
  p: Product;
  rank: number;
}

export function ProductCard({ p, rank }: ProductCardProps) {
  return (
    <article className="product-row">
      <span className="pr-rank">{String(rank).padStart(2, "0")}</span>

      <div className="pr-main">
        <div className="pr-name">{p.name}</div>
        <div className="pr-name-en">{p.name_en}</div>
        <div className="pr-tags">
          {p.seo_tags.slice(0, 3).map((s, i) => (
            <span key={i} className="pr-tag">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="pr-meta">
        <span>{p.weight_g}g</span>
        <span className="sep">·</span>
        <span>cat {p.ebay_cat_id}</span>
      </div>

      <div className="pr-prices" title="AI 추정 시세 — 실제 구매 시 확인 필요">
        <div className="pc">
          <span className="lbl">도매(추정)</span>
          <span className="val">{fmtKRW(p.krw)}</span>
        </div>
        <div className="pc usd">
          <span className="lbl">eBay(추정)</span>
          <span className="val">{fmtUSD(p.ebay_usd)}</span>
        </div>
      </div>

      <div className={"pr-margin" + (p.margin >= 45 ? " hi" : "")}>
        {p.margin}%
      </div>

      <a
        className="pr-link"
        href="#"
        onClick={(e) => e.preventDefault()}
        title="원본 사이트"
      >
        <IconExternal />
      </a>
    </article>
  );
}
