// ─── components/Toast.jsx ──────────────────────────────────────────────
//
// PR 68: componente individual de un toast.
//
// Lo monta el ToastContainer cuando aparece uno nuevo y lo desmonta
// cuando expira. NO se usa directo desde código de usuario — usar
// useToast() del lib/toast.js.
//
// Animaciones:
//   - Entrada: slide desde la derecha + fade-in (200ms)
//   - Salida: fade-out (180ms)
//   - Pause-on-hover: el timer se pausa mientras el mouse está encima
//   - Click to dismiss: cierra inmediato
//
// Estructura:
//   ┌──────────────────────────────────────┐
//   │  [icon] message text          [×]    │
//   │         action button (optional)     │
//   └──────────────────────────────────────┘
//
// Variantes (success, error, info, warning) se distinguen por:
//   - Color del borde izquierdo (3px solid)
//   - Color del icon
//   - Fondo: blanco siempre (no usamos red-bg para errors — muy intrusivo)

import { useEffect, useRef, useState } from "react";
import { C } from "./tokens";

// ─── Variant config ────────────────────────────────────────────────────
//
// Cada variante define color del accent (borde + icon) y duración default.
// Errors duran más porque suelen requerir más tiempo de lectura.
const VARIANTS = {
  success: { color: C.green,  duration: 4000, icon: CheckIcon },
  error:   { color: C.red,    duration: 8000, icon: AlertIcon },
  warning: { color: C.orange, duration: 6000, icon: AlertIcon },
  info:    { color: C.accent, duration: 4000, icon: InfoIcon },
};

// ─── Icons ─────────────────────────────────────────────────────────────
function CheckIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <path d="M20 6 L9 17 L4 12" />
    </svg>
  );
}

function AlertIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function InfoIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2.5" strokeLinecap="round"
         aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────

/**
 * Un toast individual. Se desmonta automáticamente después de `duration` ms
 * (a menos que duration === 0, en cuyo caso es permanente hasta dismiss
 * manual).
 *
 * @param {object} props
 * @param {string} props.id        ID único (del manager)
 * @param {string} props.variant   "success" | "error" | "warning" | "info"
 * @param {string} props.message   Texto principal del toast
 * @param {object} [props.action]  Acción opcional: { label, onClick }
 * @param {number} [props.duration] Override de la duración default
 * @param {function} props.onDismiss  Callback cuando el toast quiere
 *                                     cerrarse (timer expira o user click)
 */
export default function Toast({ id, variant = "info", message, action, duration, onDismiss }) {
  const cfg = VARIANTS[variant] || VARIANTS.info;
  const Icon = cfg.icon;
  const totalMs = duration ?? cfg.duration;

  // State para animación de entrada/salida
  const [phase, setPhase] = useState("entering"); // entering | visible | leaving
  // Cuando el mouse está encima, pausamos el timer
  const [paused, setPaused] = useState(false);

  // Setup del timer de auto-dismiss
  const startedAtRef = useRef(null);
  const remainingRef = useRef(totalMs);
  const timerRef = useRef(null);

  // Trigger entrada → visible después de un frame
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("visible"));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Manejo del timer (con pause on hover)
  useEffect(() => {
    if (totalMs === 0) return;  // permanente
    if (phase !== "visible") return;
    if (paused) {
      // Pausar: calcular cuánto quedaba y limpiar timer
      if (startedAtRef.current != null) {
        const elapsed = Date.now() - startedAtRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    // No paused: arrancar timer con el remaining
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      setPhase("leaving");
    }, remainingRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, paused, totalMs]);

  // Cuando entra a phase "leaving", esperar la duración de la animación
  // antes de notificar al manager para que nos quite del array
  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => onDismiss(id), 180);
    return () => clearTimeout(t);
  }, [phase, id, onDismiss]);

  const dismiss = () => setPhase("leaving");

  // Estilos según phase
  const isEntering = phase === "entering";
  const isLeaving = phase === "leaving";
  const baseOpacity = (isEntering || isLeaving) ? 0 : 1;
  const baseTransform = (isEntering || isLeaving) ? "translateX(24px)" : "translateX(0)";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 10,
        padding: "12px 14px",
        minWidth: 280,
        maxWidth: 380,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontFamily: "'DM Sans', sans-serif",
        opacity: baseOpacity,
        transform: baseTransform,
        transition: "opacity 200ms ease, transform 200ms ease",
        pointerEvents: "auto",
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <Icon color={cfg.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          lineHeight: 1.4,
          color: C.text,
          wordBreak: "break-word",
        }}>
          {message}
        </div>

        {/* Action opcional (Undo, Retry, etc) */}
        {action && (
          <button
            onClick={() => {
              try { action.onClick(); } finally { dismiss(); }
            }}
            style={{
              marginTop: 8,
              padding: "4px 10px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${cfg.color}`,
              color: cfg.color,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: "pointer",
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        aria-label="Close"
        style={{
          flexShrink: 0,
          padding: 4,
          background: "transparent",
          border: "none",
          color: C.textMuted,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: -2,
        }}
      >
        <CloseIcon color={C.textMuted} />
      </button>
    </div>
  );
}
