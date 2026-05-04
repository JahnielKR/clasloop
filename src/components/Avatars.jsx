// ─── Clasloop Avatar System (Phase 1 redesign) ──────────────────────────────
// 30 hand-drawn SVG avatars with three distinct visual tiers:
//
//   COMMON (15)    Abstract geometric shapes with personality. No frame.
//   RARE (10)      Humanoids + concept characters. Gradient ring frame +
//                  shimmer + corner sparkle.
//   LEGENDARY (5)  Standout characters. Double-ring frame (gradient + gold) +
//                  orbiting particles + soft pulsing glow.
//
// The frame system is what signals tier — without ever having to read a
// "Rare" or "Legendary" label, the eye understands hierarchy.
//
// Public API:
//   <Avatar id="loopy" size={48} />                 small render anywhere
//   <Avatar id="phoenix" size={120} showName />     big render w/ effects
//   <Avatar photoUrl="https://..." size={48} />     uploaded photo
//   <AvatarPicker currentId onSelect unlockedIds /> the catalog UI
//   AVATARS, RARITY, getAvatarById, getDefaultAvatarFor

import { useMemo } from "react";

// ─── Palette ───────────────────────────────────────────────────────────────
const D = {
  blue: "#2383E2", purple: "#6940A5", green: "#0F7B6C", orange: "#D9730D",
  red: "#E03E3E", gold: "#D4A017", pink: "#C84B8B", cyan: "#0EA5E9",
  teal: "#14B8A6", lime: "#84CC16", amber: "#F59E0B", indigo: "#6366F1",
  ink: "#1a1a2e", muted: "#9B9B9B",
};

// Skin tones for humanoid avatars (used in rare + legendary)
const SKIN = {
  light:    "#F4D9B7",
  mediumLt: "#E8B98A",
  mediumDk: "#B07A4A",
  dark:     "#6B4423",
};

// ─── Tier metadata ─────────────────────────────────────────────────────────
export const RARITY = {
  common: {
    label: { en: "Common", es: "Común", ko: "일반" },
    color: "#888780",
    bg: "#F1EFE8",
  },
  rare: {
    label: { en: "Rare", es: "Raro", ko: "레어" },
    color: "#534AB7",
    bg: "#EEEDFE",
  },
  legendary: {
    label: { en: "Legendary", es: "Legendario", ko: "전설" },
    color: "#BA7517",
    bg: "#FAEEDA",
  },
};

