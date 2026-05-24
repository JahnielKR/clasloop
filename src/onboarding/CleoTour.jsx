// ─── CleoTour ────────────────────────────────────────────────────────────────
// The renderer for a page's first-visit guided tour. Cleo offers to walk the
// teacher through the page; on accept she steps through it, spotlighting real
// buttons (hybrid: anchored highlight when a step targets a `data-tour` element,
// a centered card otherwise).
//
//   <CleoTour tourId="home" lang={lang} userId={profile?.id}
//             enabled={profile?.role === "teacher"} />
//
// Copy comes from i18n "tours" namespace; geometry/anchors from ./tours.js.
// Persistence + the offer/step state machine live in ./useFirstVisitTour.js.
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Cleo from "../components/Cleo";
import Button from "../components/ui/Button";
import { C } from "../components/tokens";
import { useIsMobile } from "../components/MobileMenuButton";
import { useT } from "../i18n";
import { getTour } from "./tours";
import { useFirstVisitTour } from "./useFirstVisitTour";
import { useSetTourActive } from "./TourContext";

const BUBBLE_W = 360;
const GAP = 12;          // space between the spotlight and the bubble
const PAD = 6;           // breathing room around the highlighted element

const css = `
  @keyframes ct-rise { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes ct-bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-4px) } }
  .ct-card { animation: ct-rise .28s cubic-bezier(.16,1,.3,1) both }
  .ct-cleo { animation: ct-bob 3s ease-in-out infinite }
  @media (prefers-reduced-motion: reduce) {
    .ct-card, .ct-cleo { animation: none !important }
  }
`;

// Where the step bubble sits. Centered when there's no anchored rect; otherwise
// below (or flipped above) the highlighted element, clamped to the viewport.
function bubblePosition(rect, placement, isMobile) {
  if (isMobile) {
    return { left: 12, right: 12, bottom: 12, maxWidth: "none" };
  }
  if (!rect) {
    return { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: BUBBLE_W };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - BUBBLE_W / 2, vw - BUBBLE_W - 16));
  const wantTop = placement === "top";
  const spaceBelow = vh - (rect.top + rect.height);
  // Flip to top if "bottom" won't fit (~200px needed), or if explicitly asked.
  const placeTop = wantTop || spaceBelow < 220;
  if (placeTop) {
    return { left, top: Math.max(16, rect.top - GAP), transform: "translateY(-100%)", width: BUBBLE_W };
  }
  return { left, top: rect.top + rect.height + GAP, width: BUBBLE_W };
}

