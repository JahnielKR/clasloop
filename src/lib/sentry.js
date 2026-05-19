// ─── lib/sentry.js ─────────────────────────────────────────────────────
//
// PR 67: wrapper sobre Sentry para que el resto del código no se acople
// directamente a `@sentry/react`. Si en algún momento cambiamos a otra
// herramienta (LogRocket, Datadog, Bugsnag), tocamos solo este archivo.
//
// Decisiones de privacidad (importantes):
//   - NO mandamos email, nombre real, ni datos del alumno a Sentry
//   - Solo mandamos: profile.id, role ("teacher"|"student"), language
//   - Si necesitás identificar QUIÉN fue, mirás el ID en Supabase
//   - Esto cumple con "minimizar datos" sin perder utilidad para debug
//
// Decisiones de eventos:
//   - Solo errors. Sin performance tracking (Jota lo decidió en PR 67).
//   - tracesSampleRate: 0 → no overhead, no consumo de cuota innecesario
//   - replays: NO (estarían bueno pero requieren cuota separada)
//
// Decisiones de environment:
//   - Solo activa si VITE_SENTRY_DSN está definida Y es production
//   - En dev local sin DSN → no-op (no contamina tu cuota mientras codeás)
//
// Esquema de uso:
//   import { initSentry, setSentryUser, captureError, clearSentryUser }
//          from "./lib/sentry";
//
//   // En main.jsx:
//   initSentry();
//
//   // Cuando login:
//   setSentryUser({ id, role, language });
//
//   // Cuando logout:
//   clearSentryUser();
//
//   // En cualquier catch:
//   captureError(err, { context: "scanner.sample" });

import * as Sentry from "@sentry/react";

// ─── State ─────────────────────────────────────────────────────────────
let initialized = false;

// ─── Init ──────────────────────────────────────────────────────────────

/**
 * Inicializa Sentry. Llamar UNA vez al boot de la app, lo más temprano
 * posible (antes de cualquier React rendering).
 *
 * Si VITE_SENTRY_DSN no está definida → no-op. La app sigue funcionando
 * perfectamente, solo no hay tracking. Esto permite que devs nuevos
 * puedan clonear y correr sin necesidad de DSN.
 *
 * Solo se inicializa en production (PROD=true en Vite). En dev local,
 * un error mostrado en la consola ya es suficiente para debug.
 */
export function initSentry() {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const isProd = import.meta.env.PROD;

  if (!dsn || !isProd) {
    // Sin DSN o en dev → no-op. La app funciona idéntico.
    console.log("[sentry] disabled (no DSN or not in production)");
    return;
  }

  try {
    Sentry.init({
      dsn,
      // Environment label en el dashboard de Sentry. Útil cuando agregues
      // staging o preview environments en el futuro.
      environment: import.meta.env.MODE || "production",

      // Sample rate de errores: 1.0 = capturar todos.
      // Si en el futuro la cuota se queda corta, bajarlo (ej. 0.5 = 50%).
      sampleRate: 1.0,

      // Performance tracking DESACTIVADO (decisión PR 67 — Jota).
      // tracesSampleRate: 0 significa "no envíes spans/transactions".
      // Si en el futuro querés performance, subirlo a 0.1 (10% sampling).
      tracesSampleRate: 0,

      // beforeSend: filtramos ruido común que ensucia el dashboard
      // sin agregar valor para debug.
      beforeSend(event, hint) {
        const err = hint?.originalException;

        // Filter 1: Network errors típicos en mobile (cambio de wifi,
        // timeouts puntuales). No son bugs nuestros, son del entorno.
        if (err?.name === "NetworkError" || err?.message?.includes("Failed to fetch")) {
          return null;
        }

        // Filter 2: errores de Capacitor cuando el user cancela un
        // diálogo nativo (file picker, scanner). No es bug.
        const msg = err?.message || "";
        if (msg.includes("cancelled") || msg.includes("user_cancelled")) {
          return null;
        }

        // Filter 3: ResizeObserver loop warning (ruido conocido del browser,
        // no afecta funcionalidad). Es el "ResizeObserver loop completed
        // with undelivered notifications" que Chrome tira a veces.
        if (msg.includes("ResizeObserver")) {
          return null;
        }

        return event;
      },

      // No integrations especiales: solo las defaults de @sentry/react
      // que capturan errors automáticos (uncaught, unhandled rejections).
    });

    initialized = true;
    console.log("[sentry] initialized");
  } catch (err) {
    // Si Sentry mismo falla al inicializar, NO romper la app.
    // Esto es código defensivo — si Sentry no anda, la app sí debe andar.
    console.warn("[sentry] init failed:", err);
  }
}

