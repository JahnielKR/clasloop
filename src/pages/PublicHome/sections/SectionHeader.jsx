// ─── SectionHeader ───────────────────────────────────────────────────────────
// The shared opening of every landing scene: Eyebrow ("01 · Generate") + a
// display h2 + a supporting sub. Each section used to hand-roll these three
// elements with subtly different sizes/margins (52px here, 22px sub there, 56 vs
// 70 gaps), which made the page "rhyme" only loosely. Centralizing the type +
// rhythm here makes the whole scroll feel composed and consistent.
//
// Alignment + the scroll-reveal still belong to the PARENT (it owns the
// ref/className and decides centered vs left, which directional entrance, etc.),
// so this only standardizes the typography — the intentional per-section
// entrance variety is preserved.
import { C } from "../../../components/tokens";
import Eyebrow from "./Eyebrow";

export default function SectionHeader({
  num,
  eyebrow,
  title,
  sub,
  subGap = 56,
  subMaxWidth = 760,
  align = "center",
}) {
  return (
    <>
      <Eyebrow num={num}>{eyebrow}</Eyebrow>
      <h2
        className="ph-section-h2"
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: C.text,
          margin: "0 0 18px",
          letterSpacing: "-0.02em",
          lineHeight: 1.12,
        }}
      >
        {title}
      </h2>
      {sub != null && (
        <p
          className="ph-section-sub"
          style={{
            fontSize: 21,
            color: C.textSecondary,
            lineHeight: 1.55,
            margin: align === "center" ? `0 auto ${subGap}px` : `0 0 ${subGap}px`,
            maxWidth: subMaxWidth,
          }}
        >
          {sub}
        </p>
      )}
    </>
  );
}
