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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Compute "M월 N주차" label for a date key. */
function weekLabel(key: string): { main: string; sub: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // Find Monday of this week
  const monday = new Date(d);
  const dow = monday.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + offset);

  // Position-of-Monday within the month
  let firstMonday = new Date(monday.getFullYear(), monday.getMonth(), 1);
  while (firstMonday.getDay() !== 1) {
    firstMonday.setDate(firstMonday.getDate() + 1);
  }
  const weekN =
    Math.floor((monday.getDate() - firstMonday.getDate()) / 7) + 1;

  return {
    main: `${monday.getMonth() + 1}월 ${weekN}주차`,
    sub: `${monday.getMonth() + 1}/${monday.getDate()} ~ ${d.getMonth() + 1}/${d.getDate()} 데이터`,
  };
}

function dailyRelativeLabel(key: string, latest: DateKey | null): string {
  if (!latest || !/^\d{4}-\d{2}-\d{2}$/.test(latest)) return "";
  // Same week as latest?
  const a = new Date(key);
  const b = new Date(latest);
  const offsetA = a.getDay() === 0 ? -6 : 1 - a.getDay();
  const offsetB = b.getDay() === 0 ? -6 : 1 - b.getDay();
  const mondayA = new Date(a); mondayA.setDate(a.getDate() + offsetA);
  const mondayB = new Date(b); mondayB.setDate(b.getDate() + offsetB);
  if (
    mondayA.getFullYear() === mondayB.getFullYear() &&
    mondayA.getMonth() === mondayB.getMonth() &&
    mondayA.getDate() === mondayB.getDate()
  ) {
    return "이번 주 · 최신";
  }
  const weeksDiff = Math.round(
    (mondayB.getTime() - mondayA.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );
  if (weeksDiff === 1) return "지난 주";
  if (weeksDiff > 1) return `${weeksDiff}주 전`;
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

  let triggerMain = value;
  let triggerSub = "";
  if (isYearly) {
    triggerMain = value.replace("-final", " 결산");
    triggerSub = "고정 데이터";
  } else if (isDaily) {
    const wl = weekLabel(value);
    if (wl) {
      triggerMain = wl.main;
      triggerSub = dailyRelativeLabel(value, latest) || wl.sub;
    }
  }

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
