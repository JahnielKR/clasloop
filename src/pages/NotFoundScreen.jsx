// ─── NotFoundScreen ──────────────────────────────────────────────────────
//
// Extracted from App.jsx in PR 112 (split App.jsx). Behavior unchanged.
// Renders inside the authed shell when the URL doesn't match any known
// page. The parent route owns the sidebar so we only fill the content area.
import { C } from '../components/tokens';

// ── 404 screen ──
// Shown inside the authed shell when the URL doesn't map to any known page.
// We reuse the sidebar layout (rendered by App around us) so the user can
// still navigate via the sidebar — this screen only fills the content area.
function NotFoundScreen({ onGoHome, lang = "en" }) {
  // Tiny i18n inline — not worth wiring through the full i18n system for one
  // screen. en/es/ko cover the rest of the app.
  const txt = {
    en: { title: "Page not found", body: "The link you followed may be broken, or the page may have been moved.", cta: "Go to home" },
    es: { title: "Página no encontrada", body: "El enlace que seguiste puede estar roto o la página fue movida.", cta: "Volver al inicio" },
    ko: { title: "페이지를 찾을 수 없습니다", body: "따라간 링크가 깨졌거나 페이지가 이동되었을 수 있습니다.", cta: "홈으로 이동" },
  }[lang] || { title: "Page not found", body: "The link you followed may be broken, or the page may have been moved.", cta: "Go to home" };

  return (
    <div style={{ minHeight: "calc(100vh - 0px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: C.textMuted, fontFamily: "'Outfit',sans-serif", letterSpacing: "-.04em", lineHeight: 1, marginBottom: 12 }}>404</div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.text }}>{txt.title}</h2>
        <p style={{ fontSize: 14, color: C.textSecondary, fontFamily: "'Outfit',sans-serif", marginBottom: 20, lineHeight: 1.5 }}>{txt.body}</p>
        <button
          onClick={onGoHome}
          style={{
            padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: `linear-gradient(135deg,${C.accent},${C.purple})`, color: "#fff",
            border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{txt.cta}</button>
      </div>
    </div>
  );
}

export default NotFoundScreen;
