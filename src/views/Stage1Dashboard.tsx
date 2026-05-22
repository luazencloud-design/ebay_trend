import { useMemo, useState } from "react";
import type { Category, DateKey, Manifest, Route, Zone } from "../types";
import { AIInsights } from "../components/AIInsights";
import { CategoryCard } from "../components/CategoryCard";
import { DateSelector } from "../components/DateSelector";
import { HintBanner } from "../components/HintBanner";
import { Toolbar, ToolbarBtn, ToolbarGroup, ToolbarSpacer } from "../components/Toolbar";
import { loadDataset } from "../lib/data-loader";
import { useAsync } from "../hooks/useAsync";

interface Stage1Props {
  dateKey: DateKey;
  setDateKey: (k: DateKey) => void;
  manifest: Manifest;
  nav: (r: Route) => void;
}

type ZoneFilter = "all" | Zone;
type SortKey = "rank" | "margin" | "comp";
type Region = "US" | "EU" | "Global";

export function Stage1Dashboard({ dateKey, setDateKey, manifest, nav }: Stage1Props) {
  const [zone, setZone] = useState<ZoneFilter>("all");
  const [region, setRegion] = useState<Region>("US");
  const [sort, setSort] = useState<SortKey>("rank");
  const [hintOpen, setHintOpen] = useState(true);

  const ds = useAsync(() => loadDataset(dateKey), [dateKey]);
  const all: Category[] = ds.data?.categories ?? [];

  const filtered = useMemo(() => {
    let xs = all.slice();
    if (zone !== "all") xs = xs.filter((c) => c.zone === zone);
    if (sort === "margin") xs.sort((a, b) => b.margin - a.margin);
    else if (sort === "comp") xs.sort((a, b) => a.comp - b.comp);
    else xs.sort((a, b) => a.rank - b.rank);
    return xs;
  }, [all, zone, sort]);

  const counts = {
    all: all.length,
    red: all.filter((c) => c.zone === "red").length,
    blue: all.filter((c) => c.zone === "blue").length,
  };

  const surgers = all
    .filter((c) => c.change >= 4)
    .sort((a, b) => b.change - a.change)
    .slice(0, 2);

  return (
    <div className="stage" key="s1">
      <div className="page-head">
        <div>
          <h1 className="page-title">eBay에서 잘 팔리는 한국 상품 카테고리</h1>
          <p className="page-sub">
            매주 월요일 새벽 Gemini 리서치 결과를 기반으로 카테고리 → 브랜드 → 상품 → 소싱처를 한 흐름으로 보여줍니다.
            <span style={{ color: "var(--red)" }}> 레드존(1–5)</span>은 레드오션,{" "}
            <span style={{ color: "var(--blue)" }}>블루존(6–30)</span>은 진입 기회.
          </p>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
            LATEST DATASET
          </div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
            {ds.data?.date ?? "—"}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            {ds.data
              ? `${ds.data.source_models?.categories ?? ""}`
              : ""}
          </div>
        </div>
      </div>

      {ds.data?.insights ? (
        <AIInsights
          bundle={ds.data.insights}
          categories={all}
          onCategoryClick={(slug) => nav({ stage: 2, cat: slug })}
        />
      ) : (
        <HintBanner open={hintOpen} onClose={() => setHintOpen(false)}>
          <b>지난 주 대비 변동</b>
          {surgers.length > 0 && (
            <>
              {" "}· {surgers.map((s) => `${s.name_kr} ▲${s.change}`).join(", ")}.
            </>
          )}{" "}
          변동(▲▼)은 지난 주 스냅샷 기준이에요.
        </HintBanner>
      )}

      <Toolbar>
        <div className="zone-tabs" role="tablist">
          <button
            className={"zone-tab" + (zone === "all" ? " active" : "")}
            onClick={() => setZone("all")}
          >
            <span className="zdot all" />
            전체 <span className="count">{counts.all}</span>
          </button>
          <button
            className={"zone-tab" + (zone === "red" ? " active" : "")}
            onClick={() => setZone("red")}
          >
            <span className="zdot red" />
            레드존 <span className="count">{counts.red}</span>
          </button>
          <button
            className={"zone-tab" + (zone === "blue" ? " active" : "")}
            onClick={() => setZone("blue")}
          >
            <span className="zdot blue" />
            블루존 <span className="count">{counts.blue}</span>
          </button>
        </div>

        <ToolbarSpacer />

        <DateSelector
          value={dateKey}
          snapshots={manifest.snapshots}
          latest={manifest.latest}
          onChange={setDateKey}
        />

        <ToolbarGroup label="지역">
          {(["US", "EU", "Global"] as const).map((r) => (
            <ToolbarBtn key={r} value={r} active={region} onClick={setRegion}>
              {r}
            </ToolbarBtn>
          ))}
        </ToolbarGroup>

        <ToolbarGroup label="정렬">
          <ToolbarBtn<SortKey> value="rank" active={sort} onClick={setSort}>
            순위
          </ToolbarBtn>
          <ToolbarBtn<SortKey> value="margin" active={sort} onClick={setSort}>
            마진
          </ToolbarBtn>
          <ToolbarBtn<SortKey> value="comp" active={sort} onClick={setSort}>
            경쟁↓
          </ToolbarBtn>
        </ToolbarGroup>
      </Toolbar>

      {ds.loading ? (
        <div className="empty-state">로딩 중…</div>
      ) : ds.error ? (
        <div className="empty-state">데이터를 불러오지 못했어요. ({ds.error.message})</div>
      ) : (
        <div className="cat-grid">
          {filtered.map((c) => (
            <CategoryCard
              key={c.rank}
              c={c}
              onClick={() => nav({ stage: 2, cat: c.slug })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
