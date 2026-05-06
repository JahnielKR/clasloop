import { useState, useEffect } from "react";
import { LogoMark, CIcon, TeacherInline, StudentInline } from "../components/Icons";
import Cleo from "../components/Cleo";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B", border: "#E8E8E4",
};
const MONO = "'JetBrains Mono', monospace";

const i18n = {
  en: {
    tagline: "Help your students remember what you teach.",
    sub: "Spaced repetition built into your daily class routine.",
    joinTitle: "Got a code?",
    joinHint: "Enter the 6-digit code from your teacher",
    codePlaceholder: "Code",
    join: "Join",
    or: "or",
    signIn: "Sign in",
    signUp: "Create account",
    teacherSignup: "I'm a teacher",
    studentSignup: "I'm a student",
    haveAccount: "Already have an account?",
  },
  es: {
    tagline: "Ayuda a tus estudiantes a recordar lo que enseñas.",
    sub: "Repetición espaciada integrada en tu rutina diaria de clase.",
    joinTitle: "¿Tienes un código?",
    joinHint: "Ingresa el código de 6 dígitos de tu profe",
    codePlaceholder: "Código",
    join: "Entrar",
    or: "o",
    signIn: "Iniciar sesión",
    signUp: "Crear cuenta",
    teacherSignup: "Soy profe",
    studentSignup: "Soy estudiante",
    haveAccount: "¿Ya tienes cuenta?",
  },
  ko: {
    tagline: "학생들이 배운 것을 기억하도록 도와주세요.",
    sub: "매일 수업에 통합된 간격 반복 학습.",
    joinTitle: "코드가 있나요?",
    joinHint: "선생님이 알려준 6자리 코드를 입력하세요",
    codePlaceholder: "코드",
    join: "참여",
    or: "또는",
    signIn: "로그인",
    signUp: "계정 만들기",
    teacherSignup: "저는 선생님이에요",
    studentSignup: "저는 학생이에요",
    haveAccount: "이미 계정이 있나요?",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *{box-sizing:border-box}
  body{margin:0;background:${C.bgSoft};font-family:'Outfit',sans-serif}
  @keyframes ph-fade { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  .ph-fade { animation: ph-fade .35s ease both }
  .ph-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accent}22 }
  .ph-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(35,131,226,0.25) }
  .ph-btn-primary:active:not(:disabled) { transform: translateY(0) }
  .ph-btn-secondary:hover { background: ${C.bgSoft} !important; border-color: ${C.textMuted} !important }
  .ph-role-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); border-color: ${C.accent} !important }
  .ph-lang-btn { transition: all .15s ease }
  @media (max-width: 540px) {
    .ph-card { padding: 24px !important; border-radius: 16px !important }
    .ph-tagline { font-size: 22px !important; line-height: 1.3 !important }
    .ph-sub { font-size: 14px !important }
    .ph-code-input { font-size: 24px !important; padding: 12px !important }
    .ph-cleo { width: 70px !important }
    .ph-cleo svg { width: 70px !important; height: auto !important }
  }
