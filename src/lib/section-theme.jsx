// ─── section-theme ──────────────────────────────────────────────────────
//
// Visual identity per deck section, used by the student quiz UI.
// Per student feedback: "I want to feel: oh this is a warmup, this is
// an exit ticket, this is a review". So each section gets:
//   - tinted background (subtle, mobile-friendly)
//   - accent color (progress bar, selected option, button)
//   - icon-bg / icon-fg for the type-tag
//   - label text in the local i18n
//
// Both LIGHT and DARK themed values. We don't rely on CSS vars here
// because the StudentJoin uses inline styles (host design pattern from
// PR 1+) and we need to read the theme synchronously to compute colors.
// Instead we expose getSectionTheme(section, isDark) which returns a
// flat object with the right values for the current mode.
//
// Color choices match the rest of the app (PR 6.3 added section-aware
// foreground tokens for badges); these extend that system to backgrounds
// and stronger accents specifically for the quiz environment.

// Detect dark mode by reading the document attribute set in tokens.js.
// SSR-safe: returns false when document is not available.
export function isDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "dark";
}

const THEMES = {
  // ── Warmup ─────────────────────────────────────────────────────────
  // Energetic, warm. Softer than the orange we use for badges so a full
  // screen tinted in it doesn't burn the eyes on mobile.
  warmup: {
    light: {
      bg: "#FFF8F0",          // page background (very soft cream)
      tint: "#FFF3E0",        // header/card variations
      accent: "#D9730D",      // primary action / progress
      accentSoft: "#FFE9CC",  // selected option fill
      iconBg: "#FFE9CC",      // icon background in header
      iconFg: "#8A4A0A",      // icon glyph color
      labelFg: "#8A4A0A",     // "Warmup" label text
      onTint: "#3D2400",      // text on tinted bg (high contrast)
      onAccent: "#FFFFFF",    // text on filled accent (button)
      borderActive: "#D9730D",
    },
    dark: {
      // Inverted: bg becomes dark warm, accents are lighter to read
      // against dark surfaces.
      bg: "#1F1814",          // very dark warm brown
      tint: "#2A2018",        // slightly lifted for cards
      accent: "#F5A341",      // brighter orange for dark surfaces
      accentSoft: "#3D2A18",
      iconBg: "#3D2A18",
      iconFg: "#F5C088",
      labelFg: "#F5C088",
      onTint: "#F5E6D3",      // light cream on dark warm bg
      onAccent: "#1F1814",    // dark text on light orange button
      borderActive: "#F5A341",
    },
  },

  // ── Exit ticket ─────────────────────────────────────────────────────
  // Reflective, focused. Cooler purple than the warmup orange.
  exit_ticket: {
    light: {
      bg: "#F6F2FB",
      tint: "#EDE6F6",
      accent: "#6940A5",
      accentSoft: "#E5DCF3",
      iconBg: "#E5DCF3",
      iconFg: "#3F2466",
      labelFg: "#3F2466",
      onTint: "#241340",
      onAccent: "#FFFFFF",
      borderActive: "#6940A5",
    },
    dark: {
      bg: "#1A1422",
      tint: "#241B30",
      accent: "#B091DA",
      accentSoft: "#33264B",
      iconBg: "#33264B",
      iconFg: "#C8A8E8",
      labelFg: "#C8A8E8",
      onTint: "#E8DCFB",
      onAccent: "#1A1422",
      borderActive: "#B091DA",
    },
  },

  // ── General review ─────────────────────────────────────────────────
  // Neutral, professional. Distinctly NOT warm or cool — should feel
  // like "we're going over things, no pressure".
  general_review: {
    light: {
      bg: "#F6F4F0",
      tint: "#EDEAE3",
      accent: "#4A4438",
      accentSoft: "#E2DDD0",
      iconBg: "#E2DDD0",
      iconFg: "#4A4438",
      labelFg: "#4A4438",
      onTint: "#1F1C16",
      onAccent: "#FFFFFF",
      borderActive: "#4A4438",
    },
    dark: {
      bg: "#1C1B18",
      tint: "#26241F",
      accent: "#B8B3A4",
      accentSoft: "#363330",
      iconBg: "#363330",
      iconFg: "#D6D1C0",
      labelFg: "#D6D1C0",
      onTint: "#E8E3D6",
      onAccent: "#1C1B18",
      borderActive: "#B8B3A4",
    },
  },
};

// Default fallback when section is null/missing — matches what the
// student would have seen before the redesign. Same shape as a theme
// so the renderer doesn't need to special-case it.
const DEFAULT_THEME = {
  light: {
    bg: "#FFFFFF",
    tint: "#F7F7F5",
    accent: "#2383E2",
    accentSoft: "#E8F0FE",
    iconBg: "#E8F0FE",
    iconFg: "#2383E2",
    labelFg: "#2383E2",
    onTint: "#191919",
    onAccent: "#FFFFFF",
    borderActive: "#2383E2",
  },
  dark: {
    bg: "#191919",
    tint: "#222222",
    accent: "#4A9FE8",
    accentSoft: "#1A2A3D",
    iconBg: "#1A2A3D",
    iconFg: "#4A9FE8",
    labelFg: "#4A9FE8",
    onTint: "#ECECEC",
    onAccent: "#191919",
    borderActive: "#4A9FE8",
  },
};

/**
 * Returns the theme object for the given section, in the current mode.
 *
 * @param {string|null} section - "warmup" | "exit_ticket" | "general_review" | null
 * @param {boolean} [forceDark] - override current dark detection (for testing)
 * @returns {object} theme — all the color tokens the quiz uses
 */
export function getSectionTheme(section, forceDark) {
  const dark = forceDark != null ? forceDark : isDarkMode();
  const ramp = THEMES[section] || DEFAULT_THEME;
  return dark ? ramp.dark : ramp.light;
}

/**
 * i18n labels for the section header. Kept here so StudentJoin doesn't
 * need to maintain a separate dictionary for these three tiny strings.
 */
export function getSectionLabel(section, lang) {
  const map = {
    warmup: { en: "Warmup", es: "Calentamiento", ko: "워밍업" },
    exit_ticket: { en: "Exit ticket", es: "Cierre", ko: "종료 티켓" },
    general_review: { en: "Review", es: "Repaso", ko: "복습" },
  };
  return map[section]?.[lang] || map[section]?.en || "";
}

/**
 * Tabler-equivalent inline SVG icon for each section. We use SVG inline
 * (not a font like Tabler) because StudentJoin has no global icon font
 * and we want a self-contained module. Each icon is sized to fit a
 * 28px circle header.
 *
 * The icons match the metaphors: sun for warmup (energetic start),
 * down-arrow-circle for exit ticket (closing the day), stack for
 * review (going through layers).
 */
export function SectionIconSVG({ section, color, size = 16 }) {
  const stroke = color || "currentColor";
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke, strokeWidth: 2,
    strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  switch (section) {
    case "warmup":
      // Sun
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "exit_ticket":
      // Down arrow in circle
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l4 4 4-4M12 8v8" />
        </svg>
      );
    case "general_review":
      // Stack of squares (review = layers of past content)
      return (
        <svg {...props}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    default:
      // Generic question mark for fallback
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2.5-2.5 4M12 17h.01" />
        </svg>
      );
  }
}
