import { useState } from "react";
import type { Category, InsightPeriod, InsightsBundle } from "../types";

interface AIInsightsProps {
  bundle: InsightsBundle;
  /** Full categories list so focus_categories can render with Korean names. */
  categories: Category[];
  /** Click handler for category chips. */
  onCategoryClick?: (catSlug: string) => void;
}

// JSON keys stay daily/weekly/yearly for backward compat with existing
// snapshots; semantics have shifted up one tier since the cron is now weekly.
const PERIODS: Array<{ key: InsightPeriod; label: string; sublabel: string }> = [
  { key: "daily", label: "이번 주", sublabel: "지난 주 대비" },
  { key: "weekly", label: "이번 달", sublabel: "4주 누적 트렌드" },
  { key: "yearly", label: "올해", sublabel: "장기 포트폴리오" },
];

export function AIInsights({ bundle, categories, onCategoryClick }: AIInsightsProps) {
  const [active, setActive] = useState<InsightPeriod>("daily");
  const insight = bundle[active];
  const catMap = new Map(categories.map((c) => [c.slug, c]));

  return (
    <section className="ai-insights">
      <div className="ai-head">
        <div className="ai-head-left">
          <span className="ai-glyph" aria-hidden>✦</span>
          <span className="ai-label">AI 인사이트</span>
        </div>
        <div className="ai-tabs" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={"ai-tab" + (active === p.key ? " active" : "")}
              role="tab"
              aria-selected={active === p.key}
              onClick={() => setActive(p.key)}
            >
              <span className="ai-tab-main">{p.label}</span>
              <span className="ai-tab-sub">{p.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ai-body">
        <h3 className="ai-headline">{insight.headline}</h3>
        <p className="ai-text">{insight.body}</p>
        {insight.focus_categories && insight.focus_categories.length > 0 && (
          <div className="ai-chips">
            {insight.focus_categories.map((slug) => {
              const cat = catMap.get(slug);
              if (!cat) return null;
              return (
                <button
                  key={slug}
                  className={"ai-chip zone-" + cat.zone}
                  onClick={() => onCategoryClick?.(slug)}
                >
                  #{cat.name_kr}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
