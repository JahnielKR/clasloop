// ─── useTourLaunch ───────────────────────────────────────────────────────────
// Host pages call this to pick up a chat-initiated tour request from the URL
// (?tour=<id>&force=1 — built by tourRoutes.js). The request is captured once at
// mount (so clearing the param doesn't cancel the in-flight run), then the param
// is stripped so a refresh won't re-launch. Mirrors the ?tour=run / ?celebrate=1
// capture pattern already used across the app.
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useTourLaunch(tourId) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [launch] = useState(() =>
    searchParams.get("tour") === tourId
      ? { force: searchParams.get("force") === "1" }
      : null,
  );
  useEffect(() => {
    if (searchParams.get("tour") !== tourId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("tour");
    next.delete("force");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, tourId]);
  return { autoStart: !!launch, force: !!(launch && launch.force) };
}
