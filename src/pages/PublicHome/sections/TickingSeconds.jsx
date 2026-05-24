import { useEffect, useRef, useState } from "react";

// ─── TickingSeconds ──────────────────────────────────────────────────────────
// The "30" in the hero headline, played as a speed game: it RESTS on the real
// number (30 — the honest max for ~20 questions) and every few seconds quickly
// "races" down 30 → 20 → 15 → 10 and snaps back to 30 — suggesting "fast, even
// faster than you'd think" WITHOUT claiming a literal lower time (the anchor it
// returns to is the honest 30). Each value FLIPS in on a 3D split-flap (see
// .ph-secs-flip in landing-css.js).
//
// The displayed number is decorative + aria-hidden; the real, stable text
// ("…in 30 seconds.") lives on the <h1>'s aria-label, so screen readers always
// hear the honest sentence. Under prefers-reduced-motion it holds on the anchor.
//
// The number + unit are parsed off the localized highlight ("30 seconds." /
// "30 segundos." / "30초.") — number first in every locale — so this needs no new
// i18n and the run-down stays proportional to whatever the base is.

export default function TickingSeconds({ highlight }) {
  const match = /^(\d+)(.*)$/.exec(highlight || "");
  const base = match ? parseInt(match[1], 10) : 30;
  const rest = match ? match[2] : "";
  // Anchor first, then the proportional run-down (30 → 20 → 15 → 10).
  const seq = [base, Math.round((base * 2) / 3), Math.round(base / 2), Math.round(base / 3)];

  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setIdx(0); return undefined; }

    // Scripted rhythm: a long rest on the anchor, a quick race down, then reset.
    // Total ≈ 4.4s so it breathes in time with the machine's verify cadence.
    const holds = [2800, 450, 450, 700];
    let timeoutId = 0;
    const step = () => {
      idxRef.current = (idxRef.current + 1) % seq.length;
      setIdx(idxRef.current);
      timeoutId = window.setTimeout(step, holds[idxRef.current]);
    };
    timeoutId = window.setTimeout(step, holds[0]);
    return () => window.clearTimeout(timeoutId);
    // seq derives from `highlight`; re-arm only when the copy/locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  // Each value flips in (3D split-flap) when it changes — re-mounted via key={idx}.
  return (
    <>
      <span className="ph-secs-fixed" aria-hidden="true">
        <span className="ph-secs-val ph-secs-flip" key={idx}>{seq[idx]}</span>
      </span>
      {rest}
    </>
  );
}
