import { useMemo, useState } from "react";
import type { DateKey } from "../types";
import { cx } from "../lib/format";

interface CalendarPickerProps {
  /** Selected daily key (YYYY-MM-DD) or null if a yearly snapshot is active. */
  value: DateKey | null;
  /** All available daily snapshot keys. */
  availableDaily: Set<string>;
  /** Today's date in KST, used to highlight current week. */
  todayKey?: string;
  onSelect: (key: DateKey) => void;
}

const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseKey(k: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getMonday(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

interface WeekRow {
  monday: Date;
  sunday: Date;
  weekN: number;
  available: string | null;
}

function buildWeeksForMonth(
  year: number,
  month: number,
  availableDaily: Set<string>
): WeekRow[] {
  let monday = new Date(year, month, 1);
  while (monday.getDay() !== 1) {
    monday.setDate(monday.getDate() + 1);
  }

  const weeks: WeekRow[] = [];
  let weekN = 1;
  while (monday.getMonth() === month) {
    const sunday = addDays(monday, 6);

    let latest: string | null = null;
    for (let i = 0; i < 7; i++) {
      const key: string = toKey(addDays(monday, i));
      if (availableDaily.has(key)) {
        if (latest === null || key > latest) latest = key;
      }
    }

    weeks.push({ monday: new Date(monday), sunday, weekN, available: latest });
    monday = addDays(monday, 7);
    weekN++;
  }

  return weeks;
}

const fmtMD = (d: Date): string => `${d.getMonth() + 1}/${d.getDate()}`;

type Dir = "up" | "down";

export function CalendarPicker({
  value,
  availableDaily,
  todayKey,
  onSelect,
}: CalendarPickerProps) {
  const initial = useMemo(() => {
    const fromValue = value ? parseKey(value) : null;
    if (fromValue) return fromValue;
    const fromToday = todayKey ? parseKey(todayKey) : null;
    if (fromToday) return fromToday;
    const latest = [...availableDaily].sort().reverse()[0];
    const fromLatest = latest ? parseKey(latest) : null;
    return fromLatest ?? new Date();
  }, [value, todayKey, availableDaily]);

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  // Animation direction: "up" = newer (rows enter from below),
  //                     "down" = older (rows enter from above).
  const [dir, setDir] = useState<Dir>("up");

  const weeks = useMemo(
    () => buildWeeksForMonth(viewYear, viewMonth, availableDaily),
    [viewYear, viewMonth, availableDaily]
  );

  const navYear = (delta: number) => {
    setDir(delta > 0 ? "up" : "down");
    setViewYear((y) => y + delta);
  };

  const navMonth = (delta: number) => {
    setDir(delta > 0 ? "up" : "down");
    let nm = viewMonth + delta;
    let ny = viewYear;
    if (nm < 0) {
      nm = 11;
      ny -= 1;
    } else if (nm > 11) {
      nm = 0;
      ny += 1;
    }
    setViewMonth(nm);
    setViewYear(ny);
  };

  const selectedDate = value ? parseKey(value) : null;
  const selectedMondayKey = selectedDate ? toKey(getMonday(selectedDate)) : null;

  const todayDate = todayKey ? parseKey(todayKey) : null;
  const thisWeekMondayKey = todayDate ? toKey(getMonday(todayDate)) : null;

  return (
    <div className="cal">
      <div className="cal-head">
        <div className="cal-nav-group">
          <button className="cal-nav" onClick={() => navYear(-1)} aria-label="이전 년">‹</button>
          <span className="cal-title mono">{viewYear}</span>
          <button className="cal-nav" onClick={() => navYear(1)} aria-label="다음 년">›</button>
        </div>
        <div className="cal-nav-group">
          <button className="cal-nav" onClick={() => navMonth(-1)} aria-label="이전 달">‹</button>
          <span className="cal-title mono">{MONTH_NAMES[viewMonth]}</span>
          <button className="cal-nav" onClick={() => navMonth(1)} aria-label="다음 달">›</button>
        </div>
      </div>

      {/* key forces re-mount on nav → CSS animation retriggers */}
      <div
        key={`${viewYear}-${viewMonth}`}
        className={cx("cal-weeks", `dir-${dir}`)}
      >
        {weeks.map((w) => {
          const mKey = toKey(w.monday);
          const isSelected = selectedMondayKey === mKey;
          const isThisWeek = thisWeekMondayKey === mKey;
          const isAvail = w.available !== null;

          return (
            <button
              key={mKey}
              className={
                "cal-week-row" +
                (isAvail ? " avail" : " unavail") +
                (isSelected ? " selected" : "") +
                (isThisWeek ? " this-week" : "")
              }
              disabled={!isAvail}
              onClick={() => isAvail && w.available && onSelect(w.available)}
              title={isAvail ? `최신 데이터: ${w.available}` : "데이터 없음"}
            >
              <span className="cal-week-num mono">
                {viewMonth + 1}월 {w.weekN}주차
              </span>
              <span className="cal-week-range mono">
                {fmtMD(w.monday)} ~ {fmtMD(w.sunday)}
              </span>
              <span className="cal-week-status mono">
                {isAvail ? (
                  <>
                    {isThisWeek ? "이번 주 " : ""}
                    {w.available!.slice(5).replace("-", "/")}
                  </>
                ) : (
                  <span className="dim">—</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
