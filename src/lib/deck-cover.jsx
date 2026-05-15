// ─── Deck Cover v2: color + icon + custom image + SVG presets ───────────────
// Shared by Decks editor, Decks list, Community cards, and DeckSelect.
import { CIcon } from "../components/Icons";

// ── Curated palette ─────────────────────────────────────────────────────────
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

// ── Curated icon set ────────────────────────────────────────────────────────
export const DECK_ICONS = [
  "book", "brain", "lightbulb", "study", "question",
  "math", "science", "history", "language", "geo",
  "art", "music", "sports", "globe", "rocket",
  "trophy", "star", "fire", "target", "magic",
];

export const DEFAULT_DECK_COLOR = "blue";
export const DEFAULT_DECK_ICON = "book";

// Subject → icon/color mapping (smart default).
export const SUBJ_ICON = {
  Math: "math", Science: "science", History: "history",
  Language: "language", Geography: "geo", Art: "art",
  Music: "music", Other: "book",
};
export const SUBJ_COLOR = {
  Math: "blue", Science: "green", History: "amber",
  Language: "indigo", Geography: "teal", Art: "pink",
  Music: "purple", Other: "slate",
};

// ── 12 SVG pattern presets ─────────────────────────────────────────────────
// Each pattern is a function (color) => svg string. They render as inline data
// URLs so they cost zero network requests. The first color is treated as the
// "base" and we shade lighter/darker for accents.
//
// Saved in DB as `cover_image_url` with a special `preset:<id>` scheme (e.g.
// "preset:waves"). Renderer detects the prefix and rebuilds the SVG using the
// deck's current cover_color, so a preset re-tints when the user switches color.
export const PRESET_PATTERNS = [
  { id: "waves",     label: "Waves" },
  { id: "dots",      label: "Dots" },
  { id: "grid",      label: "Grid" },
  { id: "rays",      label: "Rays" },
  { id: "blobs",     label: "Blobs" },
  { id: "mountains", label: "Mountains" },
  { id: "circles",   label: "Circles" },
  { id: "mesh",      label: "Mesh" },
  { id: "zigzag",    label: "Zigzag" },
  { id: "stripes",   label: "Stripes" },
  { id: "confetti",  label: "Confetti" },
  { id: "orbs",      label: "Orbs" },
];

// Color manipulation helpers
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + amt));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ── Resolvers ───────────────────────────────────────────────────────────────
export const resolveColor = (deck) => {
  const found = DECK_COLORS.find(c => c.id === deck?.cover_color);
  return found ? found.value : DECK_COLORS.find(c => c.id === DEFAULT_DECK_COLOR).value;
};
// PR 28.16: internal helper. Used only within this file by <DeckCover />.
// Kept here (not collapsed into the component) because three layers
// reference it during render.
const resolveIcon = (deck) => {
  if (deck?.cover_icon && DECK_ICONS.includes(deck.cover_icon)) return deck.cover_icon;
  if (deck?.subject && SUBJ_ICON[deck.subject]) return SUBJ_ICON[deck.subject];
  return DEFAULT_DECK_ICON;
};

// Returns:
//   { kind: "image", url }    → custom uploaded image
//   { kind: "preset", id }    → SVG preset (re-tinted with cover_color)
//   { kind: "icon" }          → fallback color + icon
// PR 28.16: internal helper.
const resolveCover = (deck) => {
  const url = deck?.cover_image_url;
  if (url) {
    if (url.startsWith("preset:")) {
      const id = url.slice("preset:".length);
      if (PRESET_PATTERNS.find(p => p.id === id)) return { kind: "preset", id };
    } else {
      return { kind: "image", url };
    }
  }
  return { kind: "icon" };
};

