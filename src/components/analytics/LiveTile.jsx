// src/components/analytics/LiveTile.jsx
//
// F6 Analytics Studio: tile genérico para métricas (numéricas) con
// indicador opcional de "live" (punto pulsante) cuando recibe updates
// realtime. Usado por PulseStrip (Director) y LiveCommandCenter.

import { useEffect, useRef, useState } from "react";

const cssId = "live-tile-css";

function ensureCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById(cssId)) return;
  const el = document.createElement("style");
  el.id = cssId;
  el.textContent = `
    @keyframes liveTilePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.5); }
      50%      { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); }
    }
    .live-tile-dot { animation: liveTilePulse 1.6s infinite; }
    @keyframes liveTileTick {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .live-tile-tick { animation: liveTileTick .32s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .live-tile-dot, .live-tile-tick { animation: none; }
    }
  `;
  document.head.appendChild(el);
}

export default function LiveTile({
  label,
  value,
  unit = "",
  tone = "default", // "default" | "good" | "warn" | "bad" | "live"
  live = false,
  onClick = null,
}) {
  ensureCss();
  const prev = useRef(value);
  const [tick, setTick] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      setTick(true);
      const id = setTimeout(() => setTick(false), 320);
      prev.current = value;
      return () => clearTimeout(id);
    }
    return undefined;
  }, [value]);

  const toneColor = {
    default: "#1f2937",
    good: "#15803d",
    warn: "#a16207",
    bad: "#b91c1c",
    live: "#7c3aed",
  }[tone] || "#1f2937";

  return (
    <div
      onClick={onClick || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        textAlign: "center",
      }}
    >
      {live && (
        <span
          className="live-tile-dot"
          aria-label="en vivo"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#7c3aed",
          }}
        />
      )}
      <div
        className={tick ? "live-tile-tick" : ""}
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: toneColor,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          lineHeight: 1.1,
          display: "inline-flex",
          gap: 4,
          alignItems: "baseline",
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: "#71717a", marginTop: 6 }}>{label}</div>
    </div>
  );
}
