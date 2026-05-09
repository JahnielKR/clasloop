// ─── Clasloop Design Tokens ──────────────────────────────────────────────
// Theme-aware palette using CSS variables. Pages use `C.bg`, `C.text` etc.
// the same way as before — but these now resolve to CSS variables that
// switch between light and dark theme automatically.
//
// HOW IT WORKS:
//   - The CSS injected via THEME_CSS declares :root (light) and
//     [data-theme="dark"] (dark) variable sets.
//   - The C object below contains var() references — when the theme
//     attribute on <html> changes, every component using C.bg etc.
//     re-renders with the new color.
//   - This is the ONLY place to add/modify theme colors.
//
// HOW TO ADD A NEW COLOR:
//   1. Add to LIGHT_VARS and DARK_VARS in THEME_CSS below
//   2. Add to the C object as `var(--color-xxx)`
//
// USED BY: 12+ pages directly, and indirectly by every page through the
// design system. Adding new keys is fine; renaming requires sweeping.

// ─── Theme CSS — injected once at app boot ──────────────────────────────
export const THEME_CSS = `
:root {
  /* color-scheme tells the browser to render native widgets (option lists,
     scrollbars, autofill, etc.) using the matching theme. Without this,
     <option> dropdowns inherit the OS appearance and end up black-on-white
     even when the page is dark. */
  color-scheme: light;
  /* Surfaces */
  --c-bg: #FFFFFF;
  --c-bg-soft: #F7F7F5;

  /* Brand */
  --c-accent: #2383E2;
  --c-accent-soft: #E8F0FE;

  /* Status */
  --c-green: #0F7B6C;
  --c-green-soft: #EEFBF5;
  --c-orange: #D9730D;
  --c-orange-soft: #FFF3E0;
  --c-red: #E03E3E;
  --c-red-soft: #FDECEC;
  --c-purple: #6940A5;
  --c-purple-soft: #F3EEFB;

  /* Section badges — readable foreground on each section's soft bg.
     These need to be theme-aware because the bg is theme-aware: a
     dark-warm fg works on a light-orange bg but is invisible on a
     dark-orange bg in dark mode. Light theme uses deep, saturated
     hues; dark theme uses light, lifted hues — see [data-theme=dark]. */
  --c-section-warmup-fg: #6E3A00;
  --c-section-exit-fg: #391E5E;
  --c-section-general-fg: #4a4a4a;
  --c-section-general-bg: #EEEDEA;
  --c-section-general-accent: #6B6B6B;

  /* Text */
  --c-text: #191919;
  --c-text-secondary: #6B6B6B;
  --c-text-muted: #9B9B9B;

  /* Misc */
  --c-border: #E8E8E4;
  --c-shadow: 0 1px 3px rgba(0,0,0,0.04);

  /* Brand extras — used by specific pages (achievements pink, community/director/decks yellow) */
  --c-yellow: #D4A017;
  --c-yellow-soft: #FEF9E7;
  --c-pink: #D34185;
  --c-pink-soft: #FCE8F0;

  /* Body baseline (used by index.css) */
  --c-body-bg: #F7F7F5;
}

[data-theme="dark"] {
  color-scheme: dark;
  /* Surfaces — dark inverts white→near-black, soft→slightly lifted surface */
  --c-bg: #1E1F22;
  --c-bg-soft: #16171A;

  /* Brand — keep accent recognizable, soft becomes dark-tinted */
  --c-accent: #4A9FE8;
  --c-accent-soft: #1F3A57;

  /* Status — slightly lifted hues, soft variants get dark tints */
  --c-green: #5DB89C;
  --c-green-soft: #1A2E29;
  --c-orange: #E89952;
  --c-orange-soft: #3A2A1A;
  --c-red: #E86767;
  --c-red-soft: #3A1F1F;
  --c-purple: #A687D6;
  --c-purple-soft: #2A1F3A;

  /* Section badges — light/lifted hues for dark mode readability */
  --c-section-warmup-fg: #F5C088;
  --c-section-exit-fg: #C8A8E8;
  --c-section-general-fg: #B8B8B8;
  --c-section-general-bg: #2A2B2E;
  --c-section-general-accent: #888888;

  /* Text — high-contrast on dark surfaces */
  --c-text: #ECECEC;
  --c-text-secondary: #A8A8A8;
  --c-text-muted: #707070;

  /* Misc */
  --c-border: #2C2D31;
  --c-shadow: 0 1px 3px rgba(0,0,0,0.4);

  /* Brand extras — dark variants of yellow/pink */
  --c-yellow: #E8B73D;
  --c-yellow-soft: #2E2618;
  --c-pink: #E66BA8;
  --c-pink-soft: #2E1F28;

  /* Body baseline */
  --c-body-bg: #16171A;
}

/* Smooth transition on theme switch — applied to all elements */
html.theme-ready, html.theme-ready * {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
`;

// ─── C object — drop-in replacement, now theme-aware ────────────────────
// Every key resolves to a CSS variable. Components don't need to change.
export const C = {
  // Surfaces
  bg: "var(--c-bg)",
  bgSoft: "var(--c-bg-soft)",

  // Brand
  accent: "var(--c-accent)",
  accentSoft: "var(--c-accent-soft)",

  // Status
  green: "var(--c-green)",
  greenSoft: "var(--c-green-soft)",
  orange: "var(--c-orange)",
  orangeSoft: "var(--c-orange-soft)",
  red: "var(--c-red)",
  redSoft: "var(--c-red-soft)",
  purple: "var(--c-purple)",
  purpleSoft: "var(--c-purple-soft)",

  // Section badge foregrounds — theme-aware, used by SectionBadge.
  // The badge's bg comes from C.orangeSoft / C.purpleSoft (already
  // theme-aware) and its accent from sectionAccent() (which uses
  // C.orange / C.purple, also theme-aware). What was missing was a
  // theme-aware foreground for the label text — that's these.
  sectionWarmupFg: "var(--c-section-warmup-fg)",
  sectionExitFg: "var(--c-section-exit-fg)",
  sectionGeneralFg: "var(--c-section-general-fg)",
  sectionGeneralBg: "var(--c-section-general-bg)",
  sectionGeneralAccent: "var(--c-section-general-accent)",

  // Text
  text: "var(--c-text)",
  textSecondary: "var(--c-text-secondary)",
  textMuted: "var(--c-text-muted)",

  // Misc
  border: "var(--c-border)",
  shadow: "var(--c-shadow)",

  // Brand extras
  yellow: "var(--c-yellow)",
  yellowSoft: "var(--c-yellow-soft)",
  pink: "var(--c-pink)",
  pinkSoft: "var(--c-pink-soft)",
};

// Mono font stack — used for deck PINs, codes, code-like values.
export const MONO = "'JetBrains Mono', monospace";

// ─── Theme runtime helpers ──────────────────────────────────────────────
// These intentionally avoid React hooks so they can be called from anywhere
// (including BEFORE React mounts, to prevent flash of wrong theme).

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
  try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
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
