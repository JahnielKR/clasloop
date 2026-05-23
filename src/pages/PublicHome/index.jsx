import { useState, useEffect, useRef } from "react";
import { LogoMark } from "../../components/Icons";
import { C } from "../../components/tokens";
// PR 77: i18n centralizado
import { useT } from "../../i18n";

import { landingCss } from "./landing-css";
import { landingScrollCss } from "./landing-scroll-css";
import { useScrolledPast, useActiveSection, useScrollDocProgress } from "./landing-motion";
import JourneyRail from "./sections/JourneyRail";
import Hero from "./sections/Hero";
import GenerationDemo from "./sections/GenerationDemo";
import PrintAndScanDemo from "./sections/PrintAndScanDemo";
import LiveSessionDemo from "./sections/LiveSessionDemo";
import QuestionTypes from "./sections/QuestionTypes";
import InsightsDemo from "./sections/InsightsDemo";
import WhyDaily from "./sections/WhyDaily";
import FinalCTA from "./sections/FinalCTA";
import Footer from "./sections/Footer";
import CodeDialog from "./sections/CodeDialog";

// ─── PublicHome (landing) ──────────────────────────────────────────────────
// La landing es el primer punto de contacto del producto. El copy va alineado
// 100% con el reposicionamiento "warmups & exit tickets". El comprador es el
// PROFE — la página vende a profesores.
//
// PR (landing scaffold): este archivo era un monolito de ~717 líneas. Se
// partió en secciones (./sections/*) + CSS (./landing-css) + reveal hook
// (./useReveal). La firma de props ({ onSignIn, onSignUp }) NO cambia, así
// que App.jsx sigue importando `./pages/PublicHome` sin tocar nada.
//
// El copy de las secciones vive en src/i18n/{en,es,ko}.ts bajo el namespace
// "publicHome".

// Section ids in document order. Feeds the scroll-spy (useActiveSection) that
// drives the active nav-link highlight.
const SECTION_IDS = ["generate", "print", "live", "types", "insights", "why", "start"];

