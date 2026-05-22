// ─── components/forms/field-styles.js ───────────────────────────────────
//
// PR 139 (M3): single source of truth for the standard text input / select
// style. This exact object was copy-pasted into ~10 files, and the padding
// had drifted ("10px 14px" in most, "11px 14px" in a few) — same intended
// look, accidental divergence. Now there's one definition; the 11px copies
// are unified to 10px here.
//
// Usage (keeps existing call sites `style={inp}` / `style={sel}` unchanged):
//   import { inputStyle as inp, selectStyle as sel } from "../components/forms/field-styles";
//
// NOTE: a couple of screens use deliberately different sizes and are NOT
// covered here — GuestJoin (larger, mobile entry) and TeacherProfile's
// compact filter select. Those keep their own local style on purpose.

import { C } from "../tokens";

export const inputStyle = {
  fontFamily: "'Outfit',sans-serif",
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 14,
  width: "100%",
  outline: "none",
};

export const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};