// ─── Frame component ──────────────────────────────────────────────────────
// Wraps an avatar SVG with the appropriate tier frame. Controls when fancy
// effects (orbit, glow) are rendered based on size — at <56px they're noise.
function AvatarFrame({ rarity, size, locked, children, gradientId }) {
  const showEffects = size >= 56 && !locked;
  // The visual canvas is `size` px. For rare/legendary, frame elements draw
  // OUTSIDE the avatar circle, so we expand the SVG viewBox.
  const padding = rarity === "legendary" ? 14 : (rarity === "rare" ? 8 : 0);
  const total = size + padding * 2;
  const cx = total / 2;
  const cy = total / 2;
  const inner = size / 2;

  if (rarity === "common" || !rarity) {
    return (
      <div style={{ width: size, height: size, position: "relative" }}>
        {locked && <LockOverlay size={size} />}
        <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", filter: locked ? "grayscale(1) brightness(.8)" : "none" }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: total, height: total, position: "relative" }}>
      <svg
        width={total}
        height={total}
        viewBox={`0 0 ${total} ${total}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <linearGradient id={`${gradientId}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            {rarity === "rare" ? (
              <>
                <stop offset="0%" stopColor="#378ADD" />
                <stop offset="100%" stopColor="#7F77DD" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#EF9F27" />
                <stop offset="50%" stopColor="#D85A30" />
                <stop offset="100%" stopColor="#7F77DD" />
              </>
            )}
          </linearGradient>
          {rarity === "legendary" && showEffects && (
            <radialGradient id={`${gradientId}-glow`} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#FAC775" stopOpacity="0" />
              <stop offset="100%" stopColor="#EF9F27" stopOpacity="0.35" />
            </radialGradient>
          )}
        </defs>

        {/* LEGENDARY: outer pulsing glow */}
        {rarity === "legendary" && showEffects && (
          <circle cx={cx} cy={cy} r={inner + padding - 1} fill={`url(#${gradientId}-glow)`}>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}

        {/* LEGENDARY: orbiting particles */}
        {rarity === "legendary" && showEffects && (
          <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="14s" repeatCount="indefinite" />
            <circle cx={cx} cy={cy - inner - padding + 2} r="2" fill="#EF9F27" />
            <circle cx={cx + inner + padding - 2} cy={cy} r="1.6" fill="#7F77DD" />
            <circle cx={cx} cy={cy + inner + padding - 2} r="2" fill="#D85A30" />
            <circle cx={cx - inner - padding + 2} cy={cy} r="1.6" fill="#FAC775" />
          </g>
        )}

        {/* Outer gradient ring */}
        <circle
          cx={cx}
          cy={cy}
          r={inner + (rarity === "legendary" ? 4 : 2)}
          fill="none"
          stroke={`url(#${gradientId}-ring)`}
          strokeWidth={rarity === "legendary" ? 2.5 : 2.5}
        >
          {rarity === "rare" && showEffects && (
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          )}
        </circle>

        {/* LEGENDARY: inner gold ring */}
        {rarity === "legendary" && (
          <circle cx={cx} cy={cy} r={inner} fill="none" stroke="#FAC775" strokeWidth="1" opacity="0.6" />
        )}

        {/* RARE: corner sparkle */}
        {rarity === "rare" && showEffects && (
          <g transform={`translate(${cx + inner * 0.7} ${cy - inner * 0.7})`}>
            <path d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#7F77DD" opacity="0.85" />
          </g>
        )}
      </svg>

      {/* Avatar itself, centered inside the frame */}
      <div
        style={{
          position: "absolute",
          left: padding,
          top: padding,
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          filter: locked ? "grayscale(1) brightness(.8)" : "none",
        }}
      >
        {children}
      </div>

      {locked && <LockOverlay size={size} offset={padding} />}
    </div>
  );
}

function LockOverlay({ size, offset = 0 }) {
  return (
    <div style={{
      position: "absolute",
      left: offset, top: offset,
      width: size, height: size,
      borderRadius: "50%",
      background: "rgba(28,28,28,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <svg width={size * 0.36} height={size * 0.36} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="11" width="14" height="10" rx="2" fill="#FFFFFF" />
        <path d="M 8 11 V 8 a 4 4 0 0 1 8 0 v 3" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─── COMMON (15) — Abstract geometric characters ──────────────────────────
// Each gets a unique shape silhouette + color combo + facial expression.
// All share: clean strokes, one accent color, simple emotion.

const COMMON_RENDERERS = {
  // 1. Loopy — happy round blue
  loopy: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E6F1FB" />
      <circle cx="50" cy="50" r="38" fill="#85B7EB" />
      <circle cx="42" cy="46" r="3.5" fill="#0C447C" />
      <circle cx="58" cy="46" r="3.5" fill="#0C447C" />
      <path d="M 39 58 Q 50 66 61 58" stroke="#0C447C" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="54" r="3.2" fill="#F4C0D1" opacity="0.8" />
      <circle cx="67" cy="54" r="3.2" fill="#F4C0D1" opacity="0.8" />
    </svg>
  ),
  // 2. Spark — diamond orange, excited
  spark: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FAEEDA" />
      <path d="M 50 16 L 84 50 L 50 84 L 16 50 Z" fill="#EF9F27" />
      <circle cx="42" cy="48" r="3" fill="#412402" />
      <circle cx="58" cy="48" r="3" fill="#412402" />
      <path d="M 41 60 L 50 56 L 59 60" stroke="#412402" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 50 18 L 53 24 L 50 30 L 47 24 Z" fill="#FAEEDA" opacity="0.8" />
    </svg>
  ),
  // 3. Boba — rounded square teal, calm
  boba: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E1F5EE" />
      <rect x="16" y="16" width="68" height="68" rx="16" fill="#5DCAA5" />
      <rect x="38" y="44" width="6" height="8" rx="2" fill="#04342C" />
      <rect x="56" y="44" width="6" height="8" rx="2" fill="#04342C" />
      <path d="M 38 64 Q 50 70 62 64" stroke="#04342C" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="26" y="22" width="10" height="3" rx="1.5" fill="#FFFFFF" opacity="0.5" />
    </svg>
  ),
  // 4. Pip — small triangle pink, cheeky
  pip: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FBEAF0" />
      <path d="M 50 18 L 84 76 L 16 76 Z" fill="#ED93B1" />
      <circle cx="44" cy="58" r="3" fill="#4B1528" />
      <circle cx="56" cy="58" r="3" fill="#4B1528" />
      <path d="M 44 68 Q 50 72 56 68" stroke="#4B1528" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="64" rx="3" ry="2" fill="#D4537E" opacity="0.6" />
    </svg>
  ),
  // 5. Cloud — soft cloud blue, sleepy
  cloud: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E6F1FB" />
      <path d="M 24 60 Q 24 44 38 42 Q 42 28 58 32 Q 74 30 76 48 Q 84 50 80 64 Q 76 72 60 70 L 36 70 Q 22 68 24 60 Z" fill="#FFFFFF" stroke="#85B7EB" strokeWidth="2.4" />
      <path d="M 38 54 Q 44 56 42 58" stroke="#0C447C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M 58 54 Q 64 56 62 58" stroke="#0C447C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="64" r="2" fill="#85B7EB" />
    </svg>
  ),
  // 6. Mochi — round purple, content
  mochi: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#EEEDFE" />
      <ellipse cx="50" cy="56" rx="34" ry="30" fill="#AFA9EC" />
      <path d="M 38 50 Q 42 46 46 50" stroke="#26215C" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M 54 50 Q 58 46 62 50" stroke="#26215C" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="60" r="4" fill="#7F77DD" />
      <circle cx="34" cy="62" r="2.6" fill="#F4C0D1" opacity="0.7" />
      <circle cx="66" cy="62" r="2.6" fill="#F4C0D1" opacity="0.7" />
    </svg>
  ),
  // 7. Leaf — green leaf, peaceful
  leaf: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#EAF3DE" />
      <path d="M 30 68 Q 30 30 50 22 Q 70 30 70 68 Q 50 78 30 68 Z" fill="#97C459" />
      <path d="M 50 22 L 50 76" stroke="#3B6D11" strokeWidth="1.6" />
      <path d="M 50 36 L 42 42 M 50 50 L 40 56 M 50 36 L 58 42 M 50 50 L 60 56" stroke="#3B6D11" strokeWidth="1.4" opacity="0.5" />
      <circle cx="44" cy="58" r="2.6" fill="#173404" />
      <circle cx="56" cy="58" r="2.6" fill="#173404" />
    </svg>
  ),
  // 8. Sunny — sun amber, bright
  sunny: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FAEEDA" />
      <g stroke="#BA7517" strokeWidth="2.4" strokeLinecap="round">
        <line x1="50" y1="14" x2="50" y2="22" />
        <line x1="50" y1="78" x2="50" y2="86" />
        <line x1="14" y1="50" x2="22" y2="50" />
        <line x1="78" y1="50" x2="86" y2="50" />
        <line x1="24" y1="24" x2="30" y2="30" />
        <line x1="70" y1="70" x2="76" y2="76" />
        <line x1="24" y1="76" x2="30" y2="70" />
        <line x1="70" y1="30" x2="76" y2="24" />
      </g>
      <circle cx="50" cy="50" r="22" fill="#EF9F27" />
      <circle cx="44" cy="48" r="2.6" fill="#412402" />
      <circle cx="56" cy="48" r="2.6" fill="#412402" />
      <path d="M 42 56 Q 50 62 58 56" stroke="#412402" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  // 9. Pebble — gray rock, stoic
  pebble: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#F1EFE8" />
      <path d="M 22 56 Q 18 38 36 28 Q 56 20 72 32 Q 84 46 78 60 Q 70 78 50 78 Q 26 76 22 56 Z" fill="#888780" />
      <circle cx="42" cy="50" r="3" fill="#2C2C2A" />
      <circle cx="58" cy="50" r="3" fill="#2C2C2A" />
      <line x1="42" y1="62" x2="58" y2="62" stroke="#2C2C2A" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="36" cy="40" rx="6" ry="3" fill="#FFFFFF" opacity="0.3" />
    </svg>
  ),
  // 10. Bolt — lightning yellow, energetic
  bolt: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FAEEDA" />
      <path d="M 56 14 L 30 52 L 46 52 L 40 86 L 70 46 L 54 46 Z" fill="#EF9F27" stroke="#BA7517" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="44" cy="46" r="2.4" fill="#412402" />
      <circle cx="56" cy="42" r="2.4" fill="#412402" />
      <path d="M 46 56 L 52 56" stroke="#412402" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // 11. Frost — snowflake cyan, cool
  frost: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E6F1FB" />
      <g stroke="#378ADD" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <line x1="50" y1="18" x2="50" y2="82" />
        <line x1="22" y1="34" x2="78" y2="66" />
        <line x1="22" y1="66" x2="78" y2="34" />
        <path d="M 50 22 L 46 28 M 50 22 L 54 28" />
        <path d="M 50 78 L 46 72 M 50 78 L 54 72" />
        <path d="M 26 36 L 32 36 M 26 36 L 26 42" />
        <path d="M 74 64 L 68 64 M 74 64 L 74 58" />
        <path d="M 26 64 L 32 64 M 26 64 L 26 58" />
        <path d="M 74 36 L 68 36 M 74 36 L 74 42" />
      </g>
      <circle cx="50" cy="50" r="10" fill="#FFFFFF" stroke="#378ADD" strokeWidth="2" />
      <circle cx="46" cy="49" r="1.4" fill="#0C447C" />
      <circle cx="54" cy="49" r="1.4" fill="#0C447C" />
    </svg>
  ),
  // 12. Ember — flame red, fierce
  ember: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FCEBEB" />
      <path d="M 50 18 Q 32 36 32 56 Q 32 76 50 82 Q 68 76 68 56 Q 68 36 50 18 Z" fill="#E24B4A" />
      <path d="M 50 28 Q 40 40 40 54 Q 40 68 50 72 Q 60 68 60 54 Q 60 40 50 28 Z" fill="#EF9F27" />
      <circle cx="44" cy="54" r="2.6" fill="#501313" />
      <circle cx="56" cy="54" r="2.6" fill="#501313" />
      <path d="M 44 64 L 56 64" stroke="#501313" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  // 13. Bloom — flower pink, joyful
  bloom: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FBEAF0" />
      <g fill="#ED93B1">
        <ellipse cx="50" cy="28" rx="10" ry="14" />
        <ellipse cx="50" cy="72" rx="10" ry="14" />
        <ellipse cx="28" cy="50" rx="14" ry="10" />
        <ellipse cx="72" cy="50" rx="14" ry="10" />
        <ellipse cx="34" cy="34" rx="9" ry="11" transform="rotate(-45 34 34)" />
        <ellipse cx="66" cy="34" rx="9" ry="11" transform="rotate(45 66 34)" />
        <ellipse cx="34" cy="66" rx="9" ry="11" transform="rotate(45 34 66)" />
        <ellipse cx="66" cy="66" rx="9" ry="11" transform="rotate(-45 66 66)" />
      </g>
      <circle cx="50" cy="50" r="14" fill="#FAC775" />
      <circle cx="46" cy="48" r="1.8" fill="#4B1528" />
      <circle cx="54" cy="48" r="1.8" fill="#4B1528" />
      <path d="M 46 54 Q 50 57 54 54" stroke="#4B1528" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  ),
  // 14. Moss — bumpy green, sleepy
  moss: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#EAF3DE" />
      <path d="M 18 64 Q 18 48 28 44 Q 24 32 38 30 Q 46 22 56 28 Q 70 22 76 36 Q 86 42 80 60 Q 76 76 50 78 Q 26 78 18 64 Z" fill="#639922" />
      <circle cx="34" cy="44" r="3" fill="#97C459" opacity="0.6" />
      <circle cx="62" cy="40" r="3" fill="#97C459" opacity="0.6" />
      <circle cx="48" cy="36" r="2.4" fill="#97C459" opacity="0.6" />
      <path d="M 40 60 L 46 60" stroke="#173404" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 54 60 L 60 60" stroke="#173404" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 44 68 Q 50 70 56 68" stroke="#173404" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  // 15. Orbit — ringed planet purple, curious
  orbit: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#EEEDFE" />
      <ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="#534AB7" strokeWidth="2.4" transform="rotate(-20 50 50)" />
      <circle cx="50" cy="50" r="22" fill="#7F77DD" />
      <circle cx="44" cy="48" r="2.6" fill="#26215C" />
      <circle cx="56" cy="48" r="2.6" fill="#26215C" />
      <circle cx="58" cy="40" r="3" fill="#FFFFFF" opacity="0.5" />
      <path d="M 44 56 Q 50 60 56 56" stroke="#26215C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  ),
};