// Smooth-scroll a una sección por id (nav del header + scroll cue del hero).
function scrollToId(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PublicHome({ onSignIn, onSignUp }) {
  // ─── Lang detection (URL → localStorage → browser → EN) ──
  // Prioridad: URL ?lang= (link compartido), después la elección guardada
  // del user en localStorage (clasloop_lang, misma key que usa el resto del
  // app), después navigator.language, y EN como fallback.
  const [lang, setLangRaw] = useState(() => {
    if (typeof window === "undefined") return "en";
    const url = new URLSearchParams(window.location.search).get("lang");
    if (["en", "es", "ko"].includes(url)) return url;
    const saved = window.localStorage?.getItem("clasloop_lang");
    if (["en", "es", "ko"].includes(saved)) return saved;
    const browser = navigator.language?.slice(0, 2);
    if (["en", "es", "ko"].includes(browser)) return browser;
    return "en";
  });
  const setLang = (newLang) => {
    setLangRaw(newLang);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("clasloop_lang", newLang);
    }
  };
  const t = useT("publicHome", lang);

  // Reactive header: condense + lift it once the visitor scrolls off the hero.
  const scrolled = useScrolledPast(12);
  // Scroll-spy: which section is in view — drives the journey rail + nav highlight.
  const activeSection = useActiveSection(SECTION_IDS);
  // Thin accent progress line under the header, filling 0→100% with page scroll.
  // Written imperatively (scaleX straight to the DOM) — no per-frame re-render.
  const headerProgRef = useRef(null);
  useScrollDocProgress((p) => {
    if (headerProgRef.current) headerProgRef.current.style.transform = `scaleX(${p.toFixed(3)})`;
  });

  // ─── Code dialog (estudiante con código de profe) ────────
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [code, setCode] = useState("");
  const codeValid = /^[0-9]{6}$/.test(code);

  // Cerrar dialog con Escape
  useEffect(() => {
    if (!codeDialogOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setCodeDialogOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [codeDialogOpen]);

  // Note: theme handling for pre-app surfaces (this page, GuestJoin,
  // AuthScreen) is managed at the App.jsx level — see the useEffect there
  // that watches user/authIntent and forces light theme on the <html>
  // element. Doing it per-component caused brief dark flashes when
  // navigating between PublicHome → AuthScreen because their mount/unmount
  // cycles overlap.

  // ─── Handlers ────────────────────────────────────────────
  const handleJoin = () => {
    if (!codeValid) return;
    // Hand off to the dedicated guest route. Same origin, full reload — that
    // way main.jsx routes to GuestJoin cleanly and we keep its existing
    // localStorage reconnect logic untouched.
    window.location.href = `/join?code=${code}&lang=${lang}`;
  };
  // PR 43: sin role pre-selection. Cualquier signup/signin va directo al
  // AuthScreen. El rol se elige en RoleOnboarding después del primer login.
  const handleSignUp = () => onSignUp?.();
  const handleLogin = () => onSignIn?.();

  return (
    <>
      <style>{landingCss}</style>
      <style>{landingScrollCss}</style>
      <div className="ph-root" data-theme="light" style={{ background: "#fff", minHeight: "100vh" }}>

        {/* HEADER — sticky con logo, nav, acciones */}
        <header className="ph-header" style={{
          position: "sticky", top: 0, zIndex: 50,
          background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)",
          backdropFilter: scrolled ? "blur(6px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(6px)" : "none",
          borderBottom: `1px solid ${C.border}`,
          padding: scrolled ? "10px 36px" : "16px 36px",
          boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.06)" : "0 0 0 rgba(0,0,0,0)",
          transition: "padding .25s ease, box-shadow .25s ease, background .25s ease",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <button
              onClick={() => scrollToId("top")}
              aria-label="Clasloop"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "transparent", border: "none", cursor: "pointer",
                padding: 0, fontFamily: "'Outfit',sans-serif",
              }}
            >
              <LogoMark size={36} />
              <span className="ph-header-logo-text" style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
                Clasloop
              </span>
            </button>
            {/* PR (landing scaffold): nav links ahora hacen smooth-scroll a
                secciones reales (antes eran <span> muertos). Los targets se
                refinarán cuando lleguen los demos del producto (Features →
                GenerationDemo). */}
            <nav className="ph-nav-links" style={{ display: "flex", gap: 28 }}>
              <button className="ph-nav-link" onClick={() => scrollToId("generate")} style={["generate", "print", "live", "types", "insights"].includes(activeSection) ? navLinkActiveStyle : navLinkStyle}>{t.navFeatures}</button>
              <button className="ph-nav-link" onClick={() => scrollToId("why")} style={activeSection === "why" ? navLinkActiveStyle : navLinkStyle}>{t.navSchools}</button>
              <button className="ph-nav-link" onClick={() => scrollToId("start")} style={activeSection === "start" ? navLinkActiveStyle : navLinkStyle}>{t.navPricing}</button>
            </nav>
          </div>
          <div className="ph-header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="ph-have-code-btn ph-cta-secondary"
              onClick={() => setCodeDialogOpen(true)}
              style={{
                fontSize: 15, padding: "9px 16px",
                border: `1px solid ${C.border}`, background: C.bg,
                borderRadius: 8, color: C.textSecondary, fontWeight: 500,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.haveCode}</button>
            <button
              className="ph-nav-link ph-sign-in-btn"
              onClick={handleLogin}
              style={{
                fontSize: 16, padding: "9px 14px",
                border: "none", background: "transparent",
                color: C.textSecondary, fontWeight: 500,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.signIn}</button>
            <button
              className="ph-btn-primary"
              onClick={handleSignUp}
              style={{
                fontSize: 16, padding: "10px 18px",
                background: C.accent, color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.signUpFree}</button>
            <div className="ph-header-langs" style={{ display: "flex", gap: 3, marginLeft: 10 }}>
              {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
                <button
                  key={c}
                  onClick={() => setLang(c)}
                  className="ph-lang-btn"
                  style={{
                    padding: "6px 11px", borderRadius: 7,
                    fontSize: 14, fontWeight: 600,
                    background: lang === c ? C.accentSoft : "transparent",
                    color: lang === c ? C.accent : C.textMuted,
                    border: "none", fontFamily: "'Outfit',sans-serif",
                  }}
                >{l}</button>
              ))}
            </div>
          </div>
          {/* Scroll-progress line — fills with overall page progress. */}
          <div
            ref={headerProgRef}
            className="ph-headerprog"
            aria-hidden="true"
            style={{
              position: "absolute", left: 0, right: 0, bottom: -1, height: 2,
              background: C.accent, transform: "scaleX(0)",
            }}
          />
        </header>

        {/* Journey rail — fixed left progress spine (desktop ≥1100px, CSS-gated). */}
        <JourneyRail t={t} activeSection={activeSection} onNavigate={scrollToId} />

        {/* Top anchor for the logo "scroll to top" */}
        <div id="top" />

        <Hero
          t={t}
          lang={lang}
          onSignUp={handleSignUp}
          onOpenCode={() => setCodeDialogOpen(true)}
          onSeeHow={() => scrollToId("generate")}
        />

        <GenerationDemo t={t} lang={lang} />
        <PrintAndScanDemo t={t} lang={lang} />
        <LiveSessionDemo t={t} lang={lang} />
        <QuestionTypes t={t} lang={lang} />
        <InsightsDemo t={t} lang={lang} />
        <WhyDaily t={t} />
        <FinalCTA t={t} onSignUp={handleSignUp} />
        <Footer t={t} />

        {/* DIALOG — code input */}
        {codeDialogOpen && (
          <CodeDialog
            t={t}
            code={code}
            setCode={setCode}
            codeValid={codeValid}
            onJoin={handleJoin}
            onClose={() => setCodeDialogOpen(false)}
          />
        )}

        {/* PR 43: el dialog auth-select fue eliminado en el rediseño OAuth.
            El rol se elige post-signup en RoleOnboarding.jsx, no acá. */}

      </div>
    </>
  );
}

// Shared style for header nav links. Rendered as <button> (not <span>) so
// they're keyboard-focusable and actually do something (smooth-scroll).
const navLinkStyle = {
  fontSize: 16,
  color: C.textSecondary,
  fontWeight: 500,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "'Outfit',sans-serif",
};

// Active variant — the section the visitor is currently in (scroll-spy).
const navLinkActiveStyle = {
  ...navLinkStyle,
  color: C.accent,
  fontWeight: 600,
};
