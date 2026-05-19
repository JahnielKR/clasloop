// ─── components/ErrorFallback.jsx ──────────────────────────────────────
//
// PR 67: pantalla que se muestra cuando un error es atrapado por el
// <Sentry.ErrorBoundary> de App.jsx.
//
// Decisiones de diseño:
//   - NO mostrar stack trace al user (UX terrible + revela detalles internos)
//   - Mensaje claro y empático en su idioma
//   - 2 acciones: "Reintentar" (resetea el boundary y re-renderiza) y
//     "Volver al inicio" (navega a /)
//   - Logo de Clasloop arriba para mantener la identidad incluso en error
//   - Centrado, espacioso, no agobiante
//
// Cuándo aparece:
//   - Error en render de cualquier componente (component throws)
//   - Error sincrónico en useEffect setup
//   - NO atrapa errors asincrónicos (fetch().then(...).catch en otro contexto)
//     → para eso usar captureError() del lib/sentry.js
//
// Props (vienen de Sentry.ErrorBoundary automáticamente):
//   - error: Error object
//   - resetError: () => void  (limpia el boundary, re-renderiza)
//   - componentStack: string  (no lo mostramos al user)

import { LogoMark } from "./Icons";
import { C } from "./tokens";

// ─── i18n (mínimo — 3 idiomas) ─────────────────────────────────────────
const COPY = {
  en: {
    title: "Something went wrong",
    body: "Don't worry — the issue has been reported automatically and we'll fix it. You can try again or go back to the home page.",
    retry: "Try again",
    home: "Go to home",
    errorIdLabel: "Error ID",
  },
  es: {
    title: "Algo salió mal",
    body: "Tranquilo — el problema se reportó automáticamente y lo vamos a arreglar. Podés intentar de nuevo o volver al inicio.",
    retry: "Reintentar",
    home: "Ir al inicio",
    errorIdLabel: "ID del error",
  },
  ko: {
    title: "문제가 발생했습니다",
    body: "걱정하지 마세요 — 문제가 자동으로 보고되었으며 곧 해결하겠습니다. 다시 시도하거나 홈으로 돌아갈 수 있습니다.",
    retry: "다시 시도",
    home: "홈으로",
    errorIdLabel: "오류 ID",
  },
};

/**
 * Detect user language from <html lang="..."> or localStorage fallback.
 * Hacemos best-effort porque cuando el error boundary se monta, el
 * contexto de la app puede no estar disponible.
 */
function detectLang() {
  try {
    const htmlLang = document.documentElement.lang;
    if (htmlLang && COPY[htmlLang]) return htmlLang;
    const stored = localStorage.getItem("clasloop_lang");
    if (stored && COPY[stored]) return stored;
  } catch {
    // localStorage puede tirar SecurityError si está deshabilitado
  }
  return "en";
}

export default function ErrorFallback({ error, resetError }) {
  const lang = detectLang();
  const t = COPY[lang] || COPY.en;

  // Para support: si Sentry adjuntó un eventId, mostrarlo abajo (los users
  // pueden mandarlo si quieren reportar). Sentry lo adjunta como property
  // del error si está disponible.
  const eventId = error?.sentryEventId || null;

  const handleHome = () => {
    // Reset del boundary + nav a home. Window.location es defensivo
    // (si el router está roto, esto igual funciona).
    try { resetError(); } catch {}
    try {
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: C.bg,
      color: C.text,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
      }}>
        {/* Logo arriba para mantener identidad incluso en error */}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <LogoMark size={56} />
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 24,
          fontWeight: 600,
          margin: 0,
          marginBottom: 12,
          color: C.text,
        }}>
          {t.title}
        </h1>

        {/* Body */}
        <p style={{
          fontSize: 15,
          lineHeight: 1.5,
          color: C.textSecondary || C.textMuted,
          margin: 0,
          marginBottom: 32,
        }}>
          {t.body}
        </p>

        {/* Actions */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
        }}>
          <button
            onClick={resetError}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              background: C.accent,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
          <button
            onClick={handleHome}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              color: C.text,
              border: `1px solid ${C.border}`,
              cursor: "pointer",
            }}
          >
            {t.home}
          </button>
        </div>

        {/* Event ID (si Sentry lo proveyó) — pequeño, no intimidante */}
        {eventId && (
          <div style={{
            fontSize: 11,
            color: C.textMuted,
            fontFamily: "monospace",
            opacity: 0.6,
            marginTop: 8,
          }}>
            {t.errorIdLabel}: {eventId.slice(0, 8)}
          </div>
        )}
      </div>
    </div>
  );
}
