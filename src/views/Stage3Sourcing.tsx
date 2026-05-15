import { useMemo, useState } from "react";
import type { DateKey, Route } from "../types";
import { Crumb } from "../components/Crumb";
import { ProductCard } from "../components/ProductCard";
import { Reliability } from "../components/Reliability";
import {
  Toolbar,
  ToolbarBtn,
  ToolbarGroup,
  ToolbarSpacer,
} from "../components/Toolbar";
import { IconSearch } from "../components/icons";
import { loadDataset } from "../lib/data-loader";
import { useAsync } from "../hooks/useAsync";

interface Stage3Props {
  dateKey: DateKey;
  catSlug: string;
  srcSlug: string;
  nav: (r: Route) => void;
}

type SortKey = "margin" | "price-low" | "weight";

export function Stage3Sourcing({ dateKey, catSlug, srcSlug, nav }: Stage3Props) {
  const ds = useAsync(() => loadDataset(dateKey), [dateKey]);
  const [sort, setSort] = useState<SortKey>("margin");
  const [search, setSearch] = useState("");

  const cat = ds.data?.categories.find((c) => c.slug === catSlug);
  const src = ds.data?.sourcing.find(
    (s) => s.cat_slug === catSlug && s.slug === srcSlug
  );

  // Products from this category that are sourced from this site
  const products = useMemo(() => {
    if (!ds.data) return [];
    return ds.data.products.filter(
      (p) => p.cat_slug === catSlug && p.source_slugs.includes(srcSlug)
    );
  }, [ds.data, catSlug, srcSlug]);

  const filtered = useMemo(() => {
    let xs = products.slice();
    if (search) {
      const q = search.toLowerCase();
      xs = xs.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.name_en.toLowerCase().includes(q)
      );
    }
    if (sort === "margin") xs.sort((a, b) => b.margin - a.margin);
    else if (sort === "price-low") xs.sort((a, b) => a.krw - b.krw);
    else if (sort === "weight") xs.sort((a, b) => a.weight_g - b.weight_g);
    return xs;
  }, [products, sort, search]);

  const avgMargin =
    products.length > 0
      ? Math.round(products.reduce((s, p) => s + p.margin, 0) / products.length)
      : 0;
  const avgPrice =
    products.length > 0
      ? (products.reduce((s, p) => s + p.ebay_usd, 0) / products.length).toFixed(2)
      : "0";

  if (ds.loading) {
    return (
      <div className="stage">
        <div className="empty-state">로딩 중…</div>
      </div>
    );
  }
  if (!cat || !src) {
    return (
      <div className="stage">
        <div className="empty-state">소싱처 정보를 찾을 수 없어요.</div>
      </div>
    );
  }

  return (
    <div className="stage" key={"s3-" + catSlug + "-" + srcSlug}>
      <div style={{ marginBottom: 16 }}>
        <Crumb
          items={[
            { label: "K-Trend", onClick: () => nav({ stage: 1 }) },
            { label: cat.name_kr, onClick: () => nav({ stage: 2, cat: catSlug }) },
            { label: src.name },
          ]}
        />
      </div>

      <div className="ai-disclaimer">
        <span className="dot" />
        <span>
          이 페이지의 상품 정보는 <b>AI 분석 기반 추정치</b>입니다. 가격·재고는 도매처에서 직접 확인해 주세요.
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(src.name + " 도매")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            🔍 "{src.name}" 구글에서 검색
          </a>
        </span>
      </div>

      <div className="src-hero">
        <div className="meta">
          <h1>{src.name}</h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 8,
              fontSize: 12,
              color: "var(--text-3)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>신뢰도</span>
              <Reliability value={src.rely} />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>{cat.name_kr} 적합도</span>
              <Reliability value={src.fit} />
            </span>
          </div>
        </div>
        <div className="badges">
          <div className="kpi">
            <div className="lbl">평균 마진</div>
            <div className="val" style={{ color: "var(--green)" }}>
              {avgMargin}%
            </div>
          </div>
          <div className="kpi">
            <div className="lbl">평균 판가</div>
            <div className="val">${avgPrice}</div>
          </div>
          <div className="kpi">
            <div className="lbl">상품 수</div>
            <div className="val">{products.length}</div>
          </div>
        </div>
      </div>

      <Toolbar>
        <div className="tb-search">
          <IconSearch />
          <input
            placeholder="상품명·키워드로 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="kbd">⌘K</span>
        </div>
        <ToolbarSpacer />
        <ToolbarGroup label="정렬">
          <ToolbarBtn<SortKey> value="margin" active={sort} onClick={setSort}>
            마진 높은순
          </ToolbarBtn>
          <ToolbarBtn<SortKey> value="price-low" active={sort} onClick={setSort}>
            도매가 낮은순
          </ToolbarBtn>
          <ToolbarBtn<SortKey> value="weight" active={sort} onClick={setSort}>
            가벼운순
          </ToolbarBtn>
        </ToolbarGroup>
      </Toolbar>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {search
            ? "검색 결과가 없어요. 다른 키워드를 시도해 보세요."
            : "이 소싱처에서 카테고리에 매칭되는 상품이 없어요."}
        </div>
      ) : (
        <div className="product-list">
          {filtered.map((p, i) => (
            <ProductCard key={`${p.cat_slug}-${p.rank}`} p={p} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
