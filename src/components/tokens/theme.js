// ─── Theme runtime helpers ──────────────────────────────────────────────
// These intentionally avoid React hooks so they can be called from anywhere
// (including BEFORE React mounts, to prevent a flash of the wrong theme).
//
// Split out of the old monolithic tokens.js (PR: design-tokens). The CSS
// itself lives in ./color.js (THEME_CSS); this module owns persistence +
// applying the theme to <html>.

import { THEME_CSS } from "./color";
import { captureError } from "../../lib/sentry";

const THEME_KEY = "clasloop_theme";

/**
 * Read the persisted theme from localStorage. Returns "light" | "dark".
 * Defaults to "light" if nothing stored or storage unavailable.
 */
export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" ? "dark" : "light";
  } catch (_) {
    return "light";
  }
}

/**
 * Apply theme to <html> data-theme attribute. Call this on init AND whenever
 * the user toggles. Does NOT persist — call setStoredTheme() for that.
 */
export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
}

/**
 * Persist theme to localStorage AND apply to <html>. The all-in-one toggle
 * helper for UI components.
 */
export function setStoredTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch (err) {
    // PR 136: persisting the theme can fail (private mode, quota). Not
    // blocking — applyTheme still applies it for this session — but we want
    // to know how often users lose theme persistence.
    captureError(err, { kind: "localstorage_write", key: "theme" });
  }
  applyTheme(t);
}

/**
 * Inject the theme CSS into the document <head> if not already present.
 * Idempotent — safe to call multiple times. Call once at app boot.
 */
export function ensureThemeCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById("clasloop-theme-css")) return;
  const style = document.createElement("style");
  style.id = "clasloop-theme-css";
  style.textContent = THEME_CSS;
  document.head.appendChild(style);
}
