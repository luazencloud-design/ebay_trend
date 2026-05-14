interface MiniBadgeProps {
  variant: "new" | "hot";
  children: React.ReactNode;
}

export function MiniBadge({ variant, children }: MiniBadgeProps) {
  return <span className={`mini-badge ${variant}`}>{children}</span>;
}
