// ─── AIIcon ──────────────────────────────────────────────────────────────
//
// Single 4-point star that replaces the ✨ emoji in CreateDeckEditor's
// AI buttons and headers. Reasons for replacing the emoji:
//   - Renders inconsistently across OS (chunky on Windows, oversized on
//     some Linux configs, sometimes color-glyph instead of monochrome)
//   - Doesn't inherit the parent text color, so it looks misaligned with
//     button labels in dark mode and on colored backgrounds
//   - SVG with currentColor adapts to any context automatically
//
// The 4-point star is the same family as the Notion/Linear AI icons but
// simpler — a single star instead of a cluster, which reads cleaner at
// the small sizes (14-16px) we use in buttons. Still recognizable as
// "AI" because the 4-point sparkle is a near-universal visual shorthand.
//
// Props:
//   size  number — px width/height. Default 14, matches button text size.
//   style object — extra inline styles, merged on top of defaults.
//
// Color: inherits from currentColor — no fill/stroke prop. Whatever
// color the parent text uses, this icon will match. That includes white
// on the black "Generate" button, accent on the AI panel header, etc.
export default function AIIcon({ size = 14, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        // -2px vertical alignment compensates for the visual center of
        // the star sitting slightly above the geometric center — without
        // this it sits a hair too high relative to text baseline in
        // inline-flex contexts.
        verticalAlign: "-2px",
        flexShrink: 0,
        ...style,
      }}
    >
      <path
        d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z"
        fill="currentColor"
      />
    </svg>
  );
}
