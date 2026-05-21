// ─── AuthScreen ──────────────────────────────────────────────────────────
//
// Extracted from App.jsx in PR 112 (split App.jsx). Behavior unchanged.
// Owns its own state for mode/name/email/password/error/loading and talks
// to supabase + Capacitor + googleOAuthNative directly. App.jsx renders
// this when there is no authed user.
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { googleOAuthNative } from '../lib/native-oauth';
import { captureError } from '../lib/sentry';
import { LogoMark } from '../components/Icons';
import { C } from '../components/tokens';

// ─── AuthScreen ──────────────────────────────────────────────────────────
//
// PR 43: rediseño total. Ya no hay role state. La pantalla solo maneja
// signup/signin con email-password o Google. El rol se elige DESPUÉS
// del primer signin/signup, en RoleOnboarding.jsx, una sola vez.
//
// Props:
//   initialMode - "signup" | "login"
//   onBack      - opcional, callback para volver atrás
//   lang        - código de idioma
function AuthScreen({ initialMode = "signup", onBack, lang = "en" }) {
  const t = AUTH_I18N[lang] || AUTH_I18N.en;
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || pass.length < 8) {
      setError(t.errorMissing);
      return;
    }
    setLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: name } },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      // PR 43: dos casos según config de Supabase:
      //   - "Confirm Email" OFF: signUp devuelve session inmediata. El
      //     SIGNED_IN event va a disparar fetchProfile en App.jsx, que
      //     detectará que no hay profile y mostrará RoleOnboarding.
      //   - "Confirm Email" ON: session es null hasta que el user clickee
      //     el link del email. Mostramos un info message acá y bajamos
      //     el loading. La app NO entra hasta que confirmen.
      if (data?.session) {
        // Sesión inmediata: dejamos que onAuthStateChange tome control.
        // No bajamos loading porque la app va a re-renderizar a otro
        // screen en milisegundos.
        return;
      }
      // Sin sesión inmediata → email confirmation pendiente
      setInfoMessage(t.checkEmail);
      setLoading(false);
    } catch (err) {
      captureError(err, { source: "App.AuthScreen.signUp" });
      console.error("[clasloop] signUp exception:", err);
      setError(err.message || t.errorGeneric);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !pass) {
      setError(t.errorMissing);
      return;
    }
    setLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      // Éxito: onAuthStateChange dispara, no tocamos loading.
    } catch (err) {
      captureError(err, { source: "App.AuthScreen.signIn" });
      console.error("[clasloop] signIn exception:", err);
      setError(err.message || t.errorGeneric);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    // PR 43: sin role state, sin localStorage, sin query params.
    // Solo iniciamos el flow OAuth. El callback va a App.jsx →
    // fetchProfile → si no hay profile, RoleOnboarding aparece.
    //
    // PR 51 (FASE 2 Capacitor): si estamos en la app nativa, el flow
    // es distinto — no podemos usar redirect a window.location porque
    // el redirect va a un deep link. googleOAuthNative se encarga.
    setError("");
    setInfoMessage("");

    if (Capacitor.isNativePlatform()) {
      try {
        await googleOAuthNative();
        // googleOAuthNative resuelve cuando la sesión está establecida.
        // El listener onAuthStateChange en App.jsx detecta SIGNED_IN y
        // dispara fetchProfile automáticamente. No hace falta hacer
        // nada más acá.
      } catch (err) {
        captureError(err, { source: "App.AuthScreen.googleOAuthNative" });
        console.error("[clasloop] Google OAuth (native) exception:", err);
        setError(err.message || t.errorGeneric);
      }
      return;
    }

    // Web flow.
    //
    // PR 58 fix bug 2: prompt='select_account' fuerza a Google a mostrar
    // siempre el selector de cuenta. Sin esto, si el browser tiene una
    // sesión Google activa, te loguea con esa sin preguntar — imposible
    // probar con otra cuenta sin modo incógnito.
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
    } catch (err) {
      captureError(err, { source: "App.AuthScreen.googleOAuth" });
      console.error("[clasloop] Google OAuth exception:", err);
      setError(err.message || t.errorGeneric);
    }
  };

  const inp = {
    fontFamily: "'Outfit',sans-serif",
    background: C.bg,
    border: `1px solid ${C.border}`,
    color: C.text,
    padding: "11px 14px",
    borderRadius: 8,
    fontSize: 14,
    width: "100%",
    outline: "none",
  };
  const btnP = {
    width: "100%",
    padding: "12px",
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 600,
    background: `linear-gradient(135deg,${C.accent},${C.purple})`,
    color: "#fff",
    border: "none",
    cursor: "pointer",
    opacity: loading ? 0.5 : 1,
    fontFamily: "'Outfit',sans-serif",
  };
  const btnS = {
    width: "100%",
    padding: "12px",
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 600,
    background: C.bg,
    color: C.text,
    border: `1px solid ${C.border}`,
    cursor: "pointer",
    fontFamily: "'Outfit',sans-serif",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "none",
              color: C.textSecondary,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 16,
              fontFamily: "'Outfit'",
            }}
          >{"\u2190"} {t.back}</button>
        )}
        <div style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <LogoMark size={36} />
          </div>
          <h2 style={{
            fontFamily: "'Outfit'",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 4,
            textAlign: "center",
          }}>{mode === "signup" ? t.titleSignup : t.titleLogin}</h2>
          <p style={{
            fontSize: 13,
            color: C.textSecondary,
            marginBottom: 20,
            fontFamily: "'Outfit'",
            textAlign: "center",
          }}>{mode === "signup" ? t.subtitleSignup : t.subtitleLogin}</p>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: C.redSoft,
              color: C.red,
              fontSize: 13,
              marginBottom: 14,
              fontFamily: "'Outfit'",
            }}>{error}</div>
          )}
          {infoMessage && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: C.accentSoft,
              color: C.accent,
              fontSize: 13,
              marginBottom: 14,
              fontFamily: "'Outfit'",
            }}>{infoMessage}</div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{ ...btnS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, fontSize: 14 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t.continueGoogle}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>{t.or}</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5, fontFamily: "'Outfit'" }}>{t.fullName}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t.fullNamePlaceholder} style={inp} />
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5, fontFamily: "'Outfit'" }}>{t.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5, fontFamily: "'Outfit'" }}>{t.password}</label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder={mode === "signup" ? t.passwordPlaceholderSignup : t.passwordPlaceholderLogin}
                style={inp}
                onKeyDown={e => e.key === "Enter" && (mode === "signup" ? handleSignup() : handleLogin())}
              />
            </div>
          </div>

          <button
            onClick={mode === "signup" ? handleSignup : handleLogin}
            disabled={loading}
            style={{ ...btnP, marginTop: 16 }}
          >
            {loading ? t.loading : (mode === "signup" ? t.createAccount : t.signIn)}
          </button>

          <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: C.textMuted, fontFamily: "'Outfit'" }}>
            {mode === "signup" ? (
              <>
                {t.alreadyAccount}{" "}
                <span
                  onClick={() => { setMode("login"); setError(""); setInfoMessage(""); }}
                  style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}
                >{t.signIn}</span>
              </>
            ) : (
              <>
                {t.noAccount}{" "}
                <span
                  onClick={() => { setMode("signup"); setError(""); setInfoMessage(""); }}
                  style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}
                >{t.signUp}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// i18n para AuthScreen
