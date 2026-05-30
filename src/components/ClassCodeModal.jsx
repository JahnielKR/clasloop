// ─── ClassCodeModal — gating modal for students without a class ──────────
//
// Renders on top of the app shell (which is visible but dimmed) when a
// student account has no class membership yet. The student MUST either:
//   - Enter a valid class code and join (modal closes, app proceeds)
//   - Click "Sign out" (returns to the auth screen)
//
// There's no Esc-to-close, no click-outside-to-close, no "skip for now".
// Students arrive in Clasloop because a teacher told them to; without a
// class code the app has nothing meaningful to show them.
//
// Used by App.jsx — see the interception block right after the avatar
// onboarding check. Renders BEFORE avatar onboarding (no class = no
// point in customizing).

import { useState } from "react";
import { joinClass } from "../lib/classes";
import { supabase } from "../lib/supabase";
import { C, SCRIM } from "./tokens";
import Modal from "./Modal";

// PR 74: i18n centralizado
import { useT } from "../i18n";
// PR 74: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "classCodeModal".

export default function ClassCodeModal({ profile, lang = "en", onJoined }) {
  const t = useT("classCodeModal", lang);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // NO escape handlers. The student can't dismiss this with Esc or by
  // clicking outside — only by joining or signing out, so the Modal below
  // sets closeOnEscape / closeOnBackdrop to false. The Modal primitive owns
  // the body-scroll lock, focus trap and return-focus.

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t.errorMissingCode);
      return;
    }
    setJoining(true);
    setError("");
    const studentName = profile?.full_name || "Student";
    const { class: joinedClass, error: err } = await joinClass(
      trimmed,
      studentName,
      profile?.id,
    );
    if (err && !joinedClass) {
      // Map the lib's English error strings to our i18n
      const msg = err.toLowerCase();
      if (msg.includes("not found")) setError(t.errorNotFound);
      else if (msg.includes("already")) setError(t.errorAlreadyJoined);
      else setError(t.errorGeneric);
      setJoining(false);
      return;
    }
    // "Already joined" with class returned is still a success path —
    // the row exists, the student is in. Close the modal and let the
    // app re-render with the new membership.
    setJoining(false);
    onJoined && onJoined(joinedClass);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // App.jsx auth state listener will re-render to the auth screen.
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !joining) {
      e.preventDefault();
      handleJoin();
    }
  };

  return (
    <Modal
      open
      closeOnEscape={false}
      closeOnBackdrop={false}
      ariaLabelledBy="class-code-modal-title"
      backdropStyle={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: SCRIM,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Outfit', sans-serif",
      }}
      dialogStyle={{
        background: C.bg,
        borderRadius: 16,
        width: "100%",
        maxWidth: 440,
        padding: "32px 28px 24px",
        boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
      }}
    >
        {/* Decorative icon — gives the modal a face beyond pure text */}
        <div style={{
          width: 56, height: 56,
          margin: "0 auto 18px",
          borderRadius: 14,
          background: C.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.accent,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>

        <h2
          id="class-code-modal-title"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.text,
            margin: "0 0 6px",
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          {t.title}
        </h2>
        <p style={{
          fontSize: 14,
          color: C.textSecondary,
          margin: "0 0 22px",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          {t.subtitle}
        </p>

        <label style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: C.textSecondary,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {t.inputLabel}
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            // Normalize: uppercase + remove spaces. Class codes are
            // uppercase tokens like "SPAN-9A".
            setCode(e.target.value.toUpperCase().replace(/\s+/g, ""));
            if (error) setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={t.inputPlaceholder}
          disabled={joining}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
          style={{
            width: "100%",
            padding: "13px 16px",
            fontSize: 17,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: C.text,
            background: C.bg,
            border: `1.5px solid ${error ? C.red : C.border}`,
            borderRadius: 10,
            outline: "none",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        />

        {error && (
          <div style={{
            marginTop: 10,
            padding: "9px 13px",
            background: C.redSoft,
            color: C.red,
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || !code.trim()}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "13px 18px",
            background: C.accent,
            border: "none",
            borderRadius: 10,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: "#FFFFFF",
            cursor: joining ? "wait" : (code.trim() ? "pointer" : "not-allowed"),
            opacity: (joining || !code.trim()) ? 0.6 : 1,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!joining && code.trim()) e.currentTarget.style.background = "#1A6FCE";
          }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.accent; }}
        >
          {joining ? t.joining : t.joinBtn}
        </button>

        <p style={{
          fontSize: 12,
          color: C.textMuted,
          margin: "14px 0 0",
          textAlign: "center",
        }}>
          {t.helpHint}
        </p>

        {/* Sign out — the only escape hatch. Subtle but visible. */}
        <div style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={joining}
            style={{
              background: "transparent",
              border: "none",
              color: C.textMuted,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              cursor: joining ? "not-allowed" : "pointer",
              padding: "4px 8px",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
            onMouseEnter={(e) => { if (!joining) e.currentTarget.style.color = C.red; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
          >
            {t.signOut}
          </button>
        </div>
    </Modal>
  );
}
