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
import Modal from "./Modal";
// PR 74: i18n centralizado
import { useT } from "../i18n";

// PR 74: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "deleteAccountModal".

const CONFIRM_TOKEN = "DELETE";

export default function DeleteAccountModal({
  open,
  profile,
  lang = "en",
  onClose,
}) {
  const t = useT("deleteAccountModal", lang);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isTeacher = profile?.role === "teacher";

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setTyped("");
      setError("");
      setDeleting(false);
    }
  }, [open]);

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
    <Modal
      open
      onClose={onClose}
      canClose={!deleting}
      role="alertdialog"
      ariaLabelledBy="delete-account-title"
      backdropStyle={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15, 18, 25, 0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        fontFamily: "'Outfit', sans-serif",
      }}
      dialogStyle={{
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
    </Modal>
  );
}
