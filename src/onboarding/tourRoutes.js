// ─── tourRoutes ──────────────────────────────────────────────────────────────
// Maps a tourId to a route the chat can navigate to so the destination page
// auto-starts that tour. The URL carries ?tour=<id>&force=1 — the host page's
// useTourLaunch reads it and runs the tour even if the teacher already saw it,
// and it survives a refresh (same channel as the existing ?tour=run handoff).
//
// Returns null when the tour can't run cold (needs context we don't have, or is
// for the student view) — the caller then explains in text instead of launching.
import { ROUTES, buildRoute } from "../routes";

const withFlag = (path, tourId) =>
  `${path}${path.includes("?") ? "&" : "?"}tour=${tourId}&force=1`;

export function resolveTourRoute(tourId, ctx = {}) {
  switch (tourId) {
    case "home":       return withFlag(ROUTES.CLASSES, tourId);
    case "library":    return withFlag(ROUTES.DECKS, tourId);
    case "scanner":    return withFlag(ROUTES.SCAN, tourId);
    case "deckEditor": return withFlag(ROUTES.DECKS_NEW, tourId);
    // Context-bound: only launchable if we know which class to open.
    case "classDetail": return ctx.lastClassId ? withFlag(buildRoute.classDetail(ctx.lastClassId), tourId) : null;
    case "insights":    return ctx.lastClassId ? withFlag(buildRoute.classInsights(ctx.lastClassId), tourId) : null;
    // The student tour lives on the student home — not reachable from the
    // teacher-only chat.
    default:            return null;
  }
}
