// ─── Type scale ──────────────────────────────────────────────────────────
// The voice of the product. Outfit carries display/headings (geometric,
// confident); DM Sans carries body (warm, readable); JetBrains Mono carries
// codes/PINs. Each preset is a ready-to-spread inline-style object so a title
// is `style={{ ...TYPE.h1, color: C.text }}` everywhere — same size/weight/
// rhythm on every page.
//
// Values are drawn from the patterns already in use (h1 24/700/-0.015em,
// uppercase caption 10.5/0.09em like the sidebar section titles, body
// 14/1.55) so adopting them is faithful, not a redesign.

const DISPLAY = "'Outfit', sans-serif";
const BODY = "'DM Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

export const TYPE = {
  // Big moments: hero numbers, celebration, empty-state titles on large screens
  display: { fontFamily: DISPLAY, fontSize: 32, fontWeight: 700, lineHeight: 1.1,  letterSpacing: "-0.02em" },
  // Page titles
  h1:      { fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.015em" },
  // Section / card titles
  h2:      { fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, lineHeight: 1.2,  letterSpacing: "-0.01em" },
  // Sub-headers / list-item titles
  h3:      { fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, lineHeight: 1.3 },
  // Default body copy
  body:    { fontFamily: BODY,    fontSize: 14, fontWeight: 400, lineHeight: 1.55 },
  bodyStrong: { fontFamily: BODY, fontSize: 14, fontWeight: 600, lineHeight: 1.5 },
  // Secondary / meta text
  small:   { fontFamily: BODY,    fontSize: 12, fontWeight: 500, lineHeight: 1.45 },
  // Form field labels (see components/forms/FieldLabel). `label` is the
  // standard secondary label; `labelDense` is the tighter one used inside
  // data-dense panels (e.g. the AI generator) per density-by-function.
  label:     { fontFamily: BODY, fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  labelDense:{ fontFamily: BODY, fontSize: 11, fontWeight: 600, lineHeight: 1.3 },
  // Uppercase eyebrow / section label (matches the sidebar section titles)
  caption: { fontFamily: DISPLAY, fontSize: 10.5, fontWeight: 600, lineHeight: 1.4, letterSpacing: "0.09em", textTransform: "uppercase" },
  // Codes, PINs, code-like values
  mono:    { fontFamily: MONO,    fontSize: 13, fontWeight: 600 },
};
