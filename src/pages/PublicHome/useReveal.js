// ─── useReveal ─────────────────────────────────────────────────────────────
// Tiny scroll-reveal hook for the landing. Returns [ref, isVisible].
//
//   const [ref, visible] = useReveal();
//   <div ref={ref} className={`ph-reveal ${visible ? "is-visible" : ""}`}>…</div>
//
// Uses a single IntersectionObserver that disconnects after the first reveal
// (the animation is one-shot — we never hide content again on scroll-up).
//
// Accessibility: if the user prefers reduced motion — or IntersectionObserver
// isn't available (old WebView, SSR) — we report visible immediately so the
// CSS reveal classes resolve to their final, fully-visible state and nothing
// stays hidden. The matching CSS also no-ops the transitions under
// prefers-reduced-motion (see landing-css.js).
import { useEffect, useRef, useState } from "react";

export function useReveal({ threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isVisible];
}