// ─── RARE (10) — Humanoids + concept characters ───────────────────────────

const RARE_RENDERERS = {
  // 1. Astro — astronaut humanoid, light skin
  astro: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#0C447C" />
      <circle cx="32" cy="22" r="1.4" fill="#FFFFFF" />
      <circle cx="74" cy="28" r="1.2" fill="#FFFFFF" />
      <circle cx="22" cy="64" r="1" fill="#FFFFFF" />
      <circle cx="80" cy="74" r="1.4" fill="#FFFFFF" />
      <ellipse cx="50" cy="58" rx="22" ry="22" fill="#FFFFFF" />
      <rect x="36" y="68" width="28" height="22" rx="6" fill="#FFFFFF" />
      <rect x="42" y="74" width="6" height="6" rx="1" fill="#7F77DD" />
      <rect x="52" y="74" width="6" height="6" rx="1" fill="#7F77DD" />
      <ellipse cx="50" cy="58" rx="16" ry="14" fill="#1a1a2e" />
      <ellipse cx="50" cy="56" rx="14" ry="11" fill="#378ADD" opacity="0.4" />
      <circle cx={SKIN.light === SKIN.light ? 46 : 46} cy="58" r="2" fill={SKIN.light} opacity="0.3" />
      <circle cx="55" cy="50" r="3" fill="#FFFFFF" opacity="0.7" />
      <circle cx="58" cy="46" r="1.6" fill="#FFFFFF" opacity="0.9" />
    </svg>
  ),
  // 2. Ninja — masked humanoid, medium-dark skin
  ninja: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FCEBEB" />
      <path d="M 22 30 Q 50 16 78 30 L 78 38 Q 50 36 22 38 Z" fill="#A32D2D" />
      <ellipse cx="50" cy="58" rx="22" ry="22" fill={SKIN.mediumDk} />
      <path d="M 28 42 Q 50 38 72 42 L 72 56 Q 50 56 28 56 Z" fill="#1a1a2e" />
      <ellipse cx="42" cy="52" rx="3.4" ry="2.2" fill="#FFFFFF" />
      <ellipse cx="58" cy="52" rx="3.4" ry="2.2" fill="#FFFFFF" />
      <circle cx="42" cy="52" r="1.6" fill="#1a1a2e" />
      <circle cx="58" cy="52" r="1.6" fill="#1a1a2e" />
      <path d="M 24 32 L 26 28 L 28 32 Z" fill="#A32D2D" />
      <path d="M 72 32 L 74 28 L 76 32 Z" fill="#A32D2D" />
      <rect x="34" y="78" width="32" height="14" rx="3" fill="#1a1a2e" />
      <rect x="42" y="78" width="16" height="3" fill="#A32D2D" />
    </svg>
  ),
  // 3. Mage — robed humanoid, light skin, hat
  mage: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#EEEDFE" />
      <path d="M 50 8 Q 60 20 56 32 L 44 32 Q 40 20 50 8 Z" fill="#534AB7" />
      <ellipse cx="50" cy="34" rx="22" ry="6" fill="#3C3489" />
      <circle cx="56" cy="14" r="2.4" fill="#FAC775" />
      <ellipse cx="50" cy="56" rx="20" ry="20" fill={SKIN.light} />
      <circle cx="44" cy="52" r="2.4" fill="#26215C" />
      <circle cx="56" cy="52" r="2.4" fill="#26215C" />
      <path d="M 42 62 Q 50 65 58 62" stroke="#26215C" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 32 78 Q 50 76 68 78 L 64 92 L 36 92 Z" fill="#534AB7" />
      <path d="M 38 80 L 32 88 M 62 80 L 68 88" stroke="#3C3489" strokeWidth="1.4" />
      <circle cx="50" cy="84" r="2" fill="#FAC775" />
    </svg>
  ),
  // 4. Scholar — bookworm humanoid, dark skin, glasses
  scholar: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FAEEDA" />
      <path d="M 28 26 Q 50 14 72 26 L 72 38 Q 50 32 28 38 Z" fill="#412402" />
      <ellipse cx="50" cy="58" rx="22" ry="22" fill={SKIN.dark} />
      <circle cx="42" cy="56" r="6" fill="none" stroke="#1a1a2e" strokeWidth="2" />
      <circle cx="58" cy="56" r="6" fill="none" stroke="#1a1a2e" strokeWidth="2" />
      <line x1="48" y1="56" x2="52" y2="56" stroke="#1a1a2e" strokeWidth="2" />
      <circle cx="42" cy="56" r="2" fill="#1a1a2e" />
      <circle cx="58" cy="56" r="2" fill="#1a1a2e" />
      <path d="M 42 70 Q 50 73 58 70" stroke="#1a1a2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="32" y="80" width="36" height="14" rx="2" fill="#FFFFFF" />
      <line x1="36" y1="84" x2="64" y2="84" stroke="#888780" strokeWidth="1" />
      <line x1="36" y1="88" x2="60" y2="88" stroke="#888780" strokeWidth="1" />
      <line x1="50" y1="80" x2="50" y2="94" stroke="#1a1a2e" strokeWidth="1.4" />
    </svg>
  ),
  // 5. Captain — explorer humanoid, medium-light skin, hat with feather
  captain: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E1F5EE" />
      <path d="M 24 32 L 50 18 L 76 32 L 72 38 L 28 38 Z" fill="#0F6E56" />
      <path d="M 28 38 L 72 38 L 70 44 L 30 44 Z" fill="#085041" />
      <path d="M 60 22 Q 70 16 78 18 Q 74 26 64 28 Z" fill="#EF9F27" />
      <ellipse cx="50" cy="60" rx="22" ry="22" fill={SKIN.mediumLt} />
      <circle cx="44" cy="56" r="2.6" fill="#1a1a2e" />
      <circle cx="56" cy="56" r="2.6" fill="#1a1a2e" />
      <path d="M 42 66 Q 50 70 58 66" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 30 74 Q 30 70 50 70 Q 70 70 70 74 L 68 92 L 32 92 Z" fill="#0F6E56" />
      <circle cx="50" cy="80" r="2.4" fill="#FAC775" />
    </svg>
  ),
  // 6. Robo — friendly robot, antenna with sparkle
  robo: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E1F5EE" />
      <line x1="50" y1="20" x2="50" y2="30" stroke="#0F6E56" strokeWidth="2" />
      <circle cx="50" cy="18" r="3" fill="#FAC775" />
      <rect x="22" y="30" width="56" height="46" rx="10" fill="#5DCAA5" />
      <rect x="30" y="38" width="40" height="22" rx="5" fill="#04342C" />
      <circle cx="42" cy="49" r="3.6" fill="#FAC775" />
      <circle cx="58" cy="49" r="3.6" fill="#FAC775" />
      <rect x="36" y="64" width="28" height="6" rx="2" fill="#0F6E56" />
      <rect x="40" y="66" width="4" height="2" fill="#FAC775" />
      <rect x="46" y="66" width="4" height="2" fill="#FAC775" />
      <rect x="52" y="66" width="4" height="2" fill="#FAC775" />
      <rect x="58" y="66" width="4" height="2" fill="#FAC775" />
      <rect x="20" y="48" width="4" height="14" rx="1" fill="#0F6E56" />
      <rect x="76" y="48" width="4" height="14" rx="1" fill="#0F6E56" />
    </svg>
  ),
  // 7. Ghost — kawaii ghost
  ghost: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#EEEDFE" />
      <path d="M 22 36 Q 22 18 50 18 Q 78 18 78 36 L 78 78 L 70 70 L 62 78 L 54 70 L 46 78 L 38 70 L 30 78 L 22 70 Z" fill="#FFFFFF" stroke="#7F77DD" strokeWidth="2.4" />
      <circle cx="40" cy="42" r="3.4" fill="#26215C" />
      <circle cx="60" cy="42" r="3.4" fill="#26215C" />
      <circle cx="41" cy="41" r="1" fill="#FFFFFF" />
      <circle cx="61" cy="41" r="1" fill="#FFFFFF" />
      <ellipse cx="50" cy="54" rx="6" ry="4" fill="#26215C" />
      <circle cx="32" cy="50" r="3" fill="#F4C0D1" opacity="0.7" />
      <circle cx="68" cy="50" r="3" fill="#F4C0D1" opacity="0.7" />
    </svg>
  ),
  // 8. Crystal — sentient crystal with face
  crystal: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#E1F5EE" />
      <path d="M 50 16 L 70 36 L 70 70 L 50 88 L 30 70 L 30 36 Z" fill="#5DCAA5" />
      <path d="M 50 16 L 70 36 L 50 50 Z" fill="#9FE1CB" />
      <path d="M 30 36 L 50 50 L 30 70 Z" fill="#1D9E75" />
      <path d="M 50 50 L 70 70 L 50 88 Z" fill="#1D9E75" />
      <circle cx="44" cy="58" r="2.6" fill="#04342C" />
      <circle cx="56" cy="58" r="2.6" fill="#04342C" />
      <path d="M 44 68 Q 50 71 56 68" stroke="#04342C" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 42 30 L 46 26 L 50 30" stroke="#FFFFFF" strokeWidth="1.4" fill="none" opacity="0.6" />
    </svg>
  ),
  // 9. Planet — small living planet
  planet: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#0C447C" />
      <circle cx="22" cy="20" r="1.4" fill="#FAC775" />
      <circle cx="78" cy="74" r="1.2" fill="#FFFFFF" />
      <circle cx="84" cy="22" r="1" fill="#FAC775" />
      <ellipse cx="50" cy="50" rx="44" ry="10" fill="none" stroke="#FAC775" strokeWidth="2.4" transform="rotate(-15 50 50)" />
      <circle cx="50" cy="50" r="24" fill="#85B7EB" />
      <path d="M 30 46 Q 38 42 46 46 Q 52 50 60 46 Q 68 42 70 50" stroke="#1D9E75" strokeWidth="3" fill="none" opacity="0.6" />
      <circle cx="44" cy="48" r="2.6" fill="#0C447C" />
      <circle cx="56" cy="48" r="2.6" fill="#0C447C" />
      <path d="M 42 56 Q 50 60 58 56" stroke="#0C447C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  // 10. Flame — alive flame
  flame: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FCEBEB" />
      <path d="M 50 14 Q 28 30 28 56 Q 28 80 50 86 Q 72 80 72 56 Q 72 30 50 14 Z" fill="#E24B4A" />
      <path d="M 50 24 Q 36 36 36 54 Q 36 72 50 76 Q 64 72 64 54 Q 64 36 50 24 Z" fill="#EF9F27" />
      <path d="M 50 36 Q 42 44 42 54 Q 42 64 50 66 Q 58 64 58 54 Q 58 44 50 36 Z" fill="#FAC775" />
      <circle cx="44" cy="54" r="2.6" fill="#501313" />
      <circle cx="56" cy="54" r="2.6" fill="#501313" />
      <path d="M 44 62 Q 50 66 56 62" stroke="#501313" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
};

