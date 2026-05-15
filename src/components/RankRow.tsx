import { cx } from "../lib/format";

interface RankRowProps {
  rank: number;
  name: React.ReactNode;
  sub?: React.ReactNode;
  side?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  clickTarget?: boolean;
}

export function RankRow({
  rank,
  name,
  sub,
  side,
  active,
  onClick,
  clickTarget,
}: RankRowProps) {
  return (
    <div
      className={cx(
        "row",
        rank <= 3 && "top-3",
        active && "active",
        clickTarget && "click-target"
      )}
      style={active ? { background: "var(--hover)" } : undefined}
      onClick={onClick}
    >
      <span className="r-rank">{String(rank).padStart(2, "0")}</span>
      <div className="r-main">
        <span className="r-name">{name}</span>
        {sub && <span className="r-sub">{sub}</span>}
      </div>
      {side && <div className="r-side">{side}</div>}
    </div>
  );
}
