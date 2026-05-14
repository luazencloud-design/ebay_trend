interface PanelProps {
  title: string;
  count?: string;
  action?: string | null;
  onAction?: () => void;
  hint?: string;
  children: React.ReactNode;
}

export function Panel({ title, count, action, onAction, hint, children }: PanelProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          {title}
          {count && <span className="pip">{count}</span>}
        </div>
        {action && (
          <span className="panel-action" onClick={onAction}>
            {action}
          </span>
        )}
        {hint && !action && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}
