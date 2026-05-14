interface HintBannerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function HintBanner({ open, onClose, children }: HintBannerProps) {
  if (!open) return null;
  return (
    <div className="hint-banner">
      <span className="ldot" />
      <span>{children}</span>
      <span className="x" onClick={onClose}>
        ✕
      </span>
    </div>
  );
}
