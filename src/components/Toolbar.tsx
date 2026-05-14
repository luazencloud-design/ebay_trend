import { cx } from "../lib/format";

interface ToolbarProps {
  children: React.ReactNode;
}
export function Toolbar({ children }: ToolbarProps) {
  return <div className="toolbar">{children}</div>;
}

interface ToolbarGroupProps {
  label: string;
  children: React.ReactNode;
}
export function ToolbarGroup({ label, children }: ToolbarGroupProps) {
  return (
    <div className="tb-group">
      <span className="tb-label">{label}</span>
      {children}
    </div>
  );
}

interface ToolbarBtnProps<T extends string> {
  value: T;
  active: T;
  onClick: (v: T) => void;
  children: React.ReactNode;
}
export function ToolbarBtn<T extends string>({
  value,
  active,
  onClick,
  children,
}: ToolbarBtnProps<T>) {
  return (
    <button
      className={cx("tb-btn", value === active && "active")}
      onClick={() => onClick(value)}
    >
      {children}
    </button>
  );
}

export function ToolbarSpacer() {
  return <div className="tb-spacer" />;
}
