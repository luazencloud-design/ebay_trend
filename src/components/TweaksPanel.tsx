import { useEffect, useRef, useState } from "react";
import type { Density, Typo } from "../types";

interface TweaksPanelProps {
  typo: Typo;
  density: Density;
  onChangeTypo: (v: Typo) => void;
  onChangeDensity: (v: Density) => void;
}

const TYPO_OPTIONS: Array<{ value: Typo; label: string }> = [
  { value: "default", label: "Default — Pretendard + Mono" },
  { value: "display", label: "Display — Tighter, bolder" },
  { value: "editorial", label: "Editorial — Serif headlines" },
  { value: "mono", label: "Mono — Terminal everything" },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfy" },
  { value: "spacious", label: "Spacious" },
];

export function TweaksPanel({
  typo,
  density,
  onChangeTypo,
  onChangeDensity,
}: TweaksPanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="twk-wrap" ref={ref}>
      <button
        className={"twk-fab" + (open ? " open" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-label="Tweaks"
      >
        ⚙
      </button>
      {open && (
        <div className="twk-popover">
          <div className="twk-popover-head">
            <b>Tweaks</b>
            <button className="twk-close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="twk-sect">Typography</div>
          <select
            className="twk-select"
            value={typo}
            onChange={(e) => onChangeTypo(e.target.value as Typo)}
          >
            {TYPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="twk-sect">Card density</div>
          <div className="twk-segment">
            {DENSITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={"twk-seg-btn" + (density === o.value ? " active" : "")}
                onClick={() => onChangeDensity(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
