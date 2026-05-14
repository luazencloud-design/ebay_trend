// CSV writer + parser for Node scripts.

function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Encode a `value` for a CSV cell. Arrays are joined with semicolons.
function encodeCell(v) {
  if (Array.isArray(v)) return csvEscape(v.join(";"));
  return csvEscape(v);
}

export function toCsv(rows, columns) {
  const lines = [columns.join(",")];
  for (const r of rows) {
    lines.push(columns.map((c) => encodeCell(r[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

export function parseCsv(text, opts = {}) {
  const numericCols = new Set(opts.numericCols || []);
  const arrayCols = new Set(opts.arrayCols || []);
  const rows = [];
  let i = 0, cur = "", row = [], inQuote = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQuote = false; i++; continue;
      }
      cur += c; i++; continue;
    }
    if (c === '"') { inQuote = true; i++; continue; }
    if (c === ",") { row.push(cur); cur = ""; i++; continue; }
    if (c === "\n") { row.push(cur); rows.push(row); cur = ""; row = []; i++; continue; }
    if (c === "\r") { i++; continue; }
    cur += c; i++;
  }
  if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); }
  if (rows.length === 0) return [];

  const headers = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length !== headers.length) continue;
    const obj = {};
    for (let h = 0; h < headers.length; h++) {
      const key = headers[h];
      const v = cells[h];
      if (numericCols.has(key)) obj[key] = v === "" ? 0 : Number(v);
      else if (arrayCols.has(key)) obj[key] = v === "" ? [] : v.split(";").map((s) => s.trim()).filter(Boolean);
      else obj[key] = v;
    }
    out.push(obj);
  }
  return out;
}