// ── SVG pattern generators ─────────────────────────────────────────────────
// Each returns a complete <svg>…</svg> string sized 320x180 (16:9-ish), tiled or scaled.
// PR 28.16: internal helper. Used only by <DeckCover />.
function renderPresetSVG(id, color) {
  const c = color;
  const lo = shade(color, -25);
  const hi = shade(color, 30);
  switch (id) {
    case "waves": return svg`
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c}"/>
          <stop offset="100%" stop-color="${lo}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#g)"/>
      <path d="M0,120 C80,90 160,150 240,110 S400,140 320,140 L320,180 L0,180 Z" fill="${hi}" opacity="0.35"/>
      <path d="M0,140 C80,115 160,165 240,135 S400,160 320,160 L320,180 L0,180 Z" fill="#ffffff" opacity="0.18"/>
    `;
    case "dots": return svg`
      <rect width="320" height="180" fill="${c}"/>
      ${dotGrid(8, 12, 18, "#ffffff", 0.25, 4)}
    `;
    case "grid": return svg`
      <rect width="320" height="180" fill="${c}"/>
      ${gridLines(20, "#ffffff", 0.18)}
    `;
    case "rays": return svg`
      <defs>
        <radialGradient id="g" cx="80%" cy="20%" r="120%">
          <stop offset="0%" stop-color="${hi}"/>
          <stop offset="100%" stop-color="${lo}"/>
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#g)"/>
      ${rays(8, 320, 0, "#ffffff", 0.16)}
    `;
    case "blobs": return svg`
      <rect width="320" height="180" fill="${c}"/>
      <circle cx="60"  cy="50"  r="70" fill="${hi}" opacity="0.45"/>
      <circle cx="240" cy="140" r="80" fill="${lo}" opacity="0.55"/>
      <circle cx="180" cy="40"  r="40" fill="#ffffff" opacity="0.25"/>
    `;
    case "mountains": return svg`
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${hi}"/>
          <stop offset="100%" stop-color="${c}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#sky)"/>
      <polygon points="0,180 80,80 160,180" fill="${lo}" opacity="0.85"/>
      <polygon points="100,180 200,60 300,180" fill="${shade(color, -10)}" opacity="0.9"/>
      <polygon points="220,180 320,100 320,180" fill="${lo}" opacity="0.75"/>
      <circle cx="260" cy="40" r="14" fill="#ffffff" opacity="0.6"/>
    `;
    case "circles": return svg`
      <rect width="320" height="180" fill="${c}"/>
      <circle cx="160" cy="90" r="20" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.35"/>
      <circle cx="160" cy="90" r="40" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.28"/>
      <circle cx="160" cy="90" r="60" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.22"/>
      <circle cx="160" cy="90" r="80" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.16"/>
      <circle cx="160" cy="90" r="100" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.10"/>
    `;
    case "mesh": return svg`
      <defs>
        <radialGradient id="m1" cx="20%" cy="30%" r="60%"><stop offset="0%" stop-color="${hi}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
        <radialGradient id="m2" cx="80%" cy="70%" r="60%"><stop offset="0%" stop-color="${lo}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="320" height="180" fill="${c}"/>
      <rect width="320" height="180" fill="url(#m1)"/>
      <rect width="320" height="180" fill="url(#m2)"/>
    `;
    case "zigzag": return svg`
      <rect width="320" height="180" fill="${c}"/>
      ${zigzag(40, 16, "#ffffff", 0.22)}
    `;
    case "stripes": return svg`
      <rect width="320" height="180" fill="${c}"/>
      ${diagonalStripes(20, "#ffffff", 0.14)}
    `;
    case "confetti": return svg`
      <rect width="320" height="180" fill="${c}"/>
      ${confetti(40, "#ffffff", hi, lo)}
    `;
    case "orbs": return svg`
      <defs>
        <radialGradient id="orb1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${hi}"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
        <radialGradient id="orb2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
        <radialGradient id="orb3" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${lo}"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="320" height="180" fill="${c}"/>
      <circle cx="50" cy="40" r="60" fill="url(#orb1)" opacity="0.9"/>
      <circle cx="260" cy="120" r="80" fill="url(#orb3)" opacity="0.9"/>
      <circle cx="180" cy="60" r="35" fill="url(#orb2)" opacity="0.7"/>
    `;
    default: return svg`<rect width="320" height="180" fill="${c}"/>`;
  }
}

