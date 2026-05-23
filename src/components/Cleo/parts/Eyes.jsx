// ─── Cleo — eyes ────────────────────────────────────────────────────────────
// The "open" variants (wide, surprised, sad, wink) are the ones index.jsx lets
// blink. All coordinates are in Cleo's 100×100 viewBox (eyes sit at y≈56).

import { OUTLINE } from "./constants";

export function Eyes({ variant }) {
  switch (variant) {
    case "arc": // happy closed eyes ^^ (cheer)
      return (
        <>
          <path d="M34 57 Q40 50 46 57" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
          <path d="M54 57 Q60 50 66 57" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "narrow": // unamused squint (annoyed)
      return (
        <>
          <line x1="35" y1="54.5" x2="45.5" y2="54.5" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="54.5" y1="54.5" x2="65" y2="54.5" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="40" cy="57.5" rx="4.6" ry="2.6" fill={OUTLINE} />
          <ellipse cx="60" cy="57.5" rx="4.6" ry="2.6" fill={OUTLINE} />
        </>
      );
    case "sad": // lower-lidded, glossy (sad)
      return (
        <>
          <ellipse cx="40" cy="58" rx="5" ry="6" fill={OUTLINE} />
          <ellipse cx="60" cy="58" rx="5" ry="6" fill={OUTLINE} />
          <path d="M34.5 54 Q40 52 45 55" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M55 55 Q60 52 65.5 54" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="42" cy="55.5" r="2.2" fill="#fff" />
          <circle cx="62" cy="55.5" r="2.2" fill="#fff" />
        </>
      );
    case "surprised": // wide round (surprised)
      return (
        <>
          <circle cx="40" cy="56" r="6.2" fill={OUTLINE} />
          <circle cx="60" cy="56" r="6.2" fill={OUTLINE} />
          <circle cx="42.2" cy="53.5" r="2.1" fill="#fff" />
          <circle cx="62.2" cy="53.5" r="2.1" fill="#fff" />
        </>
      );
    case "wink": // one eye winking (encouraging)
      return (
        <>
          <ellipse cx="40" cy="56" rx="5.4" ry="7" fill={OUTLINE} />
          <circle cx="42" cy="53" r="2" fill="#fff" />
          <circle cx="38.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
          <path d="M54 58 Q60 52 66 58" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "wide": // big bright eyes (happy / thinking) — the original look
    default:
      return (
        <>
          <ellipse cx="40" cy="56" rx="5.4" ry="7" fill={OUTLINE} />
          <ellipse cx="60" cy="56" rx="5.4" ry="7" fill={OUTLINE} />
          <circle cx="42" cy="53" r="2" fill="#fff" />
          <circle cx="62" cy="53" r="2" fill="#fff" />
          <circle cx="38.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
          <circle cx="58.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
        </>
      );
  }
}
