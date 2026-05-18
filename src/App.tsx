import { useEffect, useState } from "react";
import { Topbar } from "./components/Topbar";
import { TweaksPanel } from "./components/TweaksPanel";
import { OnboardingPage } from "./views/OnboardingPage";
import { Stage1Dashboard } from "./views/Stage1Dashboard";
import { Stage2Category } from "./views/Stage2Category";
import { Stage3Sourcing } from "./views/Stage3Sourcing";
import { useTweaks } from "./hooks/useTweaks";
import { useAsync } from "./hooks/useAsync";
import { useHistoryRoute } from "./hooks/useHistoryRoute";
import { loadManifest } from "./lib/data-loader";
import type { DateKey } from "./types";

export function App() {
  const [tweaks, setTweak] = useTweaks();
  const [route, nav] = useHistoryRoute();
  const [dateKey, setDateKey] = useState<DateKey | null>(null);

  // Load manifest once on mount. Once available, default dateKey = latest.
  const manifestState = useAsync(() => loadManifest(), []);
  useEffect(() => {
    if (manifestState.data && !dateKey) {
      setDateKey(manifestState.data.latest ?? manifestState.data.snapshots[0]?.key ?? null);
    }
  }, [manifestState.data, dateKey]);

  // ESC pops up one stage. Uses nav() so the URL + history stay in sync.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (route.stage === 3) nav({ stage: 2, cat: route.cat });
      else if (route.stage === 2) nav({ stage: 1 });
      else if (route.stage === "onboarding") nav({ stage: 1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route, nav]);

  return (
    <>
      <Topbar route={route} nav={nav} />
      <main className="page">
        {route.stage === "onboarding" ? (
          <OnboardingPage />
        ) : manifestState.loading || !dateKey || !manifestState.data ? (
          <div className="empty-state">로딩 중…</div>
        ) : manifestState.error ? (
          <div className="empty-state">
            데이터 인덱스를 불러올 수 없어요. ({manifestState.error.message})
          </div>
        ) : (
          <>
            {route.stage === 1 && (
              <Stage1Dashboard
                dateKey={dateKey}
                setDateKey={setDateKey}
                manifest={manifestState.data}
                nav={nav}
              />
            )}
            {route.stage === 2 && (
              <Stage2Category dateKey={dateKey} catSlug={route.cat} nav={nav} />
            )}
            {route.stage === 3 && (
              <Stage3Sourcing
                dateKey={dateKey}
                catSlug={route.cat}
                srcSlug={route.src}
                nav={nav}
              />
            )}
          </>
        )}
      </main>
      <TweaksPanel
        typo={tweaks.typo}
        density={tweaks.density}
        onChangeTypo={(v) => setTweak("typo", v)}
        onChangeDensity={(v) => setTweak("density", v)}
      />
    </>
  );
}
