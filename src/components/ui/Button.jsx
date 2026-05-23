// ─── Button ──────────────────────────────────────────────────────────────
// The one button for the whole app. Static look + interaction states live in
// the `.ui-btn*` classes (src/index.css) so every button behaves identically
// (hover lift, active press, focus-visible ring, reduced-motion). This file is
// a thin wrapper that picks the variant/size classes and handles the loading
// spinner + icon slots.
//
//   <Button onClick={save}>Save</Button>
//   <Button variant="secondary" size="sm" leftIcon={<CIcon name="chart" size={13} inline/>}>Analytics</Button>
//   <Button variant="gradient">Create class</Button>   // brand signature — ≤1 per screen
//   <Button variant="danger" loading={deleting}>Delete</Button>
//
// `variant`: primary | secondary | ghost | danger | gradient
// `size`:    sm | md | lg

import { haptics } from "../../lib/haptics";

const VARIANTS = new Set(["primary", "secondary", "ghost", "danger", "gradient"]);
const SIZES = new Set(["sm", "md", "lg"]);

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  type = "button",
  className = "",
  style,
  onClick,
  children,
  ...rest
}) {
  const v = VARIANTS.has(variant) ? variant : "primary";
  const s = SIZES.has(size) ? size : "md";
  const cls = [
    "ui-btn",
    `ui-btn--${v}`,
    `ui-btn--${s}`,
    fullWidth ? "ui-btn--block" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={style}
      onClick={onClick ? (e) => { haptics.tap(); onClick(e); } : undefined}
      {...rest}
    >
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {!loading && leftIcon}
      {children != null && <span>{children}</span>}
      {!loading && rightIcon}
    </button>
  );
}
