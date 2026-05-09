// ─── SectionBadge ────────────────────────────────────────────────────────
// Visible identity for a deck's section. Warmups (warm/orange) and exit
// tickets (cool/purple) are the protagonists; general review (neutral gray)
// is intentionally the visually quietest of the three.
//
// Used everywhere a deck appears: deck cards in ClassPage / Decks list,
// today cards in SessionFlow, lib lookups in plan slots. One component,
// one source of truth — when we tweak the visual language of warmups,
// every place updates at once.
//
// Variant prop:
//   "default" → label text + icon, padded pill (most contexts)
//   "compact" → icon only with a tooltip (deck-card top-right corner)
//   "stripe"  → returns just the accent color hex, for use as a top
//               border on cards. Rendered by the host, not this component.
//
// Color choice rationale (decided with Jota in the redesign session):
//   - Warmup → warm/orange. Energy at the start of class.
//   - Exit ticket → cool/purple. Reflective, closing.
//   - General review → neutral gray. The catch-all bucket; doesn't compete
//     with the two protagonists for attention.

import { C } from "./tokens";
import { sectionLabels } from "../lib/class-hierarchy";

// ─── Color/icon table — single source of truth ────────────────────────
// We pick ASCII glyphs (☀ ⤓ ▤) instead of the bigger SVG icons used in
// the sidebar. They render at the same size as text, scale automatically
// with font-size, and don't need extra width when stacked next to a deck
// title. The idea is the badge feels like punctuation, not a graphic.
//
// All colors come from CSS-variable-backed tokens so the badge adapts
// to dark mode automatically. Earlier versions hardcoded foregrounds
// (#6E3A00, #391E5E, #4a4a4a) which became invisible on dark theme
// because dark theme inverts the soft-bg to a dark hue and the dark
// foreground stopped being readable. The fix was adding theme-aware
// section-fg tokens — see tokens.js.
const SECTION_STYLE = {
  warmup: {
    glyph: "☀",
    bg: C.orangeSoft,
    fg: C.sectionWarmupFg,
    accent: C.orange,        // for stripe variant — already theme-aware
  },
  exit_ticket: {
    glyph: "⤓",
    bg: C.purpleSoft,
    fg: C.sectionExitFg,
    accent: C.purple,
  },
  general_review: {
    glyph: "▤",
    bg: C.sectionGeneralBg,
    fg: C.sectionGeneralFg,
    accent: C.sectionGeneralAccent,
  },
};

// Default fallback — anything unknown gets the general_review treatment
// rather than rendering nothing or crashing. Shouldn't happen in practice
// since the schema constrains section to these three values, but defensive.
const DEFAULT_STYLE = SECTION_STYLE.general_review;

function getStyle(section) {
  return SECTION_STYLE[section] || DEFAULT_STYLE;
}

// ─── Public helpers ────────────────────────────────────────────────────

// Returns the accent hex for a section. Use this when you want to render
// a section-aware element WITHOUT the badge itself — e.g. a top-border
// stripe on a deck card. Keeps the color palette in one place.
export function sectionAccent(section) {
  return getStyle(section).accent;
}

// Returns the glyph for a section. Useful when you want a tiny inline
// indicator (e.g. inside a button or a notification line) without a full
// pill background. Pair with the section's name from sectionLabels().
export function sectionGlyph(section) {
  return getStyle(section).glyph;
}

// ─── The component ─────────────────────────────────────────────────────
//
// Props:
//   section  string — "warmup" | "exit_ticket" | "general_review"
//   lang     string — "en" | "es" | "ko" (passed by host page)
//   variant  "default" | "compact"
//             default → glyph + uppercase label, full pill
//             compact → glyph only, tighter padding (for tight UI)
//   size     "sm" | "md"   default "sm" (matches the mockup's 10.5px)
//
// Notes:
//   - The label text is sourced from sectionLabels() so it stays in sync
//     with whatever Jota wrote there. We use the .singular form ("Warmup",
//     not "Warmups") because a badge labels ONE thing.
//   - We don't use C.warmSoft/etc. directly because the badge needs a
//     specific "deep warm" foreground that doesn't exist as a token yet —
//     adding three new tokens just for this would inflate tokens.js, so
//     we hardcode the hexes here. If they prove useful elsewhere we can
//     promote them later.
export default function SectionBadge({
  section,
  lang = "en",
  variant = "default",
  size = "sm",
  style: extraStyle = {},
}) {
  const style = getStyle(section);
  const labels = sectionLabels(lang);
  const labelObj = labels[section] || labels.general_review;
  const label = labelObj.singular;

  const fontSize = size === "md" ? 12 : 10.5;
  const padY = variant === "compact" ? 2 : 3;
  const padX = variant === "compact" ? 5 : 8;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: variant === "compact" ? 0 : 5,
        padding: `${padY}px ${padX}px`,
        borderRadius: 4,
        background: style.bg,
        color: style.fg,
        fontFamily: "'Inter', 'Outfit', sans-serif",
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        lineHeight: 1.3,
        ...extraStyle,
      }}
      // Title gives screen readers + hover the full context, especially
      // useful for the compact variant where we hide the text label.
      title={label}
    >
      <span aria-hidden="true" style={{ fontSize: fontSize + 1, lineHeight: 1 }}>
        {style.glyph}
      </span>
      {variant !== "compact" && <span>{label}</span>}
    </span>
  );
}
