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
