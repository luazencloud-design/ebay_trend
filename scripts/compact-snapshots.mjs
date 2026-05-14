// Compact old snapshots per the retention policy in PLAN.md §4.
//   - Last 30 days        → keep daily
//   - 30 ~ 180 days       → keep weekly (Monday only)
//   - 180 days ~ 1 year   → keep monthly (1st of month only)
//   - Beyond 1 year       → keep quarterly
//
// Run after each daily Gemini snapshot lands.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");

const DAY = 24 * 60 * 60 * 1000;

function parseFolderDate(name) {
  // matches "YYYY-MM-DD". Skip "2025-final", "latest.json".
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(name);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
}

function bucketFor(daysOld, date) {
  if (daysOld < 30) return "daily"; // keep
  if (daysOld < 180) return "weekly"; // keep Mondays only
  if (daysOld < 365) return "monthly"; // keep 1st of month only
  return "quarterly"; // keep months 1, 4, 7, 10 on the 1st
}

function shouldKeep(date, bucket) {
  const dow = date.getUTCDay(); // 0=Sun ... 1=Mon
  const dom = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  if (bucket === "daily") return true;
  if (bucket === "weekly") return dow === 1;
  if (bucket === "monthly") return dom === 1;
  if (bucket === "quarterly") return dom === 1 && [1, 4, 7, 10].includes(month);
  return true;
}

async function main() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const now = Date.now();
  const removed = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const d = parseFolderDate(entry.name);
    if (!d) continue; // skip 2025-final etc.

    const daysOld = Math.floor((now - d.getTime()) / DAY);
    const bucket = bucketFor(daysOld, d);
    if (!shouldKeep(d, bucket)) {
      const full = path.join(DATA_DIR, entry.name);
      await fs.rm(full, { recursive: true, force: true });
      removed.push(`${entry.name} (${daysOld}d, ${bucket})`);
    }
  }

  if (removed.length === 0) {
    console.log("✓ no snapshots need compaction");
  } else {
    console.log(`✓ removed ${removed.length} snapshots:`);
    for (const r of removed) console.log(`  - ${r}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
