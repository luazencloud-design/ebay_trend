import type { Route } from "../types";
import { cx } from "../lib/format";

interface TopbarProps {
  route: Route;
  nav: (r: Route) => void;
  updatedAt?: string;
}

export function Topbar({ route, nav, updatedAt = "오늘 04:00" }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div
          className="brand"
          onClick={() => nav({ stage: 1 })}
          style={{ cursor: "pointer" }}
        >
          <div className="brand-logo">K</div>
          <div className="brand-name">
            K-Trend<span className="sub">eBay 셀러 리서치</span>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          <a
            className={cx("tb-btn", route.stage === 1 && "active")}
            style={{ padding: "6px 10px" }}
            onClick={() => nav({ stage: 1 })}
          >
            대시보드
          </a>
        </nav>
        <div className="topbar-meta">
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="주 1회 (월요일 새벽) 갱신. 30일 이상 지난 스냅샷은 자동 압축됩니다."
          >
            <span className="dot" />
            <span className="mono">{updatedAt}</span>
            <span>업데이트 · 지난 주 대비</span>
          </span>
          <span style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span>
            김셀러 <span style={{ color: "var(--text-muted)" }}>· Free</span>
          </span>
        </div>
      </div>
    </header>
  );
}
