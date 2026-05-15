import { useCallback, useEffect, useState } from "react";
import type { Route } from "../types";
import { parsePath, routeToPath } from "../lib/url-route";

/**
 * In-app router backed by the browser History API.
 *
 * - `nav(newRoute)` pushes a new history entry — browser Back returns to the
 *   previous stage instead of leaving the site.
 * - `popstate` listener keeps internal state in sync when user presses Back
 *   or Forward.
 * - Initial route is parsed from `window.location.pathname` so deep links
 *   (e.g. `/k-beauty/wholesale-stylenanda-kr`) land directly on Stage 3.
 */
export function useHistoryRoute() {
  const [route, setRouteState] = useState<Route>(() =>
    typeof window === "undefined" ? { stage: 1 } : parsePath(window.location.pathname)
  );

  const nav = useCallback((newRoute: Route) => {
    setRouteState(newRoute);
    const url = routeToPath(newRoute);
    if (url !== window.location.pathname) {
      window.history.pushState({ route: newRoute }, "", url);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    // Replace the very first history entry so that pressing Back from a
    // deep-linked page lands on the same state instead of `null`.
    window.history.replaceState(
      { route: parsePath(window.location.pathname) },
      "",
      window.location.pathname
    );

    const onPop = (e: PopStateEvent) => {
      const next = (e.state?.route as Route | undefined) ?? parsePath(window.location.pathname);
      setRouteState(next);
      window.scrollTo({ top: 0, behavior: "instant" });
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return [route, nav] as const;
}
