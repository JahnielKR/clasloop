import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, CIcon } from "../components/Icons";
import { validateGuestName, loadGuestSession, clearGuestSession } from "../lib/guest-session";
import StudentJoin from "./StudentJoin";
import { C, MONO } from "../components/tokens";

const i18n = {
  en: {
    joinSession: "Join session",
    enterCode: "Enter the 6-digit code your teacher gave you",
    enterName: "What's your name?",
    namePlaceholder: "Your name",
    codePlaceholder: "Code",
    join: "Join", joining: "Joining...",
    notFound: "Session not found or guests not allowed",
    nameInvalid: "Please choose an appropriate name",
    nameTooShort: "Please enter your name",
    nameTooLong: "Name is too long (max 30 chars)",
    haveAccount: "Have an account?", signIn: "Sign in",
    backHome: "Back to home",
    reconnecting: "Reconnecting...",
    kickedTitle: "You were removed from this session",
    kickedHint: "Your teacher removed you from the lobby. You can rejoin with a different name if needed.",
    rejoin: "Rejoin",
  },
  es: {
    joinSession: "Unirse a la sesión",
    enterCode: "Ingresa el código de 6 dígitos que te dio tu profe",
    enterName: "¿Cómo te llamas?",
    namePlaceholder: "Tu nombre",
    codePlaceholder: "Código",
    join: "Entrar", joining: "Entrando...",
    notFound: "Sesión no encontrada o invitados no permitidos",
    nameInvalid: "Elige un nombre apropiado",
    nameTooShort: "Ingresa tu nombre",
    nameTooLong: "Nombre muy largo (máx 30 caracteres)",
    haveAccount: "¿Tienes cuenta?", signIn: "Inicia sesión",
    backHome: "Volver al inicio",
    reconnecting: "Reconectando...",
    kickedTitle: "Fuiste retirado de esta sesión",
    kickedHint: "Tu profe te sacó del lobby. Puedes volver a entrar con otro nombre si quieres.",
    rejoin: "Volver a entrar",
  },
  ko: {
    joinSession: "세션 참여",
    enterCode: "선생님이 알려준 6자리 코드를 입력하세요",
    enterName: "이름이 뭐예요?",
    namePlaceholder: "이름",
    codePlaceholder: "코드",
    join: "참여", joining: "참여 중...",
    notFound: "세션을 찾을 수 없거나 게스트가 허용되지 않습니다",
    nameInvalid: "적절한 이름을 선택하세요",
    nameTooShort: "이름을 입력하세요",
    nameTooLong: "이름이 너무 깁니다 (최대 30자)",
    haveAccount: "계정이 있나요?", signIn: "로그인",
    backHome: "홈으로",
    reconnecting: "다시 연결 중...",
    kickedTitle: "이 세션에서 제외되었습니다",
    kickedHint: "선생님이 로비에서 내보냈습니다. 다른 이름으로 다시 참여할 수 있습니다.",
    rejoin: "다시 참여",
  },
};

const inp = {
  fontFamily: "'Outfit',sans-serif",
  background: C.bg, border: `1px solid ${C.border}`, color: C.text,
  padding: "12px 14px", borderRadius: 10, fontSize: 15,
  width: "100%", outline: "none",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box}
  body{margin:0;background:${C.bgSoft};font-family:'Outfit',sans-serif}
  @keyframes gj-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  .gj-fade { animation: gj-fade .3s ease both }
  .gj-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accentSoft} }
