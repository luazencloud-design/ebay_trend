import { useMemo, useState } from "react";
import type { DateKey } from "../types";

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

/** Return the Monday of the week containing this date. */
function getMonday(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0=Sun, 1=Mon, ...
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

interface WeekRow {
  monday: Date;
  sunday: Date;
  weekN: number;
  available: string | null; // latest daily key in this week's range
}

/** Build all weeks whose Monday falls inside the given month. */
function buildWeeksForMonth(
  year: number,
  month: number,
  availableDaily: Set<string>
): WeekRow[] {
  // Find first Monday in the month
  let monday = new Date(year, month, 1);
  while (monday.getDay() !== 1) {
    monday.setDate(monday.getDate() + 1);
  }

  const weeks: WeekRow[] = [];
  let weekN = 1;
  while (monday.getMonth() === month) {
    const sunday = addDays(monday, 6);

    // Find latest daily snapshot in [monday, sunday]
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

  const weeks = useMemo(
    () => buildWeeksForMonth(viewYear, viewMonth, availableDaily),
    [viewYear, viewMonth, availableDaily]
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

  // Which week (Monday key) is the selected snapshot in?
  const selectedDate = value ? parseKey(value) : null;
  const selectedMondayKey = selectedDate ? toKey(getMonday(selectedDate)) : null;

  // Which week is "this week" (per todayKey)?
  const todayDate = todayKey ? parseKey(todayKey) : null;
  const thisWeekMondayKey = todayDate ? toKey(getMonday(todayDate)) : null;

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

      <div className="cal-weeks">
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
