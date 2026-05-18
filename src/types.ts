export type Zone = "red" | "blue";

/** A dated snapshot folder name, e.g. "2026-05-14" or "2025-final". */
export type DateKey = string;

export type SnapshotType = "daily" | "yearly";

export interface SnapshotEntry {
  key: DateKey;
  type: SnapshotType;
}

export interface Manifest {
  latest: DateKey | null;
  updated_at: string;
  snapshots: SnapshotEntry[];
}

export interface Category {
  rank: number;
  slug: string;
  name_kr: string;
  name_en: string;
  zone: Zone;
  change: number;
  comp: number;
  margin: number;
  summary: string;
}

export interface Brand {
  cat_slug: string;
  rank: number;
  name: string;
  country: string;
  change: number;
  initials: string;
}

export interface Product {
  cat_slug: string;
  rank: number;
  name: string;
  name_en: string;
  brand: string;
  ebay_usd: number;
  krw: number;
  margin: number;
  weight_g: number;
  ebay_cat_id: string;
  seo_tags: string[];
  change: number;
  source_slugs: string[];
}

export interface SourcingSite {
  cat_slug: string;
  rank: number;
  name: string;
  url: string;
  rely: number;
  fit: number;
  slug: string;
  initials: string;
}

export interface DatasetMeta {
  date: string;
  generated_at: string;
  source_models: {
    categories: string;
    tables: string;
  };
}

export type InsightPeriod = "daily" | "weekly" | "yearly";

export interface Insight {
  headline: string;          // 한 줄 요약 (10~20자)
  body: string;              // 본문 2~5문장
  focus_categories: string[]; // 관련 카테고리 slug (클릭 가능)
}

export interface InsightsBundle {
  generated_at: string;
  source_model: string;
  daily: Insight;
  weekly: Insight;
  yearly: Insight;
}

export interface Dataset extends DatasetMeta {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  sourcing: SourcingSite[];
  insights?: InsightsBundle;
}

export interface LatestPointer {
  date: string;
}

export type Density = "compact" | "comfortable" | "spacious";
export type Typo = "default" | "display" | "editorial" | "mono";

export type Route =
  | { stage: 1 }
  | { stage: 2; cat: string }
  | { stage: 3; cat: string; src: string }
  | { stage: "onboarding" };
