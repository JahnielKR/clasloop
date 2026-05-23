import { useRef } from "react";
import { useScrollDocProgress } from "../landing-motion";

// ─── JourneyRail ─────────────────────────────────────────────────────────────
// A slim fixed progress spine on the left (desktop ≥1100px only — CSS-gated)
// that makes the visitor feel walked THROUGH a story: Create → Print → Go live
// → Measure. The active dot is driven by the scroll-spy (useActiveSection in
// index.jsx, passed as `activeSection`); the connecting line fills with overall
// page progress (useScrollDocProgress, written imperatively — no per-frame
// re-render). Clicking a stop smooth-scrolls to its section. No mascot here —
// the rail is deliberately clean (Cleo stays punctual, in the code dialog).

const STOPS = [
  { id: "generate", labelKey: "railCreate" },
  { id: "print", labelKey: "railPrint" },
  { id: "live", labelKey: "railLive" },
  { id: "insights", labelKey: "railMeasure" },
];

// Map any in-view section to the rail stop that should read as active — the
// "supporting" sections (types/why/start) hold the nearest preceding stop so
// progress never visually rewinds.
const SECTION_TO_STOP = { generate: 0, print: 1, live: 2, types: 2, insights: 3, why: 3, start: 3 };

const STOP_GAP = 64; // px between dots

export default function JourneyRail({ t, activeSection, onNavigate }) {
  const fillRef = useRef(null);
  useScrollDocProgress((p) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(3)})`;
  });

  const activeStop = activeSection == null ? -1 : (SECTION_TO_STOP[activeSection] ?? -1);
  const trackH = STOP_GAP * (STOPS.length - 1);

  return (
    <nav className="ph-rail" aria-label="Section progress">
      <div className="ph-rail-track" style={{ height: trackH }}>
        <div ref={fillRef} className="ph-rail-fill" style={{ height: trackH }} />
        {STOPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="ph-rail-stop"
            data-active={i === activeStop}
            aria-current={i === activeStop ? "true" : undefined}
            onClick={() => onNavigate?.(s.id)}
            style={{ position: "absolute", top: i * STOP_GAP, left: -4.5, transform: "translateY(-50%)" }}
          >
            <span className="ph-rail-dot" aria-hidden="true" />
            <span className="ph-rail-label">{t[s.labelKey]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
