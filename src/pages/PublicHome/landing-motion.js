// ─── Landing motion hooks ───────────────────────────────────────────────────
// Scroll-driven motion for the landing (parallax, reactive header, count-ups,
// scrollytelling, pointer tilt). Every hook is a no-op / end-state under
// `prefers-reduced-motion` and SSR-safe, so the page stays fully static and
// readable for users who opt out — matching the CSS guard in landing-css.js.
//
// All scroll/pointer listeners are passive and rAF-throttled.
import { useState, useEffect, useRef } from "react";

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Live window.scrollY (rAF-throttled, passive). Stays 0 under reduced-motion so
// any parallax derived from it collapses to no movement.
export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (prefersReduced() || typeof window === "undefined") return undefined;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setY(window.scrollY || window.pageYOffset || 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

// Boolean that flips when the page is scrolled past `threshold` px. Only
// re-renders on the crossing (not every frame) — ideal for a reactive header.
export function useScrolledPast(threshold = 8) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let raf = 0;
    const check = () => {
      raf = 0;
      setPast((window.scrollY || window.pageYOffset || 0) > threshold);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return past;
}

// 0→1 progress as `ref` travels through the viewport: 0 when its top reaches the
// bottom of the viewport, 1 once its bottom clears the top. For scroll-linked
// reveals / scrollytelling. Returns 1 under reduced-motion (end state).
export function useElementProgress(ref) {
  const [p, setP] = useState(() => (prefersReduced() ? 1 : 0));
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReduced() || typeof window === "undefined") return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const total = vh + r.height;
      const passed = vh - r.top;
      setP(total > 0 ? Math.min(1, Math.max(0, passed / total)) : 0);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

// Eased 0→1 tween that runs ONCE when `active` flips true (count-ups, bar
// fills). Jumps straight to 1 under reduced-motion.
export function useTween(active, duration = 900) {
  const [v, setV] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return undefined;
    started.current = true;
    if (prefersReduced()) { setV(1); return undefined; }
    let raf = 0;
    const t0 = (typeof performance !== "undefined" ? performance : Date).now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      setV(1 - Math.pow(1 - t, 3)); // easeOutCubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [active, duration]);
  return v;
}

// Pointer tilt — returns a `transform` string to spread onto the element the
// `ref` points at. Empty string (no tilt) on touch / coarse pointers and under
// reduced-motion.
export function useTilt(ref, max = 8) {
  const [transform, setTransform] = useState("");
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReduced() || typeof window === "undefined") return undefined;
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) return undefined;
    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = node.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setTransform(
          `perspective(900px) rotateY(${(px * max).toFixed(2)}deg) rotateX(${(-py * max).toFixed(2)}deg)`
        );
      });
    };
    const onLeave = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      setTransform("");
    };
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    return () => {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, max]);
  return transform;
}

// Scroll-spy: returns the id of the section currently crossing a thin band in
// the upper-middle of the viewport — drives the Cleo guide narration and the
// nav highlight. Returns null while above the first section (hero). Plain state
// (not motion), so it's fine under reduced-motion; IntersectionObserver-based,
// no-op when IO is unavailable. Pass `ids` in document order (topmost wins).
export function useActiveSection(ids) {
  const [active, setActive] = useState(null);
  // Join to a stable string so an inline-array `ids` doesn't re-run the effect
  // every render.
  const key = Array.isArray(ids) ? ids.join(",") : "";
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return undefined;
    const list = key ? key.split(",") : [];
    const nodes = list.map((id) => document.getElementById(id)).filter(Boolean);
    if (nodes.length === 0) return undefined;
    const visible = new Set();
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        const next = list.find((id) => visible.has(id)) || null;
        setActive((prev) => (prev === next ? prev : next));
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [key]);
  return active;
}
