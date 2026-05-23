// ─── TourContext ─────────────────────────────────────────────────────────────
// Two jobs:
//  1. Replay: each mounted <CleoTour> registers its (stable) replay fn under its
//     tourId; PageHeader's "Ver guía" button calls replayTour(tourId).
//  2. Single-Cleo continuity: a tour reports when it's on screen (offer or
//     running) so the floating "Ask Cleo" FAB can hide — otherwise you'd see two
//     Cleos at once (one explaining, one waving in the corner). When the tour
//     ends the FAB returns to its corner.
//
// Entirely optional: without a <TourProvider>, the hooks no-op and nothing
// crashes.
import { createContext, useContext, useRef, useEffect, useState, useCallback, useMemo } from "react";

const TourContext = createContext(null);

export function TourProvider({ children }) {
  // Map<tourId, replayFn> — a ref so registration churn doesn't re-render.
  const registry = useRef(new Map());
  // Set of tourIds currently visible (offer/running). State, so consumers
  // (CleoChat) re-render when it flips.
  const [activeIds, setActiveIds] = useState(() => new Set());

  const register = useCallback((tourId, fn) => {
    if (!tourId || typeof fn !== "function") return () => {};
    registry.current.set(tourId, fn);
    return () => {
      if (registry.current.get(tourId) === fn) registry.current.delete(tourId);
    };
  }, []);

  const replayTour = useCallback((tourId) => {
    const fn = registry.current.get(tourId);
    if (fn) fn();
  }, []);

  const setTourActive = useCallback((tourId, active) => {
    setActiveIds((prev) => {
      if (active === prev.has(tourId)) return prev;
      const next = new Set(prev);
      if (active) next.add(tourId);
      else next.delete(tourId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ register, replayTour, setTourActive, tourActive: activeIds.size > 0 }),
    [register, replayTour, setTourActive, activeIds],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// Called by CleoTour. `replayFn` must be stable (CleoTour's is a useCallback).
// Depends on `register` (stable), not the whole context, so it doesn't churn
// every time tourActive flips.
export function useRegisterTour(tourId, replayFn) {
  const register = useContext(TourContext)?.register;
  useEffect(() => {
    if (!register) return undefined;
    return register(tourId, replayFn);
  }, [register, tourId, replayFn]);
}

// Called by PageHeader. Returns replayTour(tourId) or null when no provider.
export function useReplayTour() {
  return useContext(TourContext)?.replayTour || null;
}

// Called by CleoTour to report whether it's currently on screen.
export function useSetTourActive() {
  return useContext(TourContext)?.setTourActive || null;
}

// Called by CleoChat to hide its FAB while any tour is showing.
export function useTourActive() {
  return useContext(TourContext)?.tourActive || false;
}
