// ─── Deck Cover: color + icon customization ───────────────────────────────
// Shared by Decks editor, Decks list, Community cards, and DeckSelect.
import { CIcon } from "../components/Icons";

// Curated palette — 10 cohesive options that pair nicely with white plates.
// `id` is what we save in DB (`decks.cover_color`).
export const DECK_COLORS = [
  { id: "blue",    value: "#2383E2", label: "Blue" },
  { id: "purple",  value: "#6940A5", label: "Purple" },
  { id: "green",   value: "#0F7B6C", label: "Green" },
  { id: "orange",  value: "#D9730D", label: "Orange" },
  { id: "red",     value: "#E03E3E", label: "Red" },
  { id: "pink",    value: "#D6336C", label: "Pink" },
  { id: "teal",    value: "#0BA5A4", label: "Teal" },
  { id: "indigo",  value: "#4C5FD5", label: "Indigo" },
  { id: "amber",   value: "#D4A017", label: "Amber" },
  { id: "slate",   value: "#525866", label: "Slate" },
];

// Curated icon set chosen from CIcon names that work well as deck covers.
// `id` is what we save in DB (`decks.cover_icon`) and what we pass to <CIcon name=... />.
export const DECK_ICONS = [
  "book", "brain", "lightbulb", "study", "question",
  "math", "science", "history", "language", "geo",
  "art", "music", "sports", "globe", "rocket",
  "trophy", "star", "fire", "target", "magic",
];

export const DEFAULT_DECK_COLOR = "blue";
export const DEFAULT_DECK_ICON = "book";

// Subject → icon mapping (smart default when picking from a subject).
export const SUBJ_ICON = {
  Math: "math", Science: "science", History: "history",
  Language: "language", Geography: "geo", Art: "art",
  Music: "music", Other: "book",
};

// Resolve a deck's cover color, falling back to default.
export const resolveColor = (deck) => {
  const found = DECK_COLORS.find(c => c.id === deck?.cover_color);
  return found ? found.value : DECK_COLORS.find(c => c.id === DEFAULT_DECK_COLOR).value;
};

// Resolve a deck's cover icon. If not set, fall back to subject-based icon, then default.
export const resolveIcon = (deck) => {
  if (deck?.cover_icon && DECK_ICONS.includes(deck.cover_icon)) return deck.cover_icon;
  if (deck?.subject && SUBJ_ICON[deck.subject]) return SUBJ_ICON[deck.subject];
  return DEFAULT_DECK_ICON;
};

// Slightly darker hex for the gradient bottom-right.
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + amt));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Visual component ──────────────────────────────────────────────────────
// Colored rounded tile + a white circular plate that hosts the CIcon. The icon
// keeps its branded coloring (which is the design language across the app),
// the plate provides separation from the colored bg, and the tile gradient
// gives it depth. This mirrors how Notion/Apple Reminders render covers.
//
//   <DeckCover deck={dk} size={48} />
//   <DeckCover deck={dk} size={64} radius={14} />
export function DeckCover({ deck, size = 48, radius = 12 }) {
  const color = resolveColor(deck);
  const iconName = resolveIcon(deck);
  const plateSize = Math.round(size * 0.66);
  const iconSize = Math.round(plateSize * 0.78);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: radius,
        background: `linear-gradient(135deg, ${color}, ${shade(color, -18)})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 1px 3px ${color}33`,
      }}
    >
      <div style={{
        width: plateSize, height: plateSize,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.96)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
      }}>
        <CIcon name={iconName} size={iconSize} inline />
      </div>
    </div>
  );
}