// ── Tiny SVG helpers (string templates) ────────────────────────────────────
const svg = (strings, ...values) => {
  let body = "";
  strings.forEach((s, i) => { body += s; if (i < values.length) body += values[i]; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
};

function dotGrid(rows, cols, gap, color, opacity, r) {
  const xStep = 320 / (cols + 1);
  const yStep = 180 / (rows + 1);
  let out = "";
  for (let y = 1; y <= rows; y++) {
    for (let x = 1; x <= cols; x++) {
      out += `<circle cx="${x * xStep}" cy="${y * yStep}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
    }
  }
  return out;
}

function gridLines(step, color, opacity) {
  let out = "";
  for (let x = step; x < 320; x += step) out += `<line x1="${x}" y1="0" x2="${x}" y2="180" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`;
  for (let y = step; y < 180; y += step) out += `<line x1="0" y1="${y}" x2="320" y2="${y}" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`;
  return out;
}

function rays(count, length, cx, color, opacity) {
  let out = "";
  const startX = 320, startY = 0;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI / 2) + (i * Math.PI / 12);
    const x2 = startX - Math.cos(angle) * length;
    const y2 = startY + Math.sin(angle) * length;
    out += `<line x1="${startX}" y1="${startY}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" opacity="${opacity}"/>`;
  }
  return out;
}

function zigzag(width, height, color, opacity) {
  let out = "";
  for (let y = 0; y < 180 + height; y += height) {
    let path = `M0,${y} `;
    for (let x = 0; x < 320; x += width) {
      const dy = (Math.floor(x / width) % 2 === 0) ? height / 2 : -height / 2;
      path += `L${x + width},${y + dy} `;
    }
    out += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}"/>`;
  }
  return out;
}

function diagonalStripes(step, color, opacity) {
  let out = "";
  for (let i = -180; i < 320; i += step) {
    out += `<line x1="${i}" y1="0" x2="${i + 180}" y2="180" stroke="${color}" stroke-width="${step / 2}" opacity="${opacity}"/>`;
  }
  return out;
}

function confetti(count, white, hi, lo) {
  let out = "";
  // Deterministic pseudo-random for stable visual across renders
  const rng = mulberry32(42);
  for (let i = 0; i < count; i++) {
    const x = rng() * 320;
    const y = rng() * 180;
    const w = 4 + rng() * 8;
    const h = 2 + rng() * 4;
    const rot = rng() * 360;
    const fill = [white, hi, lo][Math.floor(rng() * 3)];
    out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="${0.4 + rng() * 0.4}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"/>`;
  }
  return out;
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert SVG string to inline data URL for use as background-image.
export function presetToDataUrl(id, color) {
  const raw = renderPresetSVG(id, color);
  // encodeURIComponent is safest for arbitrary SVG content
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(raw)}")`;
}

// ─── Visual components ─────────────────────────────────────────────────────
//
// <DeckCover deck={dk} variant="tile" size={48} />     small square (lists)
// <DeckCover deck={dk} variant="banner" height={80} /> wide banner (cards)

export function DeckCover({ deck, variant = "tile", size = 48, height = 80, radius = 12 }) {
  const cover = resolveCover(deck);
  const color = resolveColor(deck);
  const iconName = resolveIcon(deck);

  // ── Banner (full-width, used at top of cards / detail views) ──
  if (variant === "banner") {
    const baseStyle = {
      width: "100%", height,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
    };
    if (cover.kind === "image") {
      return (
        <div style={{
          ...baseStyle,
          backgroundImage: `url(${cover.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: color,
        }} />
      );
    }
    if (cover.kind === "preset") {
      return (
        <div style={{
          ...baseStyle,
          backgroundImage: presetToDataUrl(cover.id, color),
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: color,
        }} />
      );
    }
    // icon + color
    const iconBoxSize = Math.round(height * 0.62);
    return (
      <div style={{
        ...baseStyle,
        background: `linear-gradient(135deg, ${color}, ${shade(color, -22)})`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: iconBoxSize, height: iconBoxSize,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.96)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
        }}>
          <CIcon name={iconName} size={Math.round(iconBoxSize * 0.6)} inline />
        </div>
      </div>
    );
  }

  // ── Tile (small square, used inline in lists / pickers) ──
  const baseTile = {
    width: size, height: size, borderRadius: radius,
    flexShrink: 0,
    overflow: "hidden",
    boxShadow: `0 1px 3px ${color}33`,
  };
  if (cover.kind === "image") {
    return (
      <div style={{
        ...baseTile,
        backgroundImage: `url(${cover.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: color,
      }} />
    );
  }
  if (cover.kind === "preset") {
    return (
      <div style={{
        ...baseTile,
        backgroundImage: presetToDataUrl(cover.id, color),
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: color,
      }} />
    );
  }
  const plate = Math.round(size * 0.66);
  return (
    <div style={{
      ...baseTile,
      background: `linear-gradient(135deg, ${color}, ${shade(color, -18)})`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: plate, height: plate,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.96)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
      }}>
        <CIcon name={iconName} size={Math.round(plate * 0.78)} inline />
      </div>
    </div>
  );
}

// Returns a hex like "#2383E2" + alpha "11" / "22" for soft tint backgrounds.
export const colorTint = (deck, alphaHex = "11") => resolveColor(deck) + alphaHex;