const AUTH_I18N = {
  en: {
    back: "Back",
    titleSignup: "Create your account",
    titleLogin: "Welcome back",
    subtitleSignup: "Get started in seconds",
    subtitleLogin: "Sign in to continue",
    continueGoogle: "Continue with Google",
    or: "or",
    fullName: "Full name",
    fullNamePlaceholder: "Your name",
    email: "Email",
    password: "Password",
    passwordPlaceholderSignup: "At least 8 characters",
    passwordPlaceholderLogin: "Your password",
    createAccount: "Create account",
    signIn: "Sign in",
    signUp: "Sign up",
    loading: "Loading…",
    alreadyAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    errorMissing: "Please fill in all fields (password 8+ chars)",
    errorGeneric: "Something went wrong. Try again.",
    checkEmail: "Check your email — we sent you a link to confirm your account.",
  },
  es: {
    back: "Atrás",
    titleSignup: "Creá tu cuenta",
    titleLogin: "Bienvenido de vuelta",
    subtitleSignup: "Empezá en segundos",
    subtitleLogin: "Iniciá sesión para continuar",
    continueGoogle: "Continuar con Google",
    or: "o",
    fullName: "Nombre completo",
    fullNamePlaceholder: "Tu nombre",
    email: "Email",
    password: "Contraseña",
    passwordPlaceholderSignup: "Al menos 8 caracteres",
    passwordPlaceholderLogin: "Tu contraseña",
    createAccount: "Crear cuenta",
    signIn: "Iniciar sesión",
    signUp: "Registrarse",
    loading: "Cargando…",
    alreadyAccount: "¿Ya tenés cuenta?",
    noAccount: "¿No tenés cuenta?",
    errorMissing: "Llená todos los campos (contraseña 8+ caracteres)",
    errorGeneric: "Algo salió mal. Intentá de nuevo.",
    checkEmail: "Revisá tu email — te enviamos un link para confirmar tu cuenta.",
  },
  ko: {
    back: "뒤로",
    titleSignup: "계정 만들기",
    titleLogin: "다시 오신 것을 환영합니다",
    subtitleSignup: "몇 초 만에 시작하세요",
    subtitleLogin: "계속하려면 로그인하세요",
    continueGoogle: "Google로 계속하기",
    or: "또는",
    fullName: "이름",
    fullNamePlaceholder: "이름을 입력하세요",
    email: "이메일",
    password: "비밀번호",
    passwordPlaceholderSignup: "최소 8자 이상",
    passwordPlaceholderLogin: "비밀번호 입력",
    createAccount: "계정 만들기",
    signIn: "로그인",
    signUp: "가입",
    loading: "로딩 중…",
    alreadyAccount: "이미 계정이 있으신가요?",
    noAccount: "계정이 없으신가요?",
    errorMissing: "모든 필드를 입력해 주세요 (비밀번호 8자 이상)",
    errorGeneric: "문제가 발생했습니다. 다시 시도해 주세요.",
    checkEmail: "이메일을 확인하세요 — 계정 확인 링크를 보냈습니다.",
  },
};

export default AuthScreen;
