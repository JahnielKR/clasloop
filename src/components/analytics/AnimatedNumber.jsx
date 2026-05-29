// src/components/analytics/AnimatedNumber.jsx
//
// F9 Analytics Studio: número que cuenta hacia su valor al montar / cambiar.
// Se pasa como el `value` (ReactNode) de StatCardWithSparkline — no hace
// falta tocar ese componente. Respeta prefers-reduced-motion (muestra el
// valor final directo) y degrada con gracia si no hay requestAnimationFrame
// (SSR / tests).
//
// Props:
//   value: number  — el target (número crudo, ej. 78, 11400).
//   format: (n) => string  — formatea el número actual (ej. formatPercent).
//   duration?: ms (default 650)

import { useEffect, useRef, useState } from "react";
import { sampleCountUp } from "../../lib/analytics/count-up";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AnimatedNumber({ value, format = (n) => String(n), duration = 650 }) {
  const target = Number(value);
  // null/undefined NO son "finite" para nosotros aunque Number(null)===0:
  // así un KPI vacío renderiza format(null) → "—" (no "0%"), preservando
  // el empty state. (El guard va acá, no como early-return: los hooks de
  // abajo deben llamarse siempre — rules-of-hooks.)
  const finite = value != null && Number.isFinite(target);
  const prevRef = useRef(finite ? target : 0);
  const [display, setDisplay] = useState(finite ? target : 0);

  useEffect(() => {
    if (!finite) return undefined;
    const from = prevRef.current;
    prevRef.current = target;

    if (
      prefersReducedMotion() ||
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      setDisplay(target);
      return undefined;
    }
    if (from === target) {
      setDisplay(target);
      return undefined;
    }

    let raf = 0;
    let start = null;
    const tick = (ts) => {
      if (start == null) start = ts;
      const elapsed = ts - start;
      const v = sampleCountUp(from, target, elapsed, duration);
      setDisplay(v);
      if (elapsed < duration) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, finite, duration]);

  if (!finite) return <>{format(value)}</>;
  return <>{format(display)}</>;
}