// ─── LEGENDARY (5) — Standout characters ──────────────────────────────────

const LEGENDARY_RENDERERS = {
  // 1. Phoenix — fiery bird with gradient feathers
  phoenix: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#FAEEDA" />
      <path d="M 50 14 Q 28 28 28 50 Q 28 70 38 78 Q 42 64 50 64 Q 58 64 62 78 Q 72 70 72 50 Q 72 28 50 14 Z" fill="#D85A30" />
      <path d="M 50 18 Q 36 28 36 46 Q 50 32 64 46 Q 64 28 50 18 Z" fill="#EF9F27" />
      <path d="M 50 26 Q 42 32 42 42 Q 50 36 58 42 Q 58 32 50 26 Z" fill="#FAC775" />
      <circle cx="44" cy="48" r="2.6" fill="#412402" />
      <circle cx="56" cy="48" r="2.6" fill="#412402" />
      <path d="M 50 54 L 46 56 L 50 58 L 54 56 Z" fill="#412402" />
      <path d="M 26 70 Q 22 78 24 86 Q 30 80 30 72 Z" fill="#EF9F27" />
      <path d="M 74 70 Q 78 78 76 86 Q 70 80 70 72 Z" fill="#EF9F27" />
      <circle cx="40" cy="34" r="1.6" fill="#FAEEDA" opacity="0.7" />
      <circle cx="60" cy="32" r="1.4" fill="#FAEEDA" opacity="0.7" />
    </svg>
  ),
  // 2. Cosmos — galaxy in a circle
  cosmos: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#0C447C" />
      <ellipse cx="50" cy="50" rx="36" ry="18" fill="#26215C" transform="rotate(25 50 50)" />
      <ellipse cx="50" cy="50" rx="28" ry="14" fill="#3C3489" transform="rotate(25 50 50)" opacity="0.7" />
      <circle cx="34" cy="44" r="2" fill="#FAC775" />
      <circle cx="58" cy="36" r="1.4" fill="#FAC775" />
      <circle cx="66" cy="52" r="2.6" fill="#FAC775" />
      <circle cx="42" cy="60" r="1.6" fill="#FAC775" />
      <circle cx="56" cy="64" r="1.8" fill="#FAC775" />
      <circle cx="28" cy="54" r="1.2" fill="#FAC775" />
      <circle cx="50" cy="32" r="1" fill="#FFFFFF" />
      <circle cx="72" cy="42" r="1" fill="#FFFFFF" />
      <circle cx="22" cy="40" r="0.8" fill="#FFFFFF" />
      <circle cx="76" cy="62" r="1" fill="#FFFFFF" />
      <circle cx="46" cy="72" r="0.8" fill="#FFFFFF" />
      <path d="M 34 44 L 58 36 L 66 52 L 56 64 L 42 60 Z" stroke="#FAC775" strokeWidth="0.6" fill="none" opacity="0.4" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#7F77DD" strokeWidth="0.8" opacity="0.5" />
    </svg>
  ),
  // 3. Dragon — quantum dragon with shifting scales
  dragon: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="dragon-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1D9E75" />
          <stop offset="50%" stopColor="#378ADD" />
          <stop offset="100%" stopColor="#7F77DD" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#04342C" />
      <path d="M 24 56 Q 24 32 50 28 Q 76 32 76 56 Q 76 78 50 80 Q 24 78 24 56 Z" fill="url(#dragon-body)" />
      <path d="M 30 32 L 38 22 L 42 32 Z" fill="#085041" />
      <path d="M 58 32 L 62 22 L 70 32 Z" fill="#085041" />
      <circle cx="40" cy="48" r="3" fill="#FAC775" />
      <circle cx="60" cy="48" r="3" fill="#FAC775" />
      <circle cx="40" cy="48" r="1.4" fill="#04342C" />
      <circle cx="60" cy="48" r="1.4" fill="#04342C" />
      <ellipse cx="50" cy="60" rx="8" ry="3" fill="#04342C" />
      <circle cx="46" cy="60" r="0.8" fill="#FAC775" />
      <circle cx="54" cy="60" r="0.8" fill="#FAC775" />
      <path d="M 36 70 Q 32 76 38 76 M 64 70 Q 68 76 62 76" stroke="#FAC775" strokeWidth="1.4" fill="none" />
      <circle cx="36" cy="42" r="1.4" fill="#FFFFFF" opacity="0.7" />
      <circle cx="58" cy="38" r="1" fill="#FFFFFF" opacity="0.6" />
      <circle cx="42" cy="56" r="0.8" fill="#FFFFFF" opacity="0.5" />
      <circle cx="62" cy="60" r="0.8" fill="#FFFFFF" opacity="0.5" />
    </svg>
  ),
  // 4. Sage — hooded humanoid with floating runes
  sage: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="sage-cloak" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#534AB7" />
          <stop offset="100%" stopColor="#3C3489" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#26215C" />
      <path d="M 22 90 Q 22 50 50 38 Q 78 50 78 90 Z" fill="url(#sage-cloak)" />
      <path d="M 30 38 Q 30 22 50 18 Q 70 22 70 38 L 70 50 Q 50 46 30 50 Z" fill="#26215C" />
      <ellipse cx="50" cy="58" rx="14" ry="14" fill={SKIN.mediumLt} />
      <path d="M 36 50 L 64 50 L 60 56 L 40 56 Z" fill="#1a1a2e" opacity="0.7" />
      <circle cx="44" cy="58" r="2" fill="#FAC775" />
      <circle cx="56" cy="58" r="2" fill="#FAC775" />
      <path d="M 44 66 L 56 66" stroke="#412402" strokeWidth="1.6" strokeLinecap="round" />
      <text x="22" y="34" fontSize="6" fill="#FAC775" opacity="0.85" fontFamily="serif">✦</text>
      <text x="74" y="40" fontSize="5" fill="#7F77DD" opacity="0.85" fontFamily="serif">✧</text>
      <text x="78" y="68" fontSize="5" fill="#FAC775" opacity="0.85" fontFamily="serif">✦</text>
      <text x="18" y="58" fontSize="4" fill="#7F77DD" opacity="0.75" fontFamily="serif">✧</text>
      <circle cx="50" cy="76" r="3" fill="#FAC775" opacity="0.6" />
      <circle cx="50" cy="76" r="1.6" fill="#FFFFFF" />
    </svg>
  ),
  // 5. TimeKeeper — clock entity with floating gears
  timekeeper: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#412402" />
      <circle cx="50" cy="50" r="34" fill="#FAEEDA" stroke="#BA7517" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#854F0B" strokeWidth="0.8" opacity="0.5" />
      <line x1="50" y1="22" x2="50" y2="26" stroke="#412402" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="74" x2="50" y2="78" stroke="#412402" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="50" x2="26" y2="50" stroke="#412402" strokeWidth="2" strokeLinecap="round" />
      <line x1="74" y1="50" x2="78" y2="50" stroke="#412402" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="32" stroke="#854F0B" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="50" y1="50" x2="64" y2="50" stroke="#412402" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3" fill="#412402" />
      <circle cx="44" cy="46" r="1.4" fill="#412402" />
      <circle cx="56" cy="46" r="1.4" fill="#412402" />
      <path d="M 46 60 Q 50 62 54 60" stroke="#412402" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <g transform="translate(20 22)">
        <circle r="6" fill="none" stroke="#FAC775" strokeWidth="1.4" opacity="0.8" />
        <circle r="2" fill="#FAC775" opacity="0.8" />
        <line x1="-7" y1="0" x2="-5" y2="0" stroke="#FAC775" strokeWidth="1.2" />
        <line x1="5" y1="0" x2="7" y2="0" stroke="#FAC775" strokeWidth="1.2" />
        <line x1="0" y1="-7" x2="0" y2="-5" stroke="#FAC775" strokeWidth="1.2" />
        <line x1="0" y1="5" x2="0" y2="7" stroke="#FAC775" strokeWidth="1.2" />
      </g>
      <g transform="translate(82 78)">
        <circle r="5" fill="none" stroke="#EF9F27" strokeWidth="1.2" opacity="0.7" />
        <circle r="1.6" fill="#EF9F27" opacity="0.7" />
        <line x1="-6" y1="0" x2="-4" y2="0" stroke="#EF9F27" strokeWidth="1" />
        <line x1="4" y1="0" x2="6" y2="0" stroke="#EF9F27" strokeWidth="1" />
        <line x1="0" y1="-6" x2="0" y2="-4" stroke="#EF9F27" strokeWidth="1" />
        <line x1="0" y1="4" x2="0" y2="6" stroke="#EF9F27" strokeWidth="1" />
      </g>
    </svg>
  ),
};

