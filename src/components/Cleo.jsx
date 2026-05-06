// ─── Cleo — Clasloop's official mascot ─────────────────────────────────────
// A small spider character peeking out from the LEFT side of a card. She is
// drawn in profile, looking RIGHT (toward the card content). Her right half
// is intentionally clipped by the host (the card's left edge) — only her
// left half + her three legs reaching out are visible.
//
// Visible elements (left side of her body):
//   - Half of head with one big eye looking right
//   - One cheek blush
//   - Three little legs reaching out to the left
//   - A small golden teardrop on top, slightly tilted
//   - A few golden dot-eyes scattered on the visible forehead
//   - A tiny "w" smile (only the left half visible)
//
// The component is drawn so that x=0 in the viewBox coincides with the
// card's left edge. Everything to the LEFT of x=0 is what the user sees;
// the right half of her body lives at x>0 and gets occluded naturally
// when this component is positioned with its right edge AT the card's
// left edge.
//
// Usage:
//   <Cleo />              // default 100px wide (only the visible half)
//   <Cleo size={120} />   // any size — height scales proportionally
//
// ViewBox is 100×140 (100px wide of visible Cleo, 140px tall for the head
// + crown + legs spread). Width-driven: `size` controls width, height
// scales by 140/100 = 1.4x.

export default function Cleo({ size = 100, className = "", style = {} }) {
  const height = (size * 140) / 100;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 140"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-label="Cleo"
    >
      {/* Origin at right edge, vertically centered. The visible half of
          Cleo lives in x: 0..100. Her body center is conceptually at x=100
          (the card edge), so we translate everything to (100, 70). */}
      <g transform="translate(100, 70)">

        {/* ─── Three legs reaching out to the left ─── */}
        {/* Leg 1 — top */}
        <path d="M -10 -28 Q -38 -36 -50 -22" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -10 -28 Q -38 -36 -50 -22" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-50" cy="-22" r="4" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        {/* Leg 2 — middle */}
        <path d="M -14 -8 Q -42 -10 -54 4" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -14 -8 Q -42 -10 -54 4" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-54" cy="4" r="4" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        {/* Leg 3 — bottom */}
        <path d="M -14 14 Q -42 18 -50 32" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -14 14 Q -42 18 -50 32" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-50" cy="32" r="4" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        {/* ─── Body — full ellipse, but right half (x>0) lies outside
            the visible viewBox (the card edge is the host clip) ─── */}
        <ellipse cx="0" cy="0" rx="40" ry="38" fill="#C8E4F5" stroke="#2A3A5E" strokeWidth="2.8" />

        {/* Soft highlight on the visible (left) cheek */}
        <ellipse cx="-22" cy="-18" rx="10" ry="6" fill="#E5F1F9" opacity="0.6" />

        {/* ─── Golden crown — small tilted teardrop on top of head ─── */}
        <line x1="-8" y1="-42" x2="-6" y2="-36" stroke="#FFC832" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(-6, -42) rotate(-15)">
          <path d="M 0 0 Q -8 -8 -4 -16 Q 4 -20 8 -12 Q 8 -2 0 0 Z" fill="#FFC832" stroke="#2A3A5E" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="2" cy="-12" r="2" fill="#2A3A5E" opacity="0.3" />
        </g>

        {/* Cheek blush — only the left one visible */}
        <ellipse cx="-26" cy="14" rx="7" ry="4" fill="#FFB8C8" opacity="0.85" />

        {/* Secondary golden dot-eyes scattered on visible forehead */}
        <circle cx="-20" cy="-22" r="1.6" fill="#FFC832" />
        <circle cx="-30" cy="-12" r="1.6" fill="#FFC832" />
        <circle cx="-12" cy="-26" r="1.6" fill="#FFC832" />

        {/* ─── Big eye — one visible, looking RIGHT (toward the card) ─── */}
        <ellipse cx="-12" cy="6" rx="9" ry="12" fill="#1F2A4A" />
        {/* Pupil/highlight pulled to the right edge of the eye to suggest
            she's peeking toward the card content */}
        <ellipse cx="-8" cy="2" rx="3" ry="3.5" fill="#fff" />
        <circle cx="-14" cy="11" r="1" fill="#fff" />

        {/* ─── Mouth — left half of "w", visible just below the eye ─── */}
        <path d="M -16 26 Q -14 29 -12 27" fill="none" stroke="#2A3A5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
