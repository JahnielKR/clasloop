// ─── Eyebrow ─────────────────────────────────────────────────────────────────
// Small per-section announcement label ("01 · Generate") that gives each scene
// a distinct opening, instead of every section starting with the same centered
// h2. It's inline-flex, so it inherits the parent's text-align (centered heads
// center it; left-aligned heads left-align it) — that variety is the point.
import { MONO } from "../../../components/tokens";

export default function Eyebrow({ num, children }) {
  return (
    <span className="ph-eyebrow">
      {num != null && <span className="ph-eyebrow-num" style={{ fontFamily: MONO }}>{num}</span>}
      <span className="ph-eyebrow-line" aria-hidden="true" />
      <span className="ph-eyebrow-text">{children}</span>
    </span>
  );
}
