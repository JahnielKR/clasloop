// ─── Cleo — Clasloop's official mascot ─────────────────────────────────────
// A spider character that hangs from her own gold silk thread. She has two
// big eyes and five small golden dot-eyes scattered above (the "secondary"
// eyes that catch what the main eyes miss — like our spaced-repetition
// catches what your brain misses).
//
// This component is intentionally separate from the Avatars system. Cleo
// is brand identity, not an avatar option. A 1:1 simplified version for
// the avatar catalog will live elsewhere when we make a "legendary spinoff".
//
// Usage:
//   <Cleo />              // default 280px
//   <Cleo size={180} />   // any size, scales proportionally
//
// Visual viewBox is 220×320 (her natural canvas including hanging thread
// + extended legs). The SVG scales uniformly to whatever `size` prop you
// pass — `size` controls the WIDTH; height scales proportionally.

export default function Cleo({ size = 280, className = "", style = {} }) {
  // viewBox is 220 wide × 320 tall (preserves the iconic vertical pose:
  // thread + body + legs hanging down).
  const height = (size * 320) / 220;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 220 320"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", ...style }}
      aria-label="Cleo"
    >
      {/* Origin shifted so x=0 means the center, y=0 means top of thread */}
      <g transform="translate(110, 0)">
        {/* Silk thread coming from top */}
        <line x1="0" y1="0" x2="0" y2="80" stroke="#FFC832" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="2" r="3" fill="none" stroke="#FFC832" strokeWidth="2" />

        {/* Tiny gold tuft / silk anchor */}
        <g transform="translate(0, 80)">
          <path d="M 0 0 Q -8 -8 -4 -16 Q 4 -20 8 -12 Q 8 -2 0 0 Z" fill="#FFC832" stroke="#2A3A5E" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="2" cy="-12" r="2" fill="#2A3A5E" opacity="0.3" />
        </g>

        {/* LEFT legs — soft blue glow stroke + navy outline + dark blue tip */}
        <path d="M -28 110 Q -55 100 -68 122 Q -72 132 -64 138" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -28 110 Q -55 100 -68 122 Q -72 132 -64 138" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-64" cy="138" r="5" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        <path d="M -32 122 Q -65 132 -78 158 Q -80 168 -72 172" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -32 122 Q -65 132 -78 158 Q -80 168 -72 172" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-72" cy="172" r="5" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        <path d="M -28 138 Q -55 168 -52 196 Q -50 206 -42 206" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M -28 138 Q -55 168 -52 196 Q -50 206 -42 206" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-42" cy="206" r="5" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        {/* RIGHT legs — mirror */}
        <path d="M 28 110 Q 55 100 68 122 Q 72 132 64 138" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M 28 110 Q 55 100 68 122 Q 72 132 64 138" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="64" cy="138" r="5" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        <path d="M 32 122 Q 65 132 78 158 Q 80 168 72 172" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M 32 122 Q 65 132 78 158 Q 80 168 72 172" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="72" cy="172" r="5" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        <path d="M 28 138 Q 55 168 52 196 Q 50 206 42 206" fill="none" stroke="#B8D8EE" strokeWidth="5" strokeLinecap="round" />
        <path d="M 28 138 Q 55 168 52 196 Q 50 206 42 206" fill="none" stroke="#2A3A5E" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="42" cy="206" r="5" fill="#5BA8D9" stroke="#2A3A5E" strokeWidth="2" />

        {/* Body — single round blob */}
        <ellipse cx="0" cy="140" rx="58" ry="54" fill="#C8E4F5" stroke="#2A3A5E" strokeWidth="2.8" />

        {/* Soft belly highlight */}
        <ellipse cx="-18" cy="118" rx="20" ry="14" fill="#E5F1F9" opacity="0.6" />

        {/* Cheek blush — flat coral */}
        <ellipse cx="-32" cy="152" rx="10" ry="6" fill="#FFB8C8" opacity="0.85" />
        <ellipse cx="32" cy="152" rx="10" ry="6" fill="#FFB8C8" opacity="0.85" />

        {/* Secondary "eyes" — golden dot eyes scattered above big eyes */}
        <circle cx="-14" cy="115" r="2.2" fill="#FFC832" />
        <circle cx="0" cy="111" r="2.2" fill="#FFC832" />
        <circle cx="14" cy="115" r="2.2" fill="#FFC832" />
        <circle cx="-44" cy="138" r="2" fill="#FFC832" />
        <circle cx="44" cy="138" r="2" fill="#FFC832" />

        {/* Big eyes — oval, lower face, navy with white highlight */}
        <ellipse cx="-18" cy="148" rx="10" ry="13" fill="#1F2A4A" />
        <ellipse cx="18" cy="148" rx="10" ry="13" fill="#1F2A4A" />
        {/* Upper-left highlight */}
        <ellipse cx="-21" cy="142" rx="3.5" ry="4.5" fill="#fff" />
        <ellipse cx="15" cy="142" rx="3.5" ry="4.5" fill="#fff" />
        {/* Tiny lower-right shine */}
        <circle cx="-15" cy="154" r="1.2" fill="#fff" />
        <circle cx="21" cy="154" r="1.2" fill="#fff" />

        {/* Tiny "w" mouth */}
        <path d="M -4 168 Q -2 171 0 169 Q 2 171 4 168" fill="none" stroke="#2A3A5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