`;

export default function GuestJoin({ initialCode = "" }) {
  // Detect language from URL ?lang= or fall back to browser
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlLang = urlParams.get("lang");
  const browserLang = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en";
  const initialLang = ["en", "es", "ko"].includes(urlLang) ? urlLang
    : ["en", "es", "ko"].includes(browserLang) ? browserLang : "en";
  const [lang, setLang] = useState(initialLang);
  const t = i18n[lang] || i18n.en;

  // Read code from URL or prop
  const codeFromURL = urlParams.get("code") || initialCode;
  const [code, setCode] = useState(codeFromURL.replace(/[^0-9]/g, "").slice(0, 6));
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  // phase: "form" | "reconnecting" | "quiz" | "kicked"
  const [phase, setPhase] = useState("form");
  const [guestToken, setGuestToken] = useState("");

  const codeValid = /^[0-9]{6}$/.test(code);

  // ── On mount: try to reconnect from localStorage ──
  // If we have a saved guest session for this code, jump straight to quiz
  // mode with guestToken set. StudentJoin will skip INSERT and fetch the
  // existing participant row, or call onGuestKicked if the row was removed
  // or kicked.
  useEffect(() => {
    if (!codeValid) return;
    const saved = loadGuestSession(code);
    if (!saved || !saved.token || !saved.name) return;
    setName(saved.name);
    setGuestToken(saved.token);
    setPhase("reconnecting");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force light theme while mounted — same rationale as PublicHome. Guest
  // join is a marketing-adjacent entry point, students arrive here without
  // an account and we want consistent visuals regardless of their OS theme.
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.getAttribute("data-theme") || "light";
    html.setAttribute("data-theme", "light");
    return () => { html.setAttribute("data-theme", previous); };
  }, []);

  const handleSubmit = () => {
    setError("");
    if (!codeValid) { setError(t.notFound); return; }
    const v = validateGuestName(name);
    if (!v.ok) {
      setError(
        v.reason === "too_short" ? t.nameTooShort
        : v.reason === "too_long" ? t.nameTooLong
        : t.nameInvalid
      );
      return;
    }
    setName(v.name); // use trimmed/normalized name
    setGuestToken(""); // fresh join, no reconnect token
    setPhase("quiz");
  };

  // Called by StudentJoin when the guest is kicked (either at reconnect time
  // because their saved row is gone/kicked, or in real-time during the lobby).
  const handleKicked = (reason) => {
    // Clear localStorage so we don't try to reconnect again
    clearGuestSession(code);
    setGuestToken("");
    if (reason === "kicked") {
      setPhase("kicked");
    } else {
      // Token didn't match anything — just send them back to the form
      setPhase("form");
    }
  };

  const handleRejoin = () => {
    setName("");
    setError("");
    setPhase("form");
  };

  // ── Phase: kicked screen ──
  if (phase === "kicked") {
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="gj-fade" style={{
            background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
            padding: 32, maxWidth: 420, width: "100%", textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: C.redSoft, color: C.red,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit',sans-serif", color: C.text, marginBottom: 8 }}>
              {t.kickedTitle}
            </h2>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 20 }}>
              {t.kickedHint}
            </p>
            <button
              onClick={handleRejoin}
              style={{
                padding: "10px 20px", borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                background: C.accentSoft, color: C.accent,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t.rejoin}</button>
          </div>
        </div>
      </>
    );
  }

  // ── Phase: quiz (fresh join OR reconnect) ──
  if (phase === "quiz" || phase === "reconnecting") {
    // Hand off to StudentJoin in guest mode. If guestToken is set, StudentJoin
    // will skip the INSERT and fetch the existing participant row.
    return (
      <>
        <style>{css}</style>
        <StudentJoin
          lang={lang}
          guestMode
          guestPin={code}
          guestName={name}
          guestToken={guestToken}
          onGuestKicked={handleKicked}
        />
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="gj-fade" style={{
          background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: 32, maxWidth: 420, width: "100%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-flex", marginBottom: 10 }}><LogoMark size={44} /></div>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Outfit',sans-serif", color: C.text, marginBottom: 4 }}>
              {t.joinSession}
            </h1>
          </div>

          {/* Code field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
              {t.enterCode}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={t.codePlaceholder}
              className="gj-input"
              style={{
                ...inp,
                fontFamily: MONO,
                fontSize: 28, fontWeight: 700,
                letterSpacing: ".18em", textAlign: "center",
                padding: "14px 14px",
                color: C.accent,
              }}
              autoFocus={!code}
            />
          </div>

          {/* Name field */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
              {t.enterName}
            </label>
            <input
              type="text"
              maxLength={30}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={t.namePlaceholder}
              className="gj-input"
              style={inp}
              autoFocus={Boolean(code)}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: C.redSoft, color: C.red, fontSize: 13,
              marginBottom: 14, display: "flex", alignItems: "center", gap: 6,
            }}>
              <CIcon name="warning" size={14} inline /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!codeValid || !name.trim()}
            style={{
              width: "100%", padding: 14, borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              background: (codeValid && name.trim()) ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.bgSoft,
              color: (codeValid && name.trim()) ? "#fff" : C.textMuted,
              border: "none", cursor: (codeValid && name.trim()) ? "pointer" : "default",
              fontFamily: "'Outfit',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <CIcon name="rocket" size={16} inline /> {t.join}
          </button>

          {/* Sign-in option */}
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: C.textMuted }}>
            {t.haveAccount}{" "}
            <a href="/" style={{ color: C.accent, fontWeight: 600, textDecoration: "none" }}>
              {t.signIn}
            </a>
          </div>

          {/* Lang switcher */}
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 16 }}>
            {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
              <button
                key={c}
                onClick={() => setLang(c)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: lang === c ? C.accentSoft : "transparent",
                  color: lang === c ? C.accent : C.textMuted,
                  border: "none", cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
