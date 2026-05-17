// ─── components/CustomSplash.jsx ───────────────────────────────────────
//
// PR 53 (FASE 2 Capacitor — splash polish):
//
// Custom splash que se muestra DESPUÉS del splash nativo de Android 12+.
// El sistema operativo en Android 12+ solo soporta logo en su splash
// (no wordmark "Clasloop"), entonces hacemos esta transición:
//
//   1. Android OS dispara splash sistema (fondo grafito + logo)         ~0.5s
//   2. WebView monta, React arranca
//   3. React monta <CustomSplash /> como overlay con MISMO fondo grafito
//      → al usuario le parece continuo (no ve flicker)
//   4. CustomSplash muestra logo + "Clasloop" wordmark debajo            ~1.5s
//   5. Fade out → app aparece debajo
//
// El truco para que no haya flicker es que ambos splashes usan
// EXACTAMENTE el mismo background (#1a1a1a) y el mismo logo. La única
// diferencia visible es que aparece el wordmark al hacer la transición.

import { useEffect, useState } from "react";
import { LogoMark } from "./Icons";

const SPLASH_BG = "#1a1a1a";
const VISIBLE_MS = 1500;   // tiempo total visible (después del sistema)
const FADE_MS = 350;        // duración del fade-out

export default function CustomSplash({ onDone }) {
  // Estados:
  //   'visible'  → mostrando logo + wordmark
  //   'fading'   → fade-out en progreso
  //   'gone'     → renderizamos null
  const [phase, setPhase] = useState("visible");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fading"), VISIBLE_MS);
    const t2 = setTimeout(() => {
      setPhase("gone");
      onDone?.();
    }, VISIBLE_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (phase === "gone") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: SPLASH_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        zIndex: 9999,
        // Inhibir interacciones detrás
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
      aria-hidden={phase === "fading"}
    >
      <LogoMark size={96} />
      <div
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 32,
          color: "#fff",
          letterSpacing: "-0.5px",
        }}
      >
        Clasloop
      </div>
    </div>
  );
}
