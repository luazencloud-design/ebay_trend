import { useMemo, useState } from "react";
import type { DateKey } from "../types";

interface CalendarPickerProps {
  /** Selected daily key (YYYY-MM-DD) or null if a yearly snapshot is active. */
  value: DateKey | null;
  /** All available daily snapshot keys. */
  availableDaily: Set<string>;
  /** Today's date in KST, used to highlight today. */
  todayKey?: string;
  onSelect: (key: DateKey) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseKey(k: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

interface Cell {
  date: Date;
  key: string;
  muted: boolean;
}

function buildMonthCells(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Cell[] = [];

  // Previous month tail
  if (startWeekday > 0) {
    const prevLastDate = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLastDate - i);
      cells.push({ date: d, key: toKey(d), muted: true });
    }
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, key: toKey(date), muted: false });
  }

  // Next month head — fill to 6 rows (42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    cells.push({ date, key: toKey(date), muted: true });
  }

  return cells;
}

export function CalendarPicker({
  value,
  availableDaily,
  todayKey,
  onSelect,
}: CalendarPickerProps) {
  // Initial month: from selected value, else today, else latest available
  const initial = useMemo(() => {
    const fromSelected = value ? parseKey(value) : null;
    if (fromSelected) return fromSelected;
    const fromToday = todayKey ? parseKey(todayKey) : null;
    if (fromToday) return fromToday;
    const latest = [...availableDaily].sort().reverse()[0];
    const fromLatest = latest ? parseKey(latest) : null;
    return fromLatest ?? new Date();
  }, [value, todayKey, availableDaily]);

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" onClick={goPrev} aria-label="이전 달">
          ‹
        </button>
        <div className="cal-title mono">
          {viewYear}년 {MONTH_NAMES[viewMonth]}
        </div>
        <button className="cal-nav" onClick={goNext} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={"cal-weekday" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}
          >
            {w}
          </span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((c, i) => {
          const available = availableDaily.has(c.key);
          const selected = c.key === value;
          const today = c.key === todayKey;
          const dow = c.date.getDay();
          return (
            <button
              key={i}
              className={
                "cal-cell" +
                (c.muted ? " muted" : "") +
                (available ? " avail" : " unavail") +
                (selected ? " selected" : "") +
                (today ? " today" : "") +
                (dow === 0 ? " sun" : dow === 6 ? " sat" : "")
              }
              disabled={!available}
              onClick={() => available && onSelect(c.key)}
              title={available ? c.key : "데이터 없음"}
            >
              <span className="cal-day mono">{c.date.getDate()}</span>
              {available && <span className="cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