export default function CleoTour({ tourId, lang = "en", userId, enabled = true, onStepChange, autoStart = false, force = false, onComplete, onSkip }) {
  const t = useT("tours", lang);
  const isMobile = useIsMobile();
  const tour = getTour(tourId);
  // Stable ref so the measurement effect's deps don't churn every render.
  const steps = useMemo(() => tour?.steps || [], [tour]);
  const total = steps.length;

  const reduced = useReducedMotion();

  const { phase, index, accept, decline, close, next, back } =
    useFirstVisitTour({ tourId, total, enabled, userId, autoStart, force });

  // Let the host page react when the running step changes — e.g. the deck
  // editor switches to the right tab so the step's anchor is on screen (the
  // overlay is modal, so the user can't navigate there themselves). Kept in a
  // ref so an inline callback doesn't churn the effect.
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;
  useEffect(() => {
    if (phase === "running") onStepChangeRef.current?.(index, steps[index]);
  }, [phase, index, steps]);

  // Report when this tour is on screen so the floating "Ask Cleo" FAB hides —
  // there should only ever be one Cleo. The offer emerges from / retracts to the
  // bottom-right corner (where the FAB lives) and the FAB glides back when done,
  // so it reads as the SAME Cleo coming out to talk and returning home.
  const setTourActive = useSetTourActive();
  useEffect(() => {
    if (!setTourActive) return undefined;
    setTourActive(tourId, phase === "offer" || phase === "running");
    return () => setTourActive(tourId, false);
  }, [setTourActive, tourId, phase]);

  // Declining flips `show` off; the offer's motion.div retracts into the corner
  // and onExitComplete then calls the real decline() (mark seen + idle). Reset
  // when a fresh offer appears so a later re-offer animates in again.
  const [show, setShow] = useState(true);
  useEffect(() => { if (phase === "offer") setShow(true); }, [phase]);
  const handleDecline = useCallback(() => setShow(false), []);

  // ── Anchor measurement ────────────────────────────────────────────────────
  const [rect, setRect] = useState(null);
  const scrolledForStep = useRef(-1);

  useLayoutEffect(() => {
    if (phase !== "running") { setRect(null); return undefined; }
    const step = steps[index];
    if (!step?.anchor) { setRect(null); return undefined; }

    let raf = 0;
    let tries = 0;
    let settle = 0;
    let last = null;
    const read = (doScroll) => {
      const el = document.querySelector(`[data-tour="${step.anchor}"]`);
      if (el) {
        if (doScroll && scrolledForStep.current !== index) {
          scrolledForStep.current = index;
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
        }
        const r = el.getBoundingClientRect();
        if (!last || last.top !== r.top || last.left !== r.left || last.width !== r.width || last.height !== r.height) {
          last = { top: r.top, left: r.left, width: r.width, height: r.height };
          setRect(last);
        }
        // Keep re-measuring for a short window so the box settles ONTO the element
        // after any layout shift the step triggers. The big one: the deck editor
        // switches tabs (via onStepChange, a useEffect that runs AFTER this layout
        // effect) to reveal the AI button, which moves it. The box has a move
        // transition, so following it reads as a glide, not a jump.
        if (settle++ < 30) raf = requestAnimationFrame(() => read(false));
      } else if (tries++ < 24) {
        raf = requestAnimationFrame(() => read(doScroll));
      } else {
        setRect(null); // element never appeared → centered fallback
      }
    };
    read(true);

    const reread = () => read(false);
    window.addEventListener("resize", reread);
    window.addEventListener("scroll", reread, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", reread);
      window.removeEventListener("scroll", reread, true);
    };
  }, [phase, index, steps, reduced]);

  // onComplete fires when the tour ends by reaching the last step ("Listo");
  // onSkip fires when the user taps "Saltar". The journey wires these to drive
  // the next leg (complete) or abandon the whole journey (skip). Kept in refs so
  // inline callbacks don't churn. Both still run the normal close() (mark seen).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  const handleFinish = useCallback(() => {
    close();
    onCompleteRef.current?.();
  }, [close]);

  const handleSkip = useCallback(() => {
    close();
    onSkipRef.current?.();
  }, [close]);

  const onNext = useCallback(() => {
    if (index + 1 >= total) handleFinish();
    else next();
  }, [index, total, handleFinish, next]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!tour || total === 0 || phase === "idle") return null;

  // Offer — a non-blocking card anchored to Cleo's bottom-right corner. Cleo
  // sits on the right (her home corner) with the message extending to her left,
  // and the whole thing grows out of / shrinks back into the corner.
  if (phase === "offer") {
    const offerText = (t[tourId] && t[tourId].offer) || t.offerDefault || "";
    // Grows out of the bottom-right corner (Cleo's home) and shrinks back into it
    // on dismiss — so it reads as one Cleo coming out to talk and returning, not a
    // second Cleo popping in. AnimatePresence runs the retract before the state
    // machine actually declines (onExitComplete).
    const corner = { opacity: 0, scale: 0.45, x: 18, y: 26 };
    return createPortal(
      <AnimatePresence onExitComplete={decline}>
        {show && (
          <motion.div
            key="offer"
            role="dialog"
            aria-label={offerText}
            initial={reduced ? false : corner}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={reduced ? { opacity: 0 } : corner}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 34 }}
            style={{ position: "fixed", zIndex: 1300, transformOrigin: "bottom right", ...(isMobile
              ? { left: 12, right: 12, bottom: 12 }
              : { right: 20, bottom: 20, width: 380 }) }}
          >
            <style>{css}</style>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
              padding: "14px 16px", boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
              fontFamily: "'Outfit', sans-serif",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.4, marginBottom: 10 }}>
                  {offerText}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="gradient" size="sm" onClick={accept}>{t.offerYes || "Sí, guíame"}</Button>
                  <Button variant="ghost" size="sm" onClick={handleDecline}>{t.offerNo || "Ahora no"}</Button>
                </div>
              </div>
              <div className="ct-cleo" aria-hidden="true" style={{ flexShrink: 0 }}>
                <Cleo size={52} expression="encouraging" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  // Running — blocking overlay + spotlight + step bubble.
  const stepText = (t[tourId] && t[tourId].steps && t[tourId].steps[index]) || {};
  const step = steps[index];
  const isLast = index + 1 >= total;
  const pos = bubblePosition(rect, step?.placement, isMobile);
  const moveTransition = reduced ? "none" : "all .25s cubic-bezier(.16,1,.3,1)";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 1400, pointerEvents: "auto" }}
    >
      <style>{css}</style>

      {/* Spotlight: a transparent box whose huge outset shadow dims everything
          else. When there's no rect, a plain dim backdrop. */}
      {rect ? (
        <div aria-hidden="true" style={{
          position: "fixed",
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          borderRadius: 10, pointerEvents: "none",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          transition: moveTransition,
        }} />
      ) : (
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      )}

      {/* Step bubble. The OUTER div owns positioning (including the translateY
          that lifts a "top"-placed bubble above its anchor); the INNER .ct-card
          owns the entrance animation. They MUST be separate elements: ct-rise
          animates `transform`, which would otherwise clobber the positioning
          transform and drop a bottom-anchored bubble off the bottom of the
          screen (its buttons unreachable). */}
      <div style={{
        position: "fixed", ...pos, pointerEvents: "auto",
        transition: rect ? moveTransition : "none",
      }}>
        <div className="ct-card" style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 18, boxShadow: "0 16px 44px rgba(0,0,0,0.22)",
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div className="ct-cleo" aria-hidden="true" style={{ flexShrink: 0 }}>
              <Cleo size={48} expression={step?.cleo || "happy"} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {stepText.title && (
                <div style={{ fontSize: 15.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                  {stepText.title}
                </div>
              )}
              {stepText.body && (
                <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.5 }}>
                  {stepText.body}
                </div>
              )}
            </div>
          </div>

          {/* Footer: progress dots + controls */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 16, gap: 8 }}>
            <div style={{ display: "flex", gap: 5, flex: 1 }} aria-hidden="true">
              {steps.map((_, i) => (
                <span key={i} style={{
                  width: i === index ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === index ? C.accent : C.border,
                  transition: reduced ? "none" : "width .2s ease, background .2s ease",
                }} />
              ))}
            </div>
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={back}>{t.back || "Atrás"}</Button>
            )}
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>{t.skip || "Saltar"}</Button>
            )}
            <Button variant="gradient" size="sm" onClick={onNext}>
              {isLast ? (t.done || "Listo") : (t.next || "Siguiente")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
