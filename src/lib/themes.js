// src/lib/themes.js
// ─── Source of truth for all lobby/live themes ─────────────────────────
//
// To add a new theme:
//   1. Add an entry to THEMES below
//   2. Update the check constraints in supabase/phase20_lobby_themes.sql
//      (or a follow-up migration)
//   3. Add CSS rules for [data-theme="newid"] in src/styles/themes.css
//
// Tier gate (is_premium): currently UNENFORCED in v1.
// PR 20 ships all 4 themes as effectively free because Clasloop has no
// billing infrastructure yet. The flag stays on the data to make a future
// gate trivial — when billing arrives, canUseTheme() starts enforcing.

export const THEMES = {
  calm: {
    id: 'calm',
    name: 'Calm',
    is_premium: false,
    is_default: true,
    description: 'Profesional y universal',
    fonts: {
      display: "'Outfit', sans-serif",
      body: "'Inter', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    background: '#FAFAF8',
    backgroundOverlay: null,
    text: '#2C2A26',
    textSoft: '#6B6760',
    textMuted: '#9C9890',
    surface: '#FFFFFF',
    surfaceBorder: '#E8E6E1',
    surfaceRadius: '16px',
    accent: '#0F7B6C',
    accentTint: '#E5F3F0',
    pinFont: 'display',
    pinTransform: null,
    chipBorderStyle: 'solid',
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    is_premium: false,
    description: 'Calmo, profundo, premium',
    fonts: {
      display: "'Outfit', sans-serif",
      body: "'Inter', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    background: 'radial-gradient(ellipse at top, #1A3D6B 0%, #0A1F3F 55%, #050E20 100%)',
    backgroundOverlay: 'starfield',
    text: '#E8F0FF',
    textSoft: 'rgba(232, 240, 255, 0.7)',
    textMuted: 'rgba(232, 240, 255, 0.5)',
    surface: 'rgba(255,255,255,0.06)',
    surfaceBorder: 'rgba(255,255,255,0.15)',
    surfaceRadius: '16px',
    accent: 'rgb(120, 220, 180)',
    accentTint: 'rgba(120, 220, 180, 0.18)',
    pinFont: 'display',
    pinTransform: 'glow',
    chipBorderStyle: 'solid',
    chipBlur: true,
  },

  pop: {
    id: 'pop',
    name: 'Pop',
    is_premium: true,
    description: 'Energético, divertido, vibrante',
    fonts: {
      display: "'Outfit', sans-serif",
      displayWeight: 800,
      body: "'Outfit', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    background: 'linear-gradient(135deg, #FFD93D 0%, #FF6B9D 50%, #C147FF 100%)',
    backgroundOverlay: null,
    text: '#1F1733',
    textSoft: 'rgba(31, 23, 51, 0.75)',
    textMuted: 'rgba(31, 23, 51, 0.5)',
    surface: 'rgba(255,255,255,0.92)',
    surfaceBorder: '#1F1733',
    surfaceBorderWidth: '3px',
    surfaceRadius: '16px',
    surfaceShadow: '4px 4px 0 #1F1733',
    accent: 'rgb(120, 220, 180)',
    accentTint: 'rgba(120, 220, 180, 0.4)',
    pinFont: 'display',
    pinTransform: 'bounce',
    chipBorderStyle: 'solid',
    chipBorderWidth: '2px',
    chipShadow: '3px 3px 0 #1F1733',
  },

  mono: {
    id: 'mono',
    name: 'Mono',
    is_premium: true,
    description: 'Brutalist, tech, máximo contraste',
    fonts: {
      display: "'JetBrains Mono', monospace",
      body: "'JetBrains Mono', monospace",
      mono: "'JetBrains Mono', monospace",
    },
    background: '#000000',
    backgroundOverlay: 'scanlines',
    text: '#FFFFFF',
    textSoft: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    surface: 'transparent',
    surfaceBorder: 'rgba(255,255,255,0.25)',
    surfaceRadius: '0px',
    accent: '#FFFFFF',
    accentTint: 'rgba(255, 255, 255, 0.08)',
    pinFont: 'display',
    pinTransform: 'cursor',
    chipBorderStyle: 'solid',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────

export function getTheme(id) {
  return THEMES[id] || THEMES.calm;
}

export function listThemes() {
  return Object.values(THEMES);
}

/**
 * Check if a user's tier permits using this theme. Currently always
 * returns true (no tier system) — kept as a stub so future billing
 * integration is a one-line change inside this function rather than
 * throughout the codebase.
 */
export function canUseTheme(themeId /* , userTier = 'free' */) {
  const theme = THEMES[themeId];
  if (!theme) return false;
  // v1: no tier enforcement. All themes available to everyone.
  return true;
}

/**
 * Cascade resolution: deck override → class theme → 'calm' default.
 * Always returns a valid theme id (never null/undefined).
 */
export function resolveDeckTheme(deck, deckClass) {
  const fromDeck = deck?.lobby_theme_override;
  const fromClass = deckClass?.lobby_theme;
  const id = fromDeck || fromClass || 'calm';
  // Guard: if a stale theme id arrives from the DB (e.g. an old theme
  // was removed in a migration), fall back to 'calm'.
  return THEMES[id] ? id : 'calm';
}
