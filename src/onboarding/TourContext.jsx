// ─── TourContext ─────────────────────────────────────────────────────────────
// Lets a page's PageHeader re-trigger that page's tour ("Ver guía") without
// prop-drilling. Each mounted <CleoTour> registers its (stable) replay fn under
// its tourId; PageHeader calls replayTour(tourId).
//
// Entirely optional: if no <TourProvider> wraps the tree, useReplayTour()
// returns null and the "Ver guía" button hides — nothing crashes.
import { createContext, useContext, useRef, useEffect } from "react";

const TourContext = createContext(null);

export function TourProvider({ children }) {
  // Map<tourId, replayFn>. A ref (not state) — registration churn shouldn't
  // re-render consumers.
  const registry = useRef(new Map());
  const api = useRef({
    register(tourId, fn) {
      if (!tourId || typeof fn !== "function") return () => {};
      registry.current.set(tourId, fn);
      return () => {
        if (registry.current.get(tourId) === fn) registry.current.delete(tourId);
      };
    },
    replayTour(tourId) {
      const fn = registry.current.get(tourId);
      if (fn) fn();
    },
    hasTour(tourId) {
      return registry.current.has(tourId);
    },
  }).current;

  return <TourContext.Provider value={api}>{children}</TourContext.Provider>;
}

// Called by CleoTour. `replayFn` must be stable (CleoTour's is a useCallback).
export function useRegisterTour(tourId, replayFn) {
  const ctx = useContext(TourContext);
  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.register(tourId, replayFn);
  }, [ctx, tourId, replayFn]);
}

// Called by PageHeader. Returns replayTour(tourId) or null when no provider.
export function useReplayTour() {
  const ctx = useContext(TourContext);
  return ctx ? ctx.replayTour : null;
}
