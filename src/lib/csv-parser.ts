// Minimal RFC4180 CSV parser. Handles quoted fields with commas/newlines/quotes.
// `numericCols` get Number()-coerced; `arrayCols` are split on ";".

export function parseCsv<T>(
  text: string,
  numericCols: ReadonlyArray<keyof T & string> = [],
  arrayCols: ReadonlyArray<keyof T & string> = []
): T[] {
  const rows: string[][] = [];
  let i = 0;
  let cur = "";
  let row: string[] = [];
  let inQuote = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cur);
      rows.push(row);
      cur = "";
      row = [];
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0];
  const numSet = new Set<string>(numericCols as readonly string[]);
  const arrSet = new Set<string>(arrayCols as readonly string[]);
  const out: T[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length !== headers.length) continue;
    const obj: Record<string, unknown> = {};
    for (let h = 0; h < headers.length; h++) {
      const key = headers[h];
      const v = cells[h];
      if (numSet.has(key)) {
        obj[key] = v === "" ? 0 : Number(v);
      } else if (arrSet.has(key)) {
        obj[key] = v === "" ? [] : v.split(";").map((s) => s.trim()).filter(Boolean);
      } else {
        obj[key] = v;
      }
    }
    out.push(obj as T);
  }
  return out;
}