// ─── User context ──────────────────────────────────────────────────────

/**
 * Asocia los siguientes errors al usuario actual.
 *
 * PRIVACIDAD: NO mandamos email ni nombre real. Solo:
 *   - id (UUID de Supabase, sin sentido fuera del contexto)
 *   - role (teacher | student | guest)
 *   - language (en | es | ko)
 *
 * Si querés saber quién fue el user con bug, buscás el ID en Supabase.
 *
 * @param {object} user
 * @param {string} user.id        - profile.id (UUID)
 * @param {string} [user.role]    - "teacher" | "student" | "guest"
 * @param {string} [user.language] - "en" | "es" | "ko"
 */
export function setSentryUser(user) {
  if (!initialized) return;
  if (!user || !user.id) return;

  try {
    Sentry.setUser({
      id: user.id,
      // NO username, NO email, NO ip_address — Sentry no los necesita.
    });

    // Tags adicionales para filtrar en el dashboard
    if (user.role) Sentry.setTag("role", user.role);
    if (user.language) Sentry.setTag("language", user.language);
  } catch (err) {
    console.warn("[sentry] setUser failed:", err);
  }
}

/**
 * Limpia el user context (usar al logout). Errors posteriores serán
 * anónimos hasta el próximo setSentryUser.
 */
export function clearSentryUser() {
  if (!initialized) return;
  try {
    Sentry.setUser(null);
  } catch (err) {
    console.warn("[sentry] clearUser failed:", err);
  }
}

// ─── Manual capture ────────────────────────────────────────────────────

/**
 * Reporta un error manualmente. Útil en catch blocks donde el error
 * NO va a propagar a un error boundary.
 *
 * Ejemplos: errores en fetch al guardar a Supabase, fallas del scanner,
 * errores en upload de imagen, etc.
 *
 * @param {Error} error          - El error a reportar
 * @param {object} [context]    - Contexto extra (file, action, etc)
 *                                Aparece como "extra context" en Sentry.
 */
export function captureError(error, context = {}) {
  if (!initialized) {
    // En dev, al menos consoleeamos para debug
    console.error("[error]", error, context);
    return;
  }
  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (err) {
    console.warn("[sentry] capture failed:", err);
  }
}

/**
 * Reporta un mensaje (no un error). Para eventos importantes que querés
 * trackear pero NO son crashes — ej: "user retried scan 3 times".
 *
 * Mantenelo SHORT (esto consume cuota igual que los errors).
 */
export function captureMessage(message, level = "info", context = {}) {
  if (!initialized) {
    console.log("[message]", message, context);
    return;
  }
  try {
    Sentry.captureMessage(message, {
      level,  // "fatal" | "error" | "warning" | "info" | "debug"
      extra: context,
    });
  } catch (err) {
    console.warn("[sentry] message failed:", err);
  }
}

// ─── Re-exports para usar el ErrorBoundary directo en App.jsx ─────────
//
// Sentry.ErrorBoundary es un componente React que ya hace todo lo que
// queremos (try/catch en children, fallback UI, reset, reportar a Sentry).
// Reexportarlo evita que cada lugar haga `import * as Sentry from ...`

export const SentryErrorBoundary = Sentry.ErrorBoundary;
