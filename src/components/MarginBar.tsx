interface MarginBarProps {
  pct: number;
}

export function MarginBar({ pct }: MarginBarProps) {
  return (
    <div className="margin-bar">
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
