import { useMemo } from "react";

interface SparklineProps {
  seed: string;
  color?: string;
  trend?: "up" | "down" | "flat";
  height?: number;
}

export function Sparkline({
  seed,
  color = "currentColor",
  trend = "up",
  height = 28,
}: SparklineProps) {
  const pts = useMemo(() => {
    const s = String(seed)
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    const out: number[] = [];
    const n = 16;
    let base = 50 + (s % 30) - 15;
    for (let i = 0; i < n; i++) {
      const wig = ((s * (i + 3)) % 31) - 15;
      const drift = trend === "up" ? i * 1.6 : trend === "down" ? -i * 1.4 : 0;
      base = Math.max(8, Math.min(92, base + wig * 0.4 + drift * 0.25));
      out.push(base);
    }
    return out;
  }, [seed, trend]);

  const w = 100;
  const h = 100;
  const n = pts.length;
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (n - 1)) * w} ${h - p}`)
    .join(" ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height }}
    >
      <path d={area} fill={color} fillOpacity="0.08" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={h - pts[pts.length - 1]} r="1.8" fill={color} />
    </svg>
  );
}