`;

export default function PublicHome({ onSignIn, onSignUp }) {
  // ── Language detection: URL ?lang= → browser → fallback EN ──
  const urlParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const urlLang = urlParams.get("lang");
  const browserLang = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en";
  const initialLang = ["en", "es", "ko"].includes(urlLang) ? urlLang
    : ["en", "es", "ko"].includes(browserLang) ? browserLang : "en";
  const [lang, setLang] = useState(initialLang);
  const t = i18n[lang] || i18n.en;

  const [code, setCode] = useState("");
  const codeValid = /^[0-9]{6}$/.test(code);

  // Mode: "home" | "auth-select" — default home, "auth-select" shown when user
  // clicks Sign in / Create account, mirroring the role picker the AuthScreen
  // already implements internally.
  const [mode, setMode] = useState("home");

  const handleJoin = () => {
    if (!codeValid) return;
    // Hand off to the dedicated guest route. Same origin, full reload — that
    // way main.jsx routes to GuestJoin cleanly and we keep its existing
    // localStorage reconnect logic untouched.
    window.location.href = `/join?code=${code}&lang=${lang}`;
  };

  const handleTeacher = () => onSignUp?.("teacher");
  const handleStudent = () => onSignUp?.("student");
  const handleLogin = () => onSignIn?.();

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at top, ${C.accentSoft} 0%, ${C.bgSoft} 50%, ${C.bgSoft} 100%)`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
      }}>
        {/* ── Header: logo + brand ── */}
        <div className="ph-fade" style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 28,
        }}>
          <LogoMark size={42} />
          <span style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: 22, fontWeight: 700, color: C.text,
            letterSpacing: "-0.01em",
          }}>Clasloop</span>
        </div>

        {/* ── Tagline ── */}
        <div className="ph-fade" style={{ textAlign: "center", marginBottom: 28, maxWidth: 520 }}>
          <h1 className="ph-tagline" style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: 28, fontWeight: 700, color: C.text,
            margin: 0, marginBottom: 8, lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}>{t.tagline}</h1>
          <p className="ph-sub" style={{
            fontSize: 15, color: C.textSecondary,
            margin: 0, lineHeight: 1.5,
          }}>{t.sub}</p>
        </div>

        {/* ── Main card (with Cleo hanging from top-right corner) ── */}
        <div className="ph-card-wrap" style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
        }}>
          {/* Cleo, peeking from the left side of the card (vertically centered) */}
          <div className="ph-cleo" aria-hidden="true" style={{
            position: "absolute",
            top: "50%",
            left: 0,
            transform: "translate(-100%, -50%)",
            width: 100,
            pointerEvents: "none",
            zIndex: 2,
          }}>
            <Cleo size={100} />
          </div>

          {mode === "home" ? (
          <div className="ph-card ph-fade" style={{
            background: C.bg, borderRadius: 20,
            border: `1px solid ${C.border}`,
            padding: 32, width: "100%", maxWidth: 440,
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}>
            {/* Code section */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: 17, fontWeight: 700, color: C.text,
                margin: 0, marginBottom: 4,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <CIcon name="rocket" size={18} inline /> {t.joinTitle}
              </h2>
              <p style={{
                fontSize: 13, color: C.textSecondary,
                margin: 0, marginBottom: 12,
              }}>{t.joinHint}</p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                placeholder={t.codePlaceholder}
                className="ph-input ph-code-input"
                style={{
                  fontFamily: MONO,
                  background: C.bg,
                  border: `2px solid ${C.border}`,
                  color: C.accent,
                  padding: "14px",
                  borderRadius: 12,
                  fontSize: 30, fontWeight: 700,
                  letterSpacing: ".22em", textAlign: "center",
                  width: "100%", outline: "none",
                  transition: "border-color .15s, box-shadow .15s",
                }}
                autoFocus
              />

              <button
                onClick={handleJoin}
                disabled={!codeValid}
                className="ph-btn-primary"
                style={{
                  width: "100%", marginTop: 12,
                  padding: 14, borderRadius: 12,
                  fontSize: 15, fontWeight: 600,
                  background: codeValid
                    ? `linear-gradient(135deg, ${C.accent}, ${C.purple})`
                    : C.bgSoft,
                  color: codeValid ? "#fff" : C.textMuted,
                  border: "none",
                  cursor: codeValid ? "pointer" : "default",
                  fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "transform .15s, box-shadow .15s, background .15s",
                }}
              >
                {t.join}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              margin: "20px 0 16px",
            }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{t.or}</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Sign in / Sign up */}
            <button
              onClick={() => setMode("auth-select")}
              className="ph-btn-secondary"
              style={{
                width: "100%", padding: 12, borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                background: C.bg, color: C.text,
                border: `1.5px solid ${C.border}`,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
                transition: "background .15s, border-color .15s",
              }}
            >
              {t.signUp} / {t.signIn}
            </button>
          </div>
        ) : (
          // ── Mode: auth-select (role picker) ──
          <div className="ph-card ph-fade" style={{
            background: C.bg, borderRadius: 20,
            border: `1px solid ${C.border}`,
            padding: 32, width: "100%", maxWidth: 440,
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}>
            <button
              onClick={() => setMode("home")}
              style={{
                background: "transparent", border: "none",
                color: C.textSecondary, fontSize: 13,
                cursor: "pointer", marginBottom: 12,
                fontFamily: "'Outfit',sans-serif",
                padding: 0,
              }}
            >← Back</button>

            <h2 style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: 20, fontWeight: 700, color: C.text,
              margin: 0, marginBottom: 18,
            }}>{t.signUp}</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleTeacher}
                className="ph-role-btn"
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  fontSize: 15, fontWeight: 600,
                  background: C.bg, color: C.text,
                  border: `1.5px solid ${C.border}`,
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "transform .15s, box-shadow .15s, border-color .15s",
                  textAlign: "left",
                }}
              >
                <TeacherInline size={22} />
                {t.teacherSignup}
              </button>
              <button
                onClick={handleStudent}
                className="ph-role-btn"
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  fontSize: 15, fontWeight: 600,
                  background: C.bg, color: C.text,
                  border: `1.5px solid ${C.border}`,
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "transform .15s, box-shadow .15s, border-color .15s",
                  textAlign: "left",
                }}
              >
                <StudentInline size={22} />
                {t.studentSignup}
              </button>
            </div>

            <p style={{
              textAlign: "center", marginTop: 20, marginBottom: 0,
              fontSize: 13, color: C.textMuted,
              fontFamily: "'Outfit',sans-serif",
            }}>
              {t.haveAccount}{" "}
              <span
                onClick={handleLogin}
                style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}
              >{t.signIn}</span>
            </p>
          </div>
        )}
        </div>

        {/* ── Lang switcher (bottom) ── */}
        <div style={{ display: "flex", gap: 4, marginTop: 24 }}>
          {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
            <button
              key={c}
              onClick={() => setLang(c)}
              className="ph-lang-btn"
              style={{
                padding: "6px 12px", borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: lang === c ? C.accentSoft : "transparent",
                color: lang === c ? C.accent : C.textMuted,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{l}</button>
          ))}
        </div>
      </div>
    </>
  );
}