// ─── Catalog ───────────────────────────────────────────────────────────────
// Order matters — first 10 commons are "starter" (always unlocked, available
// at signup). Profs default to one of those. The rest are unlock-driven.

export const AVATARS = [
  // ─── COMMON (15) ───
  // Starter set (always available, free for everyone)
  { id: "loopy",  rarity: "common", starter: true, name: { en: "Loopy",  es: "Loopy",  ko: "루피"   } },
  { id: "spark",  rarity: "common", starter: true, name: { en: "Spark",  es: "Chispa", ko: "스파크" } },
  { id: "boba",   rarity: "common", starter: true, name: { en: "Boba",   es: "Boba",   ko: "보바"   } },
  { id: "pip",    rarity: "common", starter: true, name: { en: "Pip",    es: "Pip",    ko: "핍"     } },
  { id: "cloud",  rarity: "common", starter: true, name: { en: "Cloud",  es: "Nube",   ko: "구름"   } },
  { id: "mochi",  rarity: "common", starter: true, name: { en: "Mochi",  es: "Mochi",  ko: "모찌"   } },
  { id: "leaf",   rarity: "common", starter: true, name: { en: "Leaf",   es: "Hoja",   ko: "리프"   } },
  { id: "sunny",  rarity: "common", starter: true, name: { en: "Sunny",  es: "Sol",    ko: "써니"   } },
  { id: "pebble", rarity: "common", starter: true, name: { en: "Pebble", es: "Piedra", ko: "페블"   } },
  { id: "bolt",   rarity: "common", starter: true, name: { en: "Bolt",   es: "Rayo",   ko: "볼트"   } },
  // Common-but-earned (unlocked through engagement)
  { id: "frost",  rarity: "common", unlock: { type: "sessions",  count: 3  }, name: { en: "Frost",  es: "Hielo",  ko: "프로스트" } },
  { id: "ember",  rarity: "common", unlock: { type: "streak",    days: 3   }, name: { en: "Ember",  es: "Brasa",  ko: "엠버"   } },
  { id: "bloom",  rarity: "common", unlock: { type: "perfect",   count: 1  }, name: { en: "Bloom",  es: "Flor",   ko: "블룸"   } },
  { id: "moss",   rarity: "common", unlock: { type: "answers",   count: 50 }, name: { en: "Moss",   es: "Musgo",  ko: "모스"   } },
  { id: "orbit",  rarity: "common", unlock: { type: "sessions",  count: 10 }, name: { en: "Orbit",  es: "Órbita", ko: "오비트" } },

  // ─── RARE (10) ───
  // Humanoids (5)
  { id: "astro",   rarity: "rare", unlock: { type: "sessions", count: 20 },  name: { en: "Astro",   es: "Astro",     ko: "아스트로" } },
  { id: "ninja",   rarity: "rare", unlock: { type: "perfect",  count: 5  },  name: { en: "Ninja",   es: "Ninja",     ko: "닌자"     } },
  { id: "mage",    rarity: "rare", unlock: { type: "streak",   days: 7   },  name: { en: "Mage",    es: "Mago",      ko: "마법사"   } },
  { id: "scholar", rarity: "rare", unlock: { type: "answers",  count: 200 }, name: { en: "Scholar", es: "Erudito",   ko: "학자"     } },
  { id: "captain", rarity: "rare", unlock: { type: "topics",   count: 15 },  name: { en: "Captain", es: "Capitana",  ko: "선장"     } },
  // Concepts (5)
  { id: "robo",    rarity: "rare", unlock: { type: "sessions", count: 15 },  name: { en: "Robo",    es: "Robi",      ko: "로보"     } },
  { id: "ghost",   rarity: "rare", unlock: { type: "comeback", days: 7  },   name: { en: "Ghost",   es: "Fantasma",  ko: "유령"     } },
  { id: "crystal", rarity: "rare", unlock: { type: "retention", min: 85 },   name: { en: "Crystal", es: "Cristal",   ko: "크리스탈" } },
  { id: "planet",  rarity: "rare", unlock: { type: "topics",   count: 25 },  name: { en: "Planet",  es: "Planeta",   ko: "행성"     } },
  { id: "flame",   rarity: "rare", unlock: { type: "streak",   days: 14 },   name: { en: "Flame",   es: "Llama",     ko: "불꽃"     } },

  // ─── LEGENDARY (5) ───
  { id: "phoenix",     rarity: "legendary", unlock: { type: "comeback",  days: 30 },   name: { en: "Phoenix",      es: "Fénix",         ko: "피닉스"     } },
  { id: "cosmos",      rarity: "legendary", unlock: { type: "retention", min: 95 },    name: { en: "Cosmos",       es: "Cosmos",        ko: "코스모스"   } },
  { id: "dragon",      rarity: "legendary", unlock: { type: "streak",    days: 30 },   name: { en: "Dragon",       es: "Dragón",        ko: "용"         } },
  { id: "sage",        rarity: "legendary", unlock: { type: "answers",   count: 1000 },name: { en: "Sage",         es: "Sabio",         ko: "현자"       } },
  { id: "timekeeper",  rarity: "legendary", unlock: { type: "sessions",  count: 100 }, name: { en: "Time Keeper",  es: "Guardián del Tiempo", ko: "타임키퍼" } },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
const RENDERERS = { ...COMMON_RENDERERS, ...RARE_RENDERERS, ...LEGENDARY_RENDERERS };

export function getAvatarById(id) {
  return AVATARS.find(a => a.id === id) || null;
}

// Default avatar id for someone who hasn't picked one yet. Stable based on user id
// so the same user always sees the same default until they choose.
export function getDefaultAvatarFor(userIdOrSeed) {
  const starters = AVATARS.filter(a => a.starter);
  const seed = String(userIdOrSeed || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return starters[seed % starters.length];
}

// Format an unlock condition into a human-readable hint.
export function describeUnlock(unlock, lang = "en") {
  if (!unlock) return "";
  const T = {
    en: {
      sessions:  (n) => `Complete ${n} sessions`,
      streak:    (d) => `Maintain a ${d}-day streak`,
      perfect:   (n) => `Get a perfect score in ${n} session${n > 1 ? "s" : ""}`,
      answers:   (n) => `Answer ${n} questions correctly`,
      topics:    (n) => `Master ${n} topics`,
      comeback:  (d) => `Return after a ${d}-day break and review`,
      retention: (m) => `Reach ${m}% average retention`,
    },
    es: {
      sessions:  (n) => `Completa ${n} sesiones`,
      streak:    (d) => `Mantén una racha de ${d} días`,
      perfect:   (n) => `Saca puntaje perfecto en ${n} sesión${n > 1 ? "es" : ""}`,
      answers:   (n) => `Responde ${n} preguntas correctamente`,
      topics:    (n) => `Domina ${n} temas`,
      comeback:  (d) => `Vuelve después de ${d} días y haz un repaso`,
      retention: (m) => `Alcanza ${m}% de retención promedio`,
    },
    ko: {
      sessions:  (n) => `${n}개 세션 완료`,
      streak:    (d) => `${d}일 연속 기록 유지`,
      perfect:   (n) => `${n}개 세션에서 만점`,
      answers:   (n) => `${n}개 문제 정답`,
      topics:    (n) => `${n}개 주제 마스터`,
      comeback:  (d) => `${d}일 후 돌아와서 복습`,
      retention: (m) => `평균 ${m}% 기억 유지율 달성`,
    },
  };
  const t = T[lang] || T.en;
  switch (unlock.type) {
    case "sessions":  return t.sessions(unlock.count);
    case "streak":    return t.streak(unlock.days);
    case "perfect":   return t.perfect(unlock.count);
    case "answers":   return t.answers(unlock.count);
    case "topics":    return t.topics(unlock.count);
    case "comeback":  return t.comeback(unlock.days);
    case "retention": return t.retention(unlock.min);
    default:          return "";
  }
}

// ─── <Avatar /> — the main component used everywhere ──────────────────────
// Renders an avatar by:
//   - photoUrl   → uploaded photo (takes priority)
//   - id         → catalog id (loopy, phoenix, etc.)
//   - else       → falls back to a default based on `seed`
//
// Use `locked` to render a grayed-out version with a lock icon (catalog UI).
export function Avatar({
  id,
  photoUrl,
  size = 48,
  locked = false,
  seed,
  showName = false,
  lang = "en",
  style = {},
  onClick,
}) {
  // Photo takes priority — render it inside the same circle, no frame
  if (photoUrl) {
    return (
      <div
        onClick={onClick}
        style={{
          width: size, height: size, borderRadius: "50%",
          overflow: "hidden", flexShrink: 0,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: onClick ? "pointer" : "default",
          ...style,
        }}
        title={showName ? "" : undefined}
      />
    );
  }

  const avatar = getAvatarById(id) || getDefaultAvatarFor(seed || id || "");
  const renderer = RENDERERS[avatar?.id];
  const gradId = useMemo(() => `g${avatar?.id || "x"}-${Math.random().toString(36).slice(2, 7)}`, [avatar?.id]);

  if (!renderer) {
    // Fallback: solid circle with initial
    const initial = (seed || id || "?").toString().charAt(0).toUpperCase();
    return (
      <div
        onClick={onClick}
        style={{
          width: size, height: size, borderRadius: "50%",
          background: "#E8F0FE", color: "#2383E2",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.42, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
          flexShrink: 0,
          cursor: onClick ? "pointer" : "default",
          ...style,
        }}
      >{initial}</div>
    );
  }

  const wrapped = (
    <div onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: onClick ? "pointer" : "default", ...style }}>
      <AvatarFrame rarity={avatar.rarity} size={size} locked={locked} gradientId={gradId}>
        {renderer(size)}
      </AvatarFrame>
      {showName && (
        <span style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A", fontFamily: "'Outfit', sans-serif" }}>
          {avatar.name?.[lang] || avatar.name?.en || avatar.id}
        </span>
      )}
    </div>
  );

  return wrapped;
}

