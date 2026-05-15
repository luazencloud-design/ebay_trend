import { useMemo, useState } from "react";
import type { DateKey, Route } from "../types";
import { Change } from "../components/Change";
import { Competition } from "../components/Competition";
import { Crumb } from "../components/Crumb";
import { MiniBadge } from "../components/MiniBadge";
import { Panel } from "../components/Panel";
import { RankRow } from "../components/RankRow";
import { Reliability } from "../components/Reliability";
import { TrendChart } from "../components/TrendChart";
import { ZonePill } from "../components/ZonePill";
import { fmtUSD } from "../lib/format";
import { loadDataset } from "../lib/data-loader";
import { useAsync } from "../hooks/useAsync";

interface Stage2Props {
  dateKey: DateKey;
  catSlug: string;
  nav: (r: Route) => void;
}

export function Stage2Category({ dateKey, catSlug, nav }: Stage2Props) {
  const ds = useAsync(() => loadDataset(dateKey), [dateKey]);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);

  const cat = ds.data?.categories.find((c) => c.slug === catSlug);
  const brands = useMemo(
    () => (ds.data?.brands ?? []).filter((b) => b.cat_slug === catSlug),
    [ds.data, catSlug]
  );
  const allProducts = useMemo(
    () => (ds.data?.products ?? []).filter((p) => p.cat_slug === catSlug),
    [ds.data, catSlug]
  );
  const products = useMemo(
    () => (brandFilter ? allProducts.filter((p) => p.brand === brandFilter) : allProducts),
    [allProducts, brandFilter]
  );
  const sourcing = useMemo(
    () => (ds.data?.sourcing ?? []).filter((s) => s.cat_slug === catSlug),
    [ds.data, catSlug]
  );

  if (ds.loading) {
    return (
      <div className="stage">
        <div className="empty-state">로딩 중…</div>
      </div>
    );
  }
  if (ds.error || !cat) {
    return (
      <div className="stage">
        <div className="empty-state">카테고리 데이터를 불러오지 못했어요.</div>
      </div>
    );
  }

  return (
    <div className="stage" key={"s2-" + cat.slug}>
      <div style={{ marginBottom: 16 }}>
        <Crumb
          items={[
            { label: "K-Trend", onClick: () => nav({ stage: 1 }) },
            { label: cat.name_kr },
          ]}
        />
      </div>

      <div className="detail-hero">
        <div>
          <h1>
            <span>{cat.name_kr}</span>
            <ZonePill zone={cat.zone} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-3)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              #{String(cat.rank).padStart(2, "0")}
            </span>
          </h1>
          <p className="summary">{cat.summary}</p>
          <div className="stats">
            <div className="stat">
              <span className="lbl">현재 순위</span>
              <span className="val">
                #{cat.rank} <Change value={cat.change} />
              </span>
            </div>
            <div className="stat">
              <span className="lbl">평균 마진</span>
              <span className="val">{cat.margin}%</span>
            </div>
            <div className="stat">
              <span className="lbl">경쟁강도</span>
              <span
                className="val"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Competition value={cat.comp} />{" "}
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                  {cat.comp}/5
                </span>
              </span>
            </div>
          </div>
        </div>
        <TrendChart slug={cat.slug} />
      </div>

      <div className="three-col">
        <Panel
          title="브랜드 랭킹"
          count="TOP 20"
          action={brandFilter ? `${brandFilter} 필터 해제` : null}
          onAction={() => setBrandFilter(null)}
        >
          {brands.map((b, i) => {
            const isNew = i % 9 === 6;
            return (
              <RankRow
                key={b.rank}
                rank={b.rank}
                active={brandFilter === b.name}
                onClick={() => setBrandFilter(b.name === brandFilter ? null : b.name)}
                name={
                  <>
                    {b.name}
                    {isNew && <MiniBadge variant="new">NEW</MiniBadge>}
                  </>
                }
                sub={`${b.country} · 7일 비교`}
                side={<Change value={b.change} />}
              />
            );
          })}
        </Panel>

        <Panel
          title="상품 랭킹"
          count={`TOP ${products.length}`}
          action={brandFilter ? "필터링됨" : null}
        >
          {products.map((p, i) => {
            const isNew = i % 11 === 4;
            const isHot = !isNew && p.change >= 3;
            return (
              <RankRow
                key={p.rank}
                rank={p.rank}
                name={
                  <>
                    {p.name}
                    {isNew && <MiniBadge variant="new">NEW</MiniBadge>}
                    {isHot && <MiniBadge variant="hot">HOT</MiniBadge>}
                  </>
                }
                sub={`${p.brand} · 7일 비교`}
                side={
                  <>
                    <span
                      className="mono"
                      style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}
                    >
                      {fmtUSD(p.ebay_usd)}
                    </span>
                    <Change value={p.change} />
                  </>
                }
              />
            );
          })}
        </Panel>

        <Panel title="추천 소싱처" count="TOP 10" hint="클릭 → 상품 리스트">
          {sourcing.map((s) => (
            <RankRow
              key={s.rank}
              rank={s.rank}
              clickTarget
              onClick={() => nav({ stage: 3, cat: cat.slug, src: s.slug })}
              name={s.name}
              sub={s.url}
              side={
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 1,
                    marginRight: 14,
                  }}
                >
                  <Reliability value={s.rely} label="신뢰도" />
                  <span
                    style={{
                      fontSize: 9.5,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    적합도 {s.fit}/5
                  </span>
                </div>
              }
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
