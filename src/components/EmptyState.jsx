// ─── EmptyState ────────────────────────────────────────────────────────────
// Phase 2 — a friendly, consistent empty state. New users hit these the moment
// they finish onboarding (an empty class list, an empty deck library), so they
// should welcome + guide, not show a cold blank. Optional Cleo for student-
// facing surfaces (kids); an emoji or a custom icon node otherwise.
//
//   <EmptyState cleo title="No classes yet"
//     body="Got a code from your teacher? Join your first class."
//     actionLabel="Join a class" onAction={openJoinForm} />
import Cleo from "./Cleo";
import Button from "./ui/Button";
import { C, TYPE } from "./tokens";

export default function EmptyState({
  emoji,           // string emoji (fallback visual)
  icon,            // custom node (e.g. <CIcon name="..." size={48} />)
  cleo = false,    // show the Cleo mascot (student-facing warmth)
  cleoExpression = "encouraging",   // her mood when shown (default: a warm "you got this")
  title,
  body,
  actionLabel,
  onAction,
  actionVariant = "primary",   // "gradient" for the one signature CTA on a screen
  secondaryLabel,
  onSecondary,
  style = {},
}) {
  return (
    <div style={{
      textAlign: "center",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "40px 28px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...style,
    }}>
      {(cleo || icon || emoji) && (
        <div style={{ marginBottom: 16, lineHeight: 1 }}>
          {cleo ? <Cleo size={88} expression={cleoExpression} /> : icon || <span style={{ fontSize: 42 }}>{emoji}</span>}
        </div>
      )}
      {title && (
        <h3 style={{ ...TYPE.h2, color: C.text, margin: "0 0 6px" }}>
          {title}
        </h3>
      )}
      {body && (
        <p style={{ ...TYPE.body, color: C.textSecondary, margin: "0 0 20px", maxWidth: 380 }}>
          {body}
        </p>
      )}
      {(actionLabel || secondaryLabel) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {actionLabel && (
            <Button variant={actionVariant} onClick={onAction}>{actionLabel}</Button>
          )}
          {secondaryLabel && (
            <Button variant="secondary" onClick={onSecondary}>{secondaryLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}