// ─── <AvatarPicker /> — grid UI for choosing an avatar ────────────────────
// Groups by rarity, shows lock state for unowned ones, calls onSelect(id).
const PICKER_CSS = `
  .cl-av-cell { transition: transform .18s ease, background .15s ease, box-shadow .18s ease; }
  .cl-av-cell:not(:disabled):hover {
    transform: translateY(-3px);
    background: #F5F9FF !important;
    box-shadow: 0 6px 16px rgba(35,131,226,0.12);
  }
  .cl-av-cell:not(:disabled):active { transform: translateY(-1px) scale(.97); }
  .cl-av-cell:disabled { cursor: default; }
  .cl-av-cell:disabled:hover { background: transparent; }
`;

export function AvatarPicker({
  currentId,
  unlockedIds = [],     // ids the user has unlocked beyond starters
  onSelect,
  lang = "en",
  isStudent = true,     // teachers only see starters; students see everything
  size = 64,
}) {
  const groups = ["common", "rare", "legendary"];
  // For teachers: only starter commons.
  const visibleAvatars = isStudent
    ? AVATARS
    : AVATARS.filter(a => a.rarity === "common" && a.starter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{PICKER_CSS}</style>
      {groups.map(tier => {
        const items = visibleAvatars.filter(a => a.rarity === tier);
        if (items.length === 0) return null;
        const rarity = RARITY[tier];
        return (
          <div key={tier}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: rarity.color,
              }}>{rarity.label[lang] || rarity.label.en}</span>
              <span style={{ fontSize: 11, color: "#9B9B9B", fontFamily: "'JetBrains Mono', monospace" }}>
                {items.filter(a => a.starter || unlockedIds.includes(a.id)).length} / {items.length}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${size + 30}px, 1fr))`,
              gap: 12,
            }}>
              {items.map(a => {
                const owned = a.starter || unlockedIds.includes(a.id);
                const selected = currentId === a.id;
                const hint = !owned ? describeUnlock(a.unlock, lang) : "";
                return (
                  <button
                    key={a.id}
                    className="cl-av-cell"
                    onClick={() => owned && onSelect && onSelect(a.id)}
                    disabled={!owned}
                    title={hint}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: 8,
                      background: selected ? "#E8F0FE" : "transparent",
                      border: `2px solid ${selected ? "#2383E2" : "transparent"}`,
                      borderRadius: 12,
                      cursor: owned ? "pointer" : "default",
                      fontFamily: "'Outfit', sans-serif",
                      transition: "all .15s ease",
                    }}
                  >
                    <Avatar id={a.id} size={size} locked={!owned} />
                    <span style={{
                      fontSize: 11, color: "#5F5E5A",
                      fontWeight: selected ? 600 : 500,
                      maxWidth: size + 16,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{a.name[lang] || a.name.en}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Avatar;
