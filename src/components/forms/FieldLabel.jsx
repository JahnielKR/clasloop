// ─── FieldLabel ──────────────────────────────────────────────────────────
// The standard form-field label. The same 13/500 secondary-text label with a
// small gap below was copy-pasted inline across the deck editor and every
// teacher form, and it had drifted (12 vs 13 px, marginBottom 5 vs 6). One
// primitive keeps the label rhythm (marginBottom = SP.xs) and the "required *"
// affordance identical everywhere.
//
//   <FieldLabel htmlFor="title" required>{t.title}</FieldLabel>
//   <FieldLabel dense>{t.aiTypeLabel}</FieldLabel>   // compact panels
//
// `dense` is the tighter 11/600 label used inside data-dense panels (e.g. the
// AI generator), per the density-by-function direction.

import { C, TYPE, SP } from "../tokens";

export function FieldLabel({ children, required = false, htmlFor, dense = false, style }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        ...(dense ? TYPE.labelDense : TYPE.label),
        color: C.textSecondary,
        marginBottom: SP.xs,
        ...style,
      }}
    >
      {children}
      {required ? " *" : null}
    </label>
  );
}
