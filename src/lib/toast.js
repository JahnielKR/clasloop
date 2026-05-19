// ─── lib/toast.js ──────────────────────────────────────────────────────
//
// PR 68: API de toasts — Provider, hook, y helpers convenientes.
//
// USO BÁSICO:
//   import { useToast } from "../lib/toast";
//
//   function MyComponent() {
//     const toast = useToast();
//     return <button onClick={() => toast.success("Saved!")}>Save</button>;
//   }
//
// VARIANTES:
//   toast.success("Message")      // verde, 4s
//   toast.error("Failed")         // rojo, 8s
//   toast.warning("Are you sure") // naranja, 6s
//   toast.info("FYI")             // azul, 4s
//
// CON ACCIÓN:
//   toast.error("Network error", {
//     action: { label: "Retry", onClick: () => retry() }
//   })
//
// PERMANENTE (no auto-dismiss):
//   toast.error("Critical error", { duration: 0 })
//
// REPORTAR A SENTRY AUTOMÁTICO:
//   - toast.error("string")       → solo toast, no Sentry
//   - toast.error(errorObject)    → toast + captureError() a Sentry
//   - toast.error(err, { skipSentry: true })  → toast, no Sentry
//
//   La razón: a veces "error" es validation del user (no es bug nuestro
//   y no queremos contaminar Sentry). Otras veces es un crash real que
//   queremos trackear. Distinguimos por TIPO del primer argumento.

import { createContext, useContext, useState, useCallback, useRef } from "react";
import ToastContainer from "../components/ToastContainer";
import { captureError } from "./sentry";

// ─── Context ───────────────────────────────────────────────────────────
const ToastContext = createContext(null);

/**
 * Hook para acceder al API de toasts. Tiene que ser usado dentro de
 * un <ToastProvider>. Si no lo es, devuelve un fallback que loguea a
 * console (para no crashear).
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback defensivo: si por alguna razón el provider no está,
    // que no crashee el componente que usa useToast. Logueamos a
    // console como mejor esfuerzo.
    return FALLBACK_TOAST;
  }
  return ctx;
}

// Fallback no-op (usado solo si useToast se llama fuera del Provider)
const FALLBACK_TOAST = {
  success: (msg) => console.log("[toast:success]", msg),
  error:   (msg) => console.error("[toast:error]", msg),
  warning: (msg) => console.warn("[toast:warning]", msg),
  info:    (msg) => console.log("[toast:info]", msg),
};

// ─── Provider ──────────────────────────────────────────────────────────

/**
 * Provider que provee el toast API a su subtree. Montarlo cerca del
 * root del árbol (en App.jsx dentro del ErrorBoundary).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Counter para IDs únicos (más simple que Math.random o uuid)
  const idRef = useRef(0);

  // Helper interno: agrega un toast y devuelve su id (por si el caller
  // quiere dismissarlo manualmente).
  const addToast = useCallback(({ variant, message, action, duration }) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, variant, message, action, duration }]);
    return id;
  }, []);

  // Dismiss: quita un toast del array (llamado por el Toast cuando su
  // timer expira o el user lo cierra).
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Public API: toast.success(), toast.error(), etc ──────────────
  //
  // Cada uno acepta:
  //   - message: string | Error
  //   - options: { action, duration, skipSentry, reportError, context }
  //
  // INTEGRACIÓN CON SENTRY:
  //
  //   toast.error("Connection failed")
  //     → Solo toast. NO reporta a Sentry (es info para el user).
  //
  //   toast.error(errorObject)
  //     → Toast con error.message + report a Sentry.
  //
  //   toast.error(err, { skipSentry: true })
  //     → Toast con error.message, sin Sentry. Útil para errores esperados
  //       (ej. validation, user cancelled, etc).
  //
  //   toast.error("Localized user message", { reportError: err, context: {...} })
  //     → Toast con mensaje localizado + report del Error real a Sentry.
  //       Caso de uso: cuando el user no debería ver el detalle técnico
  //       (ej. "Connection error" en su idioma) pero vos sí querés el
  //       stack trace en Sentry.

  const success = useCallback((message, options = {}) => {
    const msg = errorOrStringToMessage(message);
    return addToast({ variant: "success", message: msg, ...options });
  }, [addToast]);

  const error = useCallback((messageOrError, options = {}) => {
    const isErrorObject = messageOrError instanceof Error;
    const msg = errorOrStringToMessage(messageOrError);

    // Reporte a Sentry:
    //   - Si el primer arg es un Error (y no se pidió skipSentry), reportarlo
    //   - Si se pasó reportError: explícito, reportarlo (overrides skipSentry)
    if (options.reportError && !options.skipSentry) {
      captureError(options.reportError, options.context || {});
    } else if (isErrorObject && !options.skipSentry) {
      captureError(messageOrError, options.context || {});
    }

    return addToast({ variant: "error", message: msg, ...options });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    const msg = errorOrStringToMessage(message);
    return addToast({ variant: "warning", message: msg, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    const msg = errorOrStringToMessage(message);
    return addToast({ variant: "info", message: msg, ...options });
  }, [addToast]);

  const api = { success, error, warning, info, dismiss: dismissToast };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Convierte el primer argumento (que puede ser string o Error) en el
 * string a mostrar. Para Error objects, usamos err.message si tiene,
 * o "An error occurred" como fallback.
 */
function errorOrStringToMessage(messageOrError) {
  if (typeof messageOrError === "string") return messageOrError;
  if (messageOrError instanceof Error) {
    return messageOrError.message || "An error occurred";
  }
  if (messageOrError == null) return "";
  // Fallback para objetos inesperados (no debería pasar pero por las dudas)
  try { return String(messageOrError); } catch { return "An error occurred"; }
}
