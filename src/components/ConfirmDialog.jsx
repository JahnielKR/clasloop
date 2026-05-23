// ─── ConfirmDialog ───────────────────────────────────────────────────────────
// Styled, accessible confirm dialog — the in-app replacement for native
// window.confirm() in the app chrome (deck delete, etc.). Built on the shared
// Modal primitive (focus trap, Escape, return-focus) + Button, so it matches
// the rest of the platform instead of a raw browser prompt.
//
//   <ConfirmDialog
//     title={t.deleteConfirm}
//     confirmLabel={t.delete} cancelLabel={t.cancel}
//     variant="danger" loading={deleting}
//     onConfirm={doDelete} onCancel={close} />
//
// `variant` is the confirm button's variant (danger | primary). While
// `loading`, the dialog can't be dismissed and the confirm button shows a
// spinner.
import Modal from "./Modal";
import Button from "./ui/Button";
import { C, R, SH, TYPE } from "./tokens";

export default function ConfirmDialog({
  open = true,
  title,
  body,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      canClose={!loading}
      ariaLabel={title || body}
      dialogStyle={{
        background: C.bg,
        color: C.text,
        borderRadius: R.lg,
        border: `1px solid ${C.border}`,
        boxShadow: SH.lg,
        padding: "22px 24px 18px",
        maxWidth: 400,
        width: "100%",
        animation: "pop .18s ease-out both",
      }}
    >
      {title && (
        <h2 style={{ ...TYPE.h3, color: C.text, margin: body ? "0 0 8px" : "0 0 20px" }}>{title}</h2>
      )}
      {body && (
        <p style={{ ...TYPE.body, color: C.textSecondary, margin: "0 0 20px" }}>{body}</p>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {cancelLabel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        )}
        <Button variant={variant} size="sm" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
