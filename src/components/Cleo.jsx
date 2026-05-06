// ─── Cleo — Clasloop's official mascot ─────────────────────────────────────
// Cleo is drawn as a COMPLETE character. She is meant to be positioned so
// her right edge sits at the card's left edge: the card (which renders
// with a higher z-index) naturally covers her right half. The visible left
// half shows her face, her body, and her three RIGHT-side legs reaching
// over the card's left border with curled "hands" gripping it.
//
// Key idea: we don't crop Cleo by drawing only half of her. We draw her
// whole, and let the card's solid background occlude what should be hidden.
// That way her body is real, her grip is real, and the interaction reads.
//
// Visible from the user's perspective (left half of Cleo):
//   - Two big eyes looking RIGHT (toward the card content / code input)
//   - Two cheek blushes
//   - Golden teardrop crown on top
//   - Three left-side legs hanging in the air (her "free" side)
//   - Three right-side legs reaching over the card edge with grip-hands
//
// Hidden by the card (right half of Cleo):
//   - Her right ear / right side of body
//   - The continuation of the gripping legs as they go behind the card
//
// Usage:
//   <Cleo />              // default 160px wide (full body)
//   <Cleo size={140} />   // any size — height scales proportionally
//
// ViewBox is 160×160 (full square frame fits the round body + legs).

export default function Cleo({ size = 160, className = "", style = {} }) {
  const height = size; // 1:1 viewBox
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-label="Cleo"
    >
      {/* Origin centered: Cleo's body is at (80, 80). Right edge of viewBox
          (x=160) = the card's left edge when positioned correctly. */}
      <g transform="translate(80, 80)">

        {/* ─── LEFT side legs (free side, hanging in air) ─── */}
        <path d="M -34 -16 Q -56 -18 -64 -8" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -34 -16 Q -56 -18 -64 -8" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-64" cy="-8" r="4" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        <path d="M -38 4 Q -62 8 -68 22" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -38 4 Q -62 8 -68 22" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-68" cy="22" r="4" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        <path d="M -34 22 Q -54 36 -52 50" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -34 22 Q -54 36 -52 50" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-52" cy="50" r="4" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        {/* ─── RIGHT side legs reaching over the card edge ─── */}
        {/* Each leg extends out to the right and curls into a "hand" that
            hooks over the card's left border. The card edge is at x=80
            (right side of body) so legs reach beyond that. */}

        {/* Top right leg — reaches up and right, curls around edge */}
        <path d="M 34 -16 Q 60 -22 72 -8 Q 76 -4 74 4" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M 34 -16 Q 60 -22 72 -8 Q 76 -4 74 4" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        {/* Hand curling right (around the vertical edge) */}
        <path d="M 74 4 Q 78 8 74 12 Q 70 10 72 4 Z" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" strokeLinejoin="round" />

        {/* Middle right leg */}
        <path d="M 38 4 Q 64 4 76 14 Q 80 18 76 24" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M 38 4 Q 64 4 76 14 Q 80 18 76 24" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 76 24 Q 80 28 76 32 Q 72 30 74 24 Z" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" strokeLinejoin="round" />

        {/* Bottom right leg */}
        <path d="M 34 22 Q 58 30 70 36 Q 76 40 72 46" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M 34 22 Q 58 30 70 36 Q 76 40 72 46" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 72 46 Q 76 50 72 54 Q 68 52 70 46 Z" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" strokeLinejoin="round" />

        {/* ─── Body — full round, centered ─── */}
        <ellipse cx="0" cy="0" rx="44" ry="40" fill="#C8E4F5" stroke="#2A3A5E" strokeWidth="2.8" />

        {/* Soft highlight (upper-left) */}
        <ellipse cx="-14" cy="-18" rx="14" ry="10" fill="#E5F1F9" opacity="0.6" />

        {/* ─── Golden crown teardrop ─── */}
        <line x1="0" y1="-40" x2="0" y2="-32" stroke="#FFC832" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(0, -40)">
          <path d="M 0 0 Q -8 -8 -4 -16 Q 4 -20 8 -12 Q 8 -2 0 0 Z" fill="#FFC832" stroke="#2A3A5E" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="2" cy="-12" r="2" fill="#2A3A5E" opacity="0.3" />
        </g>

        {/* Cheek blushes */}
        <ellipse cx="-26" cy="12" rx="8" ry="5" fill="#FFB8C8" opacity="0.85" />
        <ellipse cx="26" cy="12" rx="8" ry="5" fill="#FFB8C8" opacity="0.85" />

        {/* Secondary golden dot-eyes scattered on forehead */}
        <circle cx="-10" cy="-20" r="1.8" fill="#FFC832" />
        <circle cx="0" cy="-24" r="1.8" fill="#FFC832" />
        <circle cx="10" cy="-20" r="1.8" fill="#FFC832" />
        <circle cx="-32" cy="0" r="1.6" fill="#FFC832" />
        <circle cx="32" cy="0" r="1.6" fill="#FFC832" />

        {/* ─── Big eyes — both pupils PULLED TO THE RIGHT (looking at the
             card content, like she's curious about what you're typing) ─── */}
        <ellipse cx="-13" cy="6" rx="8" ry="11" fill="#1F2A4A" />
        <ellipse cx="13" cy="6" rx="8" ry="11" fill="#1F2A4A" />
        {/* Highlights pulled to the RIGHT side of each eye = looking right */}
        <ellipse cx="-9" cy="2" rx="3" ry="3.5" fill="#fff" />
        <ellipse cx="17" cy="2" rx="3" ry="3.5" fill="#fff" />
        {/* Tiny shine */}
        <circle cx="-15" cy="11" r="1" fill="#fff" />
        <circle cx="11" cy="11" r="1" fill="#fff" />

        {/* "w" mouth — signature, centered */}
        <path d="M -5 24 Q -2 28 0 26 Q 2 28 5 24" fill="none" stroke="#2A3A5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
