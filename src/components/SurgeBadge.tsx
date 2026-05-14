import { IconSurge } from "./icons";

interface SurgeBadgeProps {
  change: number;
}

export function SurgeBadge({ change }: SurgeBadgeProps) {
  return (
    <span className="surge-badge" title={`${change}계단 급상승`}>
      <IconSurge />
      급상승
    </span>
  );
}
