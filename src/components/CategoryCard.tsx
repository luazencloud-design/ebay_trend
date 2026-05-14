import type { Category } from "../types";
import { Change } from "./Change";
import { Competition } from "./Competition";
import { MarginBar } from "./MarginBar";
import { Sparkline } from "./Sparkline";
import { SurgeBadge } from "./SurgeBadge";
import { ZonePill } from "./ZonePill";

interface CategoryCardProps {
  c: Category;
  onClick: () => void;
}

export function CategoryCard({ c, onClick }: CategoryCardProps) {
  const trendDir = c.change > 0 ? "up" : c.change < 0 ? "down" : "flat";
  const sparkColor = c.zone === "red" ? "var(--red)" : "var(--blue)";

  return (
    <article
      className={"cat-card zone-" + c.zone}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="cat-rank">
        <div className="rank-num">
          #<em className="tnum">{String(c.rank).padStart(2, "0")}</em>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {c.change >= 4 && <SurgeBadge change={c.change} />}
          <ZonePill zone={c.zone} />
        </div>
      </div>

      <div>
        <h3 className="cat-name">{c.name_kr}</h3>
        <div className="cat-name-en">{c.name_en}</div>
      </div>

      <Sparkline seed={c.slug} color={sparkColor} trend={trendDir} height={26} />

      <div className="cat-meta-row">
        <div className="meta-cell">
          <span className="lbl">순위변동</span>
          <span className="val">
            <Change value={c.change} />
          </span>
        </div>
        <div className="meta-cell">
          <span className="lbl">경쟁강도</span>
          <span className="val">
            <Competition value={c.comp} />
          </span>
        </div>
        <div className="meta-cell" style={{ gridColumn: "1 / -1" }}>
          <span
            className="lbl"
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>평균 마진</span>
            <span className="mono">{c.margin}%</span>
          </span>
          <MarginBar pct={c.margin} />
        </div>
      </div>
    </article>
  );
}
