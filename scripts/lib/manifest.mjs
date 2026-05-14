// Scans public/data/ for available snapshots and writes index.json.
// Called at the end of daily-research and generate-mock-data scripts.

import fs from "node:fs/promises";
import path from "node:path";

const DAILY_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEARLY_RE = /^\d{4}-final$/;

export async function buildManifest(dataDir) {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const daily = [];
  const yearly = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (DAILY_RE.test(e.name)) daily.push(e.name);
    else if (YEARLY_RE.test(e.name)) yearly.push(e.name);
  }
  daily.sort().reverse();  // newest first
  yearly.sort().reverse();

  // "latest" prefers a real daily snapshot; falls back to yearly
  const latest = daily[0] || yearly[0] || null;

  const snapshots = [
    ...daily.map((key) => ({ key, type: "daily" })),
    ...yearly.map((key) => ({ key, type: "yearly" })),
  ];

  const manifest = {
    latest,
    updated_at: new Date().toISOString(),
    snapshots,
  };

  await fs.writeFile(
    path.join(dataDir, "index.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );

  return manifest;
}
