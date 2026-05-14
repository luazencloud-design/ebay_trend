import { useEffect, useMemo, useRef, useState } from "react";
import type { DateKey, SnapshotEntry } from "../types";
import { IconChevron } from "./icons";
import { CalendarPicker } from "./CalendarPicker";

interface DateSelectorProps {
  value: DateKey;
  snapshots: SnapshotEntry[];
  latest: DateKey | null;
  onChange: (key: DateKey) => void;
}

function dailyRelativeLabel(key: string, latest: DateKey | null): string {
  if (!latest || !/^\d{4}-\d{2}-\d{2}$/.test(latest)) return "";
  if (key === latest) return "오늘 · 매일 갱신";
  const latestDate = new Date(latest);
  const entryDate = new Date(key);
  const days = Math.round(
    (latestDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 1) return "어제";
  if (days > 1 && days < 7) return `${days}일 전`;
  if (days >= 7 && days < 14) return "지난 주";
  return "";
}

export function DateSelector({
  value,
  snapshots,
  latest,
  onChange,
}: DateSelectorProps) {
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

  const availableDaily = useMemo(
    () => new Set(snapshots.filter((s) => s.type === "daily").map((s) => s.key)),
    [snapshots]
  );
  const yearlySnapshots = useMemo(
    () => snapshots.filter((s) => s.type === "yearly"),
    [snapshots]
  );

  const isDaily = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isYearly = /-final$/.test(value);

  const triggerMain = isYearly ? value.replace("-final", " 결산") : value;
  const triggerSub = isDaily
    ? dailyRelativeLabel(value, latest)
    : isYearly
      ? "고정 데이터"
      : "";

  return (
    <div className="date-selector" ref={ref}>
      <button
        className={"ds-trigger" + (open ? " open" : "")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ds-label">날짜</span>
        <span className="ds-current">
          <span className="ds-main mono">{triggerMain}</span>
          {triggerSub && <span className="ds-sub">{triggerSub}</span>}
        </span>
        <span className="ds-chevron">
          <IconChevron />
        </span>
      </button>

      {open && (
        <div className="ds-popover wide">
          <CalendarPicker
            value={isDaily ? value : null}
            availableDaily={availableDaily}
            todayKey={latest && /^\d{4}-\d{2}-\d{2}$/.test(latest) ? latest : undefined}
            onSelect={(k) => {
              onChange(k);
              setOpen(false);
            }}
          />

          {yearlySnapshots.length > 0 && (
            <div className="cal-yearly">
              <div className="cal-yearly-label">연간 스냅샷</div>
              <div className="cal-yearly-chips">
                {yearlySnapshots.map((y) => (
                  <button
                    key={y.key}
                    className={
                      "cal-yearly-chip" + (y.key === value ? " active" : "")
                    }
                    onClick={() => {
                      onChange(y.key);
                      setOpen(false);
                    }}
                  >
                    {y.key.replace("-final", "")} 결산
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
