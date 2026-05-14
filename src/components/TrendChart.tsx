import { useMemo } from "react";

function mkSeries(seed: string, bias: "up" | "down" = "up"): number[] {
  const s = String(seed)
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const out: number[] = [];
  const n = 12;
  let base = 50 + (s % 20);
  for (let i = 0; i < n; i++) {
    const wig = ((s * (i + 7)) % 25) - 12;
    const drift = bias === "up" ? i * 1.8 : -i * 0.8;
    base = Math.max(15, Math.min(95, base + wig * 0.45 + drift * 0.4));
    out.push(base);
  }
  return out;
}

interface TrendChartProps {
  slug: string;
}

export function TrendChart({ slug }: TrendChartProps) {
  const series2025 = useMemo(() => mkSeries(slug + "-2025", "down"), [slug]);
  const series2026 = useMemo(() => mkSeries(slug + "-2026", "up"), [slug]);
  const w = 320;
  const h = 100;
  const max = Math.max(...series2025, ...series2026) * 1.05;

  const toPath = (arr: number[]) =>
    arr
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"} ${(i / (arr.length - 1)) * w} ${
            h - (v / max) * h
          }`
      )
      .join(" ");

  return (
    <div className="trend-chart">
      <div className="lbl">
        <span>검색 관심도</span>
        <span className="mono">2025 vs 2026</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            x2={w}
            y1={h * p}
            y2={h * p}
            stroke="var(--border)"
            strokeWidth="0.6"
            strokeDasharray="2 4"
          />
        ))}
        <path
          d={toPath(series2025) + ` L ${w} ${h} L 0 ${h} Z`}
          fill="var(--text-muted)"
          fillOpacity="0.06"
        />
        <path
          d={toPath(series2025)}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.4"
          strokeDasharray="3 3"
        />
        <path
          d={toPath(series2026) + ` L ${w} ${h} L 0 ${h} Z`}
          fill="var(--blue)"
          fillOpacity="0.10"
        />
        <path
          d={toPath(series2026)}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
        />
        <circle
          cx={w}
          cy={h - (series2026[series2026.length - 1] / max) * h}
          r="3"
          fill="var(--blue)"
        />
        <circle
          cx={w}
          cy={h - (series2026[series2026.length - 1] / max) * h}
          r="6"
          fill="var(--blue)"
          fillOpacity="0.15"
        />
      </svg>
      <div className="trend-legend">
        <span>
          <i style={{ background: "var(--blue)" }} /> 2026
        </span>
        <span>
          <i style={{ background: "var(--text-muted)" }} /> 2025
        </span>
        <span
          style={{ marginLeft: "auto", color: "var(--green)" }}
          className="mono"
        >
          +34.2%
        </span>
      </div>
    </div>
  );
}
