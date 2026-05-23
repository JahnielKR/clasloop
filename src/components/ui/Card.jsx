// ─── Card ────────────────────────────────────────────────────────────────
// The standard surface: bg + 1px border + radius (R.lg) + subtle shadow, with
// the spacing/radius/shadow coming from tokens so every card shares one rhythm.
// Replaces the ad-hoc inline cards (and the per-file local `Card`) scattered
// across pages.
//
//   <Card>…</Card>
//   <Card hover onClick={open}>…</Card>            // lift + accent border on hover
//   <Card accent={classColor}>…</Card>             // 4px accent left-border (class cards)
//
// `hover`   adds the .ui-card--hover affordance (cursor + lift + accent border).
// `accent`  draws a 4px left border in that color.
// `padding` overrides the default (SP.lg). Pass any extra style via `style`.

import { C, R, SP, SH } from "../tokens";

export default function Card({
  as: Tag = "div",
  hover = false,
  accent,
  padding,
  className = "",
  style,
  children,
  ...rest
}) {
  const base = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: R.lg,
    boxShadow: SH.sm,
    padding: padding != null ? padding : SP.lg,
    ...(accent ? { borderLeft: `4px solid ${accent}` } : null),
    ...style,
  };
  const cls = ["ui-card", hover ? "ui-card--hover" : "", className].filter(Boolean).join(" ");
  return (
    <Tag className={cls} style={base} {...rest}>
      {children}
    </Tag>
  );
}
