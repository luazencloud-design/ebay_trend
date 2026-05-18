import type { Route } from "../types";

/**
 * URL scheme:
 *   /                                  → Stage 1 (dashboard)
 *   /onboarding                        → Onboarding guide
 *   /{catSlug}                         → Stage 2 (category detail)
 *   /{catSlug}/{srcSlug}               → Stage 3 (sourcing detail)
 *
 * Date is intentionally NOT in the URL — it's a view setting, not a navigation
 * target. The DateSelector controls it via in-app state.
 */

// Reserved single-segment paths that are NOT category slugs.
const RESERVED = new Set(["onboarding"]);

export function routeToPath(route: Route): string {
  if (route.stage === 1) return "/";
  if (route.stage === "onboarding") return "/onboarding";
  if (route.stage === 2) return `/${encodeURIComponent(route.cat)}`;
  return `/${encodeURIComponent(route.cat)}/${encodeURIComponent(route.src)}`;
}

export function parsePath(pathname: string): Route {
  const parts = pathname
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);

  if (parts.length === 0) return { stage: 1 };
  if (parts.length === 1) {
    if (RESERVED.has(parts[0])) return { stage: "onboarding" };
    return { stage: 2, cat: parts[0] };
  }
  return { stage: 3, cat: parts[0], src: parts[1] };
}
