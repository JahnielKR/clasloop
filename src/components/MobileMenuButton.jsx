// Hamburger button rendered inline at the start of each page header in mobile.
// On desktop it returns null, so pages can drop it in unconditionally.
//
// The matchMedia listener lives here too so this component is self-contained.
// App.jsx re-exports `useIsMobile` from the same place to keep one source.
import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

// PR 28.17 — Portrait mobile detection for StudentJoin.
//
// The themed quiz UI is designed for landscape (wide question panel +
// 240px timer rail on the right). In portrait phones (<= 768px wide
// + taller than wide) the layout breaks: rail eats the screen, the
// answer grid stacks weirdly, the timer ring shrinks.
//
// Rather than building a portrait-specific layout (3-4hrs of theme
// re-work), we show a "rotate your phone" overlay. The threshold is
// the same 768px breakpoint we already use for mobile detection —
// tablets in portrait (e.g. iPad held vertically at 768x1024) are
// borderline but generally OK with the existing layout.
//
// Logic: portrait = mobile-width AND height > width. The height
// check matters because some small landscape phones (e.g. iPhone SE
// horizontal at 667x375) match the mobile media query but aren't
// portrait — they should pass through.
export function useIsPortraitMobile() {
  const compute = () => {
    if (typeof window === "undefined") return false;
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    const portrait = window.innerHeight > window.innerWidth;
    return narrow && portrait;
  };
  const [isPortraitMobile, setIsPortraitMobile] = useState(compute);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setIsPortraitMobile(compute());
    // Both resize and orientationchange — orientation events don't
    // always fire on every browser (esp. desktop devtools simulating
    // a rotate), but resize does.
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);
  return isPortraitMobile;
}

export default function MobileMenuButton({ onOpen }) {
  const isMobile = useIsMobile();
  if (!isMobile || !onOpen) return null;
  return (
    <button
      onClick={onOpen}
      aria-label="Open menu"
      style={{
        width: 40, height: 40, borderRadius: 10,
        background: "#FFFFFF", border: "1px solid #E8E8E4",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, padding: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="#191919" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </button>
  );
}
