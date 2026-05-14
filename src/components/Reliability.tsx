interface ReliabilityProps {
  value: number;
  max?: number;
  label?: string;
}

export function Reliability({ value, max = 5, label }: ReliabilityProps) {
  return (
    <span className="rely" aria-label={`${label || "신뢰도"} ${value}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < value ? 1 : 0.18 }}>
          ●
        </span>
      ))}
    </span>
  );
}
