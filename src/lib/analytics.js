// ─── lib/analytics.js ──────────────────────────────────────────────────
//
// PR 69: wrapper sobre PostHog para tracking de eventos en producción.
//
// Mismo approach que lib/sentry.js: el resto del código NO importa
// posthog-js directamente. Si en algún momento cambiamos a Mixpanel o
// Amplitude, tocamos solo este archivo.
//
// Decisiones de privacidad (importantes):
//   - distinct_id = profile.id (UUID, igual que Sentry — sin email ni nombre)
//   - role, language como super properties
//   - NO mandamos contenido de decks, títulos, nombres de alumnos
//   - persistence: "memory" → no cookies (compliance friendly por default)
//
// Decisiones de captura:
//   - Page views: PostHog los captura automáticamente (autocapture: false
//     porque preferimos eventos explícitos, pero capture_pageview: true)
//   - Eventos custom: vía trackEvent("event_name", { properties })
//   - No replay, no heatmaps (cuota separada, no nos sirve por ahora)
//
// Decisiones de environment:
//   - Solo activa si VITE_POSTHOG_KEY está definida Y es production
//   - En dev local sin key → no-op
//   - Mismo patrón que Sentry — devs nuevos pueden clonar sin setup

import posthog from "posthog-js";

// ─── State ─────────────────────────────────────────────────────────────
let initialized = false;

// ─── Init ──────────────────────────────────────────────────────────────

/**
 * Inicializa PostHog. Llamar UNA vez al boot de la app (en main.jsx,
 * después de initSentry).
 *
 * Si VITE_POSTHOG_KEY no está definida → no-op. La app funciona idéntico,
 * solo no hay tracking. Esto permite que devs nuevos clonen y corran
 * sin necesidad de configurar PostHog.
 *
 * Solo se inicializa en production. En dev local podés ver los eventos
 * en la consola con console.log (cada trackEvent loguea).
 */
export function initAnalytics() {
  if (initialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
  const isProd = import.meta.env.PROD;

  if (!key || !isProd) {
    // Sin key o en dev → no-op. La app funciona idéntico.
    console.log("[analytics] disabled (no PostHog key or not in production)");
    return;
  }

  try {
    posthog.init(key, {
      api_host: host,
      // No cookies — usa solo memory storage. Esto evita el banner GDPR
      // y mantiene compliance simple. La contrapartida: si el user
      // refresca, su distinct_id cambia (pero como hacemos identify()
      // al login, eso resuelve la continuidad post-auth).
      persistence: "memory",

      // No autocapture (clicks, form submits automáticos). Preferimos
      // eventos explícitos — generan menos noise y nos forzamos a
      // diseñar bien qué trackear.
      autocapture: false,

      // Page views sí — útiles para flow analysis ("scanner → results →
      // save → home") sin requerir trackEvent en cada navegación.
      capture_pageview: true,

      // Capture exceptions automáticos: NO. Sentry ya lo hace.
      // No queremos pagar 2 veces por el mismo dato.
      capture_pageleave: false,

      // Por default, no sesion recording (cuota separada). Si en el
      // futuro querés activarlo: disable_session_recording: false.
      disable_session_recording: true,

      // Performance: no medimos web vitals (Lighthouse local es suficiente).
      capture_performance: false,

      // Log level: warn → no spammeamos la console
      loaded: () => {
        console.log("[analytics] initialized");
      },
    });

    initialized = true;
  } catch (err) {
    // Si PostHog mismo falla al inicializar, NO romper la app.
    // (igual que sentry.js — defensive)
    console.warn("[analytics] init failed:", err);
  }
}

// ─── User context ──────────────────────────────────────────────────────

/**
 * Asocia los eventos al usuario actual. Llamar cuando se hace login.
 *
 * PRIVACIDAD: igual que Sentry — NO mandamos email ni nombre. Solo:
 *   - id (UUID de Supabase)
 *   - role (teacher | student | guest)
 *   - language (en | es | ko)
 *
 * @param {object} user
 * @param {string} user.id        - profile.id (UUID)
 * @param {string} [user.role]    - "teacher" | "student" | "guest"
 * @param {string} [user.language] - "en" | "es" | "ko"
 */
export function identifyUser(user) {
  if (!initialized) return;
  if (!user || !user.id) return;

  try {
    posthog.identify(user.id, {
      role: user.role || undefined,
      language: user.language || undefined,
      // NO email, NO display_name — Sentry y PostHog no los necesitan.
    });
  } catch (err) {
    console.warn("[analytics] identify failed:", err);
  }
}

/**
 * Limpia el user context (usar al logout). Eventos posteriores serán
 * anónimos hasta el próximo identify.
 */
export function resetAnalytics() {
  if (!initialized) return;
  try {
    posthog.reset();
  } catch (err) {
    console.warn("[analytics] reset failed:", err);
  }
}

// ─── Event tracking ────────────────────────────────────────────────────

/**
 * Trackea un evento. La PRIMERA convención importante: nombres en
 * snake_case y descriptivos en past tense ("deck_created" no "createDeck").
 *
 * @param {string} eventName  Nombre del evento (snake_case)
 * @param {object} [properties] Properties extras del evento.
 *
 * EJEMPLOS:
 *   trackEvent("deck_created", { question_count: 10, source: "manual" })
 *   trackEvent("session_started", { deck_id_hash: "abc123", question_count: 15 })
 *   trackEvent("scan_completed", { score: 7, total: 10, multi_answer: true })
 *
 * PROPIEDADES QUE NO MANDAR:
 *   - Title del deck (contiene info del profe)
 *   - Contenido de preguntas
 *   - Nombres de alumnos
 *   - Emails
 *
 * En general: si la propiedad podría identificar a alguien o exponer
 * IP del usuario, NO la mandes.
 */
export function trackEvent(eventName, properties = {}) {
  if (!initialized) {
    // En dev, logueamos para que se vea el flow. Esto NO se envía a PostHog.
    console.log("[event]", eventName, properties);
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.warn("[analytics] capture failed:", err);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Hash simple (no criptográfico) para anonimizar IDs antes de mandarlos
 * como propiedades. Útil cuando queremos contar "cuántos decks distintos
 * se usaron este mes" sin mandar los UUIDs reales.
 *
 * No es seguridad — un atacante con la tabla decks podría brute-forcear
 * el hash. Es solo data minimization: PostHog no debería tener los
 * UUIDs reales en cleartext.
 *
 * @param {string} id - el UUID a hashear
 * @returns {string} hash de 8 caracteres
 */
export function hashId(id) {
  if (!id) return "";
  // FNV-1a hash, 32 bits, en hex. Suficiente para evitar leaks accidentales.
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
