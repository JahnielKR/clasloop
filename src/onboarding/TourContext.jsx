// ─── TourContext ─────────────────────────────────────────────────────────────
// Single-Cleo continuity: a tour reports when it's on screen (offer or running)
// so the floating "Ask Cleo" FAB can hide — otherwise you'd see two Cleos at
// once (one explaining, one waving in the corner). When the tour ends the FAB
// returns to its corner.
//
// Optional: without a <TourProvider>, the hooks no-op and nothing crashes.
import { createContext, useContext, useState, useCallback, useMemo } from "react";

const TourContext = createContext(null);

export function TourProvider({ children }) {
  // Set of tourIds currently visible (offer/running). State, so consumers
  // (CleoChat) re-render when it flips.
  const [activeIds, setActiveIds] = useState(() => new Set());

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
    () => ({ setTourActive, tourActive: activeIds.size > 0 }),
    [setTourActive, activeIds],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// Called by CleoTour to report whether it's currently on screen.
export function useSetTourActive() {
  return useContext(TourContext)?.setTourActive || null;
}

// Called by CleoChat to hide its FAB while any tour is showing.
export function useTourActive() {
  return useContext(TourContext)?.tourActive || false;
}
