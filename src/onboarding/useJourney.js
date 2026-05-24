// ─── useJourney ──────────────────────────────────────────────────────────────
// Reactive read of the first-class journey pointer (see ./journey.js). Re-renders
// when the pointer changes in this tab (via the journey emitter) or another tab
// (the native "storage" event), so a same-page leg transition re-arms the next
// leg's tour without a navigation.
import { useState, useEffect } from "react";
import { getJourney, subscribeJourney, JOURNEY_ID } from "./journey";

export function useJourney(userId) {
  const [, bump] = useState(0);
  useEffect(() => {
    const force = () => bump((n) => n + 1);
    const unsub = subscribeJourney(force);
    const onStorage = (e) => {
      if (!e.key || e.key.startsWith("cl.journey.")) force();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const journey = getJourney(userId);
  const active = !!(journey && journey.id === JOURNEY_ID && !journey.done);
  const leg = active ? journey.leg : null;
  return { journey, leg, active };
}
