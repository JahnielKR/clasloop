// ─── components/ToastContainer.jsx ─────────────────────────────────────
//
// PR 68: contenedor del stack de toasts.
//
// Renderiza los toasts activos en un fixed div en la esquina inferior
// derecha (desktop) o arriba centro (mobile). Solo se monta UNA VEZ —
// el provider en lib/toast.js lo coloca cerca del root del árbol.

import Toast from "./Toast";

// Límite de toasts simultáneos visibles. Si hay más, los más viejos se
// dropean primero (FIFO) — para evitar que la pantalla se llene de toasts.
const MAX_VISIBLE = 3;

export default function ToastContainer({ toasts, onDismiss }) {
  // Si hay más de MAX, mostramos solo los últimos N (los más recientes).
  // Los más viejos quedan invisibles pero el manager los va a auto-eliminar.
  const visible = toasts.slice(-MAX_VISIBLE);

  // Detectar mobile por viewport para posicionamiento responsive.
  // No usamos un hook caro — checkeamos directamente el window width.
  // Si el viewport cambia mid-toast, queda en su lugar inicial. OK.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      style={{
        position: "fixed",
        ...(isMobile
          ? { top: 16, left: "50%", transform: "translateX(-50%)" }
          : { bottom: 16, right: 16 }
        ),
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        // pointer-events: none en el container, los toasts mismos lo
        // reactivan. Esto permite clickear "through" cuando no hay toasts
        // o entre toasts (los gaps).
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {visible.map(t => (
        <Toast
          key={t.id}
          id={t.id}
          variant={t.variant}
          message={t.message}
          action={t.action}
          duration={t.duration}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
