interface CompetitionProps {
  value: number;
  max?: number;
}

export function Competition({ value, max = 5 }: CompetitionProps) {
  const high = value >= 4;
  return (
    <span
      className={"comp" + (high ? " high" : "")}
      aria-label={`경쟁강도 ${value}/${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <i key={i} className={"bar" + (i < value ? " on" : "")} />
      ))}
    </span>
  );
}
