// ─── DeleteAccountModal — irreversible account deletion ────────────────
//
// PR 28: Opened from Settings > Danger zone. Calls the delete_my_account
// RPC (defined in supabase/phase28_delete_my_account.sql) which:
//   1. Wipes class_members, achievements, sessions, responses, progress
//   2. Cascade-deletes the profile (which wipes teacher-owned trees)
//   3. Deletes the auth.users row
//
// The user must type the word DELETE to enable the confirm button.
// This isn't legalese — it's a real safeguard against accidental clicks.
// GitHub, Stripe, and Notion all use the same pattern. The cost of a
// misclick here is total data loss with no recovery.
//
// On success, we sign out locally and reload the page. The app boots
// back into the unauthenticated state and the user can sign up fresh
// with the same email if they want.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "./tokens";

const i18n = {
  en: {
    title: "Delete your account",
    subtitle: "This is permanent and cannot be undone.",
    explainStudent: "Your profile, class memberships, answer history, achievements, and progress will be permanently deleted. You can sign up again later with the same email if you change your mind.",
    explainTeacher: "Your profile and ALL classes you own, including their decks, sessions, and student responses, will be permanently deleted. Students currently in your classes will lose access. This cannot be undone.",
    typeToConfirm: "Type DELETE to confirm",
    typeHint: "Must match exactly",
    cancel: "Cancel",
    deleteBtn: "Delete account permanently",
    deleting: "Deleting…",
    error: "Could not delete the account. Try again.",
    errorAuth: "Session expired. Sign in again before deleting.",
  },
  es: {
    title: "Eliminar tu cuenta",
    subtitle: "Esta acción es permanente y no se puede deshacer.",
    explainStudent: "Tu perfil, membresías de clase, historial de respuestas, logros y progreso serán eliminados permanentemente. Podés volver a registrarte después con el mismo email si cambiás de opinión.",
    explainTeacher: "Tu perfil y TODAS las clases que sos dueño, incluyendo sus decks, sesiones y respuestas de alumnos, serán eliminados permanentemente. Los alumnos actualmente en tus clases perderán acceso. Esto no se puede deshacer.",
    typeToConfirm: "Escribí DELETE para confirmar",
    typeHint: "Debe coincidir exactamente",
    cancel: "Cancelar",
    deleteBtn: "Eliminar cuenta permanentemente",
    deleting: "Eliminando…",
    error: "No se pudo eliminar la cuenta. Intentá de nuevo.",
    errorAuth: "La sesión expiró. Iniciá sesión de nuevo antes de eliminar.",
  },
  ko: {
    title: "계정 삭제",
    subtitle: "이 작업은 영구적이며 되돌릴 수 없습니다.",
    explainStudent: "프로필, 수업 참여 기록, 답변 기록, 업적 및 진행 상황이 영구적으로 삭제됩니다. 마음이 바뀌면 나중에 같은 이메일로 다시 가입할 수 있습니다.",
    explainTeacher: "귀하의 프로필과 소유한 모든 수업(덱, 세션, 학생 응답 포함)이 영구적으로 삭제됩니다. 현재 수업에 있는 학생들은 접근 권한을 잃습니다. 이 작업은 되돌릴 수 없습니다.",
    typeToConfirm: "확인하려면 DELETE를 입력하세요",
    typeHint: "정확히 일치해야 합니다",
    cancel: "취소",
    deleteBtn: "계정 영구 삭제",
    deleting: "삭제 중…",
    error: "계정을 삭제할 수 없습니다. 다시 시도하세요.",
    errorAuth: "세션이 만료되었습니다. 삭제하기 전에 다시 로그인하세요.",
  },
};

const CONFIRM_TOKEN = "DELETE";

export default function DeleteAccountModal({
  open,
  profile,
  lang = "en",
  onClose,
}) {
  const t = i18n[lang] || i18n.en;
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isTeacher = profile?.role === "teacher";

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setTyped("");
      setError("");
      setDeleting(false);
    }
  }, [open]);

  // Esc closes (only when not in the middle of deleting)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !deleting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, deleting, onClose]);

  if (!open) return null;

  const canDelete = typed === CONFIRM_TOKEN && !deleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("delete_my_account");

    if (rpcError) {
      console.error("[clasloop] delete_my_account RPC failed:", rpcError);
      // "not authenticated" is the explicit auth check inside the
      // function; everything else is generic.
      if (rpcError.message?.includes("not authenticated")) {
        setError(t.errorAuth);
      } else {
        setError(t.error);
      }
      setDeleting(false);
      return;
    }

    // RPC succeeded — the auth.users row is gone. Clear the local
    // session so supabase-js stops sending the now-invalid JWT, then
    // do a full reload to drop every cached state and re-bootstrap
    // the app in unauthenticated mode.
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15, 18, 25, 0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        style={{
          background: C.bg,
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          padding: "26px 28px 22px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.4)",
          borderTop: `4px solid ${C.red}`,
        }}
      >
        {/* Warning icon */}
        <div style={{
          width: 52, height: 52,
          margin: "0 auto 16px",
          borderRadius: "50%",
          background: C.redSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.red,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2
          id="delete-account-title"
          style={{
            fontSize: 20, fontWeight: 700,
            color: C.text,
            margin: "0 0 6px",
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          {t.title}
        </h2>
        <p style={{
          fontSize: 13.5, fontWeight: 500,
          color: C.red,
          margin: "0 0 14px",
          textAlign: "center",
        }}>
          {t.subtitle}
        </p>

        {/* Role-specific explanation */}
        <div style={{
          padding: "12px 14px",
          background: C.redSoft,
          borderRadius: 8,
          marginBottom: 18,
        }}>
          <p style={{
            fontSize: 13, lineHeight: 1.5,
            color: C.text,
            margin: 0,
          }}>
            {isTeacher ? t.explainTeacher : t.explainStudent}
          </p>
        </div>

        {/* Type to confirm */}
        <label style={{
          display: "block",
          fontSize: 12, fontWeight: 600,
          color: C.textSecondary,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}>
          {t.typeToConfirm}
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            if (error) setError("");
          }}
          placeholder={CONFIRM_TOKEN}
          disabled={deleting}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
          style={{
            width: "100%",
            padding: "11px 14px",
            fontSize: 16,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: C.text,
            background: C.bg,
            border: `1.5px solid ${error ? C.red : C.border}`,
            borderRadius: 8,
            outline: "none",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        />
        <p style={{
          fontSize: 11, color: C.textMuted,
          margin: "5px 0 0", textAlign: "center",
        }}>
          {t.typeHint}
        </p>

        {error && (
          <div style={{
            marginTop: 12,
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

        {/* Action buttons */}
        <div style={{
          display: "flex",
          gap: 8,
          marginTop: 18,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1,
              padding: "11px 14px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: C.textSecondary,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            style={{
              flex: 1.4,
              padding: "11px 14px",
              background: canDelete ? C.red : C.bgSoft,
              border: "none",
              borderRadius: 9,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: canDelete ? "#FFFFFF" : C.textMuted,
              cursor: canDelete ? "pointer" : "not-allowed",
              transition: "background 0.15s ease",
            }}
          >
            {deleting ? t.deleting : t.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
