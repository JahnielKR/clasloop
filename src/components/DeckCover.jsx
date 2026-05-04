// ─── Reusable Deck Cover ──────────────────────────────────────────────────
// One source of truth for how a deck visually looks across the app:
// teacher's Decks list, Community grid, MyClasses, etc.
//
// Visual hierarchy:
//   1. Custom uploaded image (cover_image_url)  → image fills the cover
//   2. Custom color + icon (cover_color)        → solid color + chosen icon
//   3. Default: subject-based color + subject icon
//
// Supports two layouts:
//   - "card"  (default): square-ish cover at top of a deck card
//   - "row"   : small icon-only badge for compact rows
import { CIcon } from "./Icons";

// Subject → default color palette (background + accent for icons/text overlay)
const SUBJECT_PALETTE = {
  Math:      { bg: "#E6F1FB", accent: "#2383E2", deep: "#0C447C" },
  Science:   { bg: "#EAF3DE", accent: "#639922", deep: "#3B6D11" },
  History:   { bg: "#FAEEDA", accent: "#BA7517", deep: "#854F0B" },
  Language:  { bg: "#EEEDFE", accent: "#534AB7", deep: "#26215C" },
  Geography: { bg: "#E1F5EE", accent: "#0F6E56", deep: "#04342C" },
  Art:       { bg: "#FBEAF0", accent: "#C84B8B", deep: "#4B1528" },
  Music:     { bg: "#FCEBEB", accent: "#E24B4A", deep: "#501313" },
  Other:     { bg: "#F1EFE8", accent: "#888780", deep: "#2C2C2A" },
};

const SUBJECT_ICON = {
  Math: "math", Science: "science", History: "history",
  Language: "language", Geography: "geo", Art: "art",
  Music: "music", Other: "book",
};

export function getDeckPalette(deck) {
  const palette = SUBJECT_PALETTE[deck?.subject] || SUBJECT_PALETTE.Other;
  // If the deck stored a custom color, override the bg.
  if (deck?.cover_color) {
    return { ...palette, bg: deck.cover_color };
  }
  return palette;
}

export function DeckCover({ deck, layout = "card", height = 110, iconSize = null }) {
  const palette = getDeckPalette(deck);
  const icon = deck?.cover_icon || SUBJECT_ICON[deck?.subject] || "book";

  // Custom image: render as background-image
  if (deck?.cover_image_url) {
    if (layout === "row") {
      return (
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          backgroundImage: `url(${deck.cover_image_url})`,
          backgroundSize: "cover", backgroundPosition: "center",
          flexShrink: 0,
        }} />
      );
    }
    return (
      <div style={{
        width: "100%", height,
        borderRadius: "10px 10px 0 0",
        backgroundImage: `url(${deck.cover_image_url})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
    );
  }

  // Solid color + icon
  if (layout === "row") {
    return (
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: palette.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <CIcon name={icon} size={iconSize || 22} />
      </div>
    );
  }

  // Card layout: gradient using the palette for visual depth
  return (
    <div style={{
      width: "100%", height,
      borderRadius: "10px 10px 0 0",
      background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bg}cc 60%, ${palette.accent}33 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative pattern dots */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.15 }} width="100%" height="100%">
        <defs>
          <pattern id={`dots-${deck?.id || "x"}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={palette.deep} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${deck?.id || "x"})`} />
      </svg>
      <div style={{ position: "relative", zIndex: 1 }}>
        <CIcon name={icon} size={iconSize || 44} />
      </div>
    </div>
  );
}

export { SUBJECT_PALETTE, SUBJECT_ICON };
export default DeckCover;
