import { parseCsv } from "./csv-parser";
import type {
  Brand,
  Category,
  Dataset,
  DatasetMeta,
  DateKey,
  Manifest,
  Product,
  SourcingSite,
} from "../types";

const BASE = `${import.meta.env.BASE_URL || "/"}data`;

const textCache = new Map<string, Promise<string>>();
const datasetCache = new Map<DateKey, Promise<Dataset>>();

async function fetchText(url: string): Promise<string> {
  const existing = textCache.get(url);
  if (existing) return existing;
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
    return r.text();
  });
  textCache.set(url, p);
  return p;
}

async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

let manifestCache: Promise<Manifest> | null = null;
export function loadManifest(): Promise<Manifest> {
  if (!manifestCache) {
    manifestCache = fetchJson<Manifest>(`${BASE}/index.json`);
  }
  return manifestCache;
}

export function loadDataset(key: DateKey): Promise<Dataset> {
  const existing = datasetCache.get(key);
  if (existing) return existing;

  const p = (async () => {
    const base = `${BASE}/${key}`;
    const [catText, brText, prText, srText, meta] = await Promise.all([
      fetchText(`${base}/categories.csv`),
      fetchText(`${base}/brands.csv`),
      fetchText(`${base}/products.csv`),
      fetchText(`${base}/sourcing.csv`),
      fetchJson<DatasetMeta>(`${base}/meta.json`),
    ]);

    const categories = parseCsv<Category>(
      catText,
      ["rank", "change", "comp", "margin"]
    );
    const brands = parseCsv<Brand>(brText, ["rank", "change"]);
    const products = parseCsv<Product>(
      prText,
      ["rank", "ebay_usd", "krw", "margin", "weight_g", "change"],
      ["seo_tags", "source_slugs"]
    );
    const sourcing = parseCsv<SourcingSite>(srText, ["rank", "rely", "fit"]);

    return { ...meta, categories, brands, products, sourcing };
  })();

  datasetCache.set(key, p);
  return p;
}
