// ─── useFirstVisitTour ───────────────────────────────────────────────────────
// State machine for a single page's first-visit guided tour ("Cleo te guía").
//
// Phases: "idle" → "offer" → "running" → "idle".
//   - On mount, if the tour is enabled, has steps, and the user hasn't seen it,
//     we move to "offer" (Cleo slides in asking "¿te muestro cómo funciona?").
//   - accept() starts the step-by-step walk; decline() / finishing the last
//     step / skip() all mark it seen so it never auto-offers again.
//   - replay() re-runs it on demand (from the PageHeader "Ver guía" button),
//     bypassing the seen check.
//
// "Seen" state is persisted per user in localStorage via safe-storage. There's
// no DB column today (see plan) — clearing storage re-shows the tours, which is
// acceptable for v1 and avoids a migration.
import { useState, useEffect, useCallback, useRef } from "react";
import { safeGetJSON, safeSetJSON } from "../lib/safe-storage";

const seenKey = (userId) => `cl.tours.seen.${userId || "anon"}`;

export function getSeenTours(userId) {
  const seen = safeGetJSON(seenKey(userId), []);
  return Array.isArray(seen) ? seen : [];
}

export function hasSeenTour(userId, tourId) {
  return getSeenTours(userId).includes(tourId);
}

export function markTourSeen(userId, tourId) {
  const seen = getSeenTours(userId);
  if (seen.includes(tourId)) return;
  safeSetJSON(seenKey(userId), [...seen, tourId]);
}

export function useFirstVisitTour({ tourId, total = 0, enabled = true, userId, autoStart = false }) {
  const [phase, setPhase] = useState("idle"); // idle | offer | running
  const [index, setIndex] = useState(0);
  // Fire the first-visit trigger exactly once (the gating inputs — enabled,
  // userId — can flip from false/null to true as the profile loads; without
  // this guard the re-run would reset an already-started tour to step 0).
  const startedRef = useRef(false);

  // On first visit: `autoStart` walks the teacher straight through (used for the
  // guaranteed first-warmup flow); otherwise Cleo offers first.
  useEffect(() => {
    if (!enabled || !tourId || total === 0 || startedRef.current) return;
    if (hasSeenTour(userId, tourId)) return;
    startedRef.current = true;
    setPhase(autoStart ? "running" : "offer");
    setIndex(0);
  }, [enabled, tourId, total, userId, autoStart]);

  const accept = useCallback(() => {
    setIndex(0);
    setPhase("running");
  }, []);

  // "Ahora no" — dismiss the offer without walking through; still mark seen so
  // we don't nag on every visit. The replay button remains available.
  const decline = useCallback(() => {
    markTourSeen(userId, tourId);
    setPhase("idle");
  }, [userId, tourId]);

  const close = useCallback(() => {
    markTourSeen(userId, tourId);
    setPhase("idle");
    setIndex(0);
  }, [userId, tourId]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= total) return i; // at last step; caller shows "Listo" → close()
      return i + 1;
    });
  }, [total]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Re-run on demand, ignoring the seen flag (PageHeader "Ver guía").
  const replay = useCallback(() => {
    setIndex(0);
    setPhase("running");
  }, []);

  return { phase, index, accept, decline, close, next, back, replay };
}
