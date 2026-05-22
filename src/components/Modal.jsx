import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// PR 146 (H23): shared accessible modal primitive. Adds the a11y mechanics
// every modal in the app was missing — focus trap, return focus, role +
// aria-modal, and Escape — while staying visually neutral: callers pass their
// own backdropStyle/dialogStyle, so migrating an existing modal is a wrapper
// swap with no visual change. `canClose` replaces the per-modal `!saving` /
// `!deleting` guards: when false, Escape and backdrop clicks are ignored.

const FOCUSABLE =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';

const DEFAULT_BACKDROP = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const DEFAULT_DIALOG = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  maxWidth: 480,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
};

export default function Modal({
  open = true,
  onClose,
  canClose = true,
  role = "dialog",
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  closeOnEscape = true,
  closeOnBackdrop = true,
  lockScroll = true,
  initialFocusRef,
  backdropStyle,
  dialogStyle,
  backdropClassName,
  dialogClassName,
  children,
}) {
  const dialogRef = useRef(null);

  // Return focus: capture whatever was focused before the modal opened and
  // restore it when the modal closes OR unmounts. Parents often unmount the
  // modal instead of toggling `open`, so the cleanup has to cover both.
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;

    // Initial focus: caller's ref, else an explicit autofocus child, else the
    // first focusable child, else the dialog itself (so Tab stays trapped even
    // when the dialog has no controls).
    const target =
      initialFocusRef?.current ||
      dialogRef.current?.querySelector("[autofocus]") ||
      dialogRef.current?.querySelector(FOCUSABLE) ||
      dialogRef.current;
    target?.focus?.();

    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open, initialFocusRef]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open || !lockScroll) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  // Escape to close (document-level so it fires regardless of focus).
  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && canClose) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, canClose, onClose]);

  // Focus trap: keep Tab / Shift+Tab cycling inside the dialog.
  const onKeyDownTrap = useCallback((e) => {
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE);
    if (!focusables || focusables.length === 0) {
      e.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!open) return null;

  return createPortal(
    <div
      className={backdropClassName}
      style={backdropStyle || DEFAULT_BACKDROP}
      onMouseDown={(e) => {
        if (closeOnBackdrop && canClose && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={dialogClassName}
        style={dialogStyle || DEFAULT_DIALOG}
        onKeyDown={onKeyDownTrap}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
