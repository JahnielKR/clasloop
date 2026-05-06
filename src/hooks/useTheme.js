// ─── useTheme — Light/dark theme state hook ──────────────────────────────
// Reads stored theme on mount, exposes [theme, setTheme]. Calling setTheme
// persists to localStorage AND applies the data-theme attribute to <html>.
// All consumers using the same hook stay in sync via a window-scoped event.

import { useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme } from "../components/tokens";

const EVENT_NAME = "clasloop:theme-changed";

export default function useTheme() {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  useEffect(() => {
    // Sync across components — when one changes, others update.
    const handler = (e) => {
      if (e.detail && (e.detail === "light" || e.detail === "dark")) {
        setThemeState(e.detail);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const setTheme = (next) => {
    const t = next === "dark" ? "dark" : "light";
    setStoredTheme(t);
    setThemeState(t);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: t }));
  };

  return [theme, setTheme];
}
