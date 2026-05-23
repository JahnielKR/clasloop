// ─── RailKit — shared building blocks for side rails ─────────────────────
//
// The right-side overview rails (To Review, My Classes, Library, Community,
// Notifications, …) all share the same visual language. These primitives keep
// that language in one place so every rail reads as one system and we don't
// copy the same card/stat/row styling into each page's `*.rail.jsx`.
//
// Used inside the rail column that TwoColPage reserves on wide screens.

import { C, MONO } from "./tokens";
import { CIcon } from "./Icons";

// A bordered card section with an optional small uppercase title.
export function RailCard({ title, children, style }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        fontFamily: "'Outfit', sans-serif",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: C.textMuted,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// A big mono number with a muted caption. `size` lets a card emphasize one
// headline stat over secondary ones.
export function RailStat({ value, label, color, size = 22, icon }) {
  return (
    <div style={{ minWidth: 0 }}>
      {icon && <div style={{ marginBottom: 6 }}><CIcon name={icon} size={18} /></div>}
      <div style={{ fontSize: size, fontWeight: 800, color: color || C.text, fontFamily: MONO, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// A non-clickable info row: icon + label + optional right node. For read-only
// lists (e.g. "most used decks") where the row isn't an action.
export function RailItem({ icon, label, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 2px", marginBottom: 1 }}>
      {icon && <CIcon name={icon} size={16} inline />}
      <span style={{
        fontSize: 13, color: C.text, flex: 1, minWidth: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      {right != null && <span style={{ flexShrink: 0 }}>{right}</span>}
    </div>
  );
}

// A clickable row: label on the left, an optional `right` node (count/chip) on
// the right. `active` lights it with the accent (used for filter rows).
export function RailRow({ icon, label, right, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        marginBottom: 2,
        border: "none",
        borderRadius: 7,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "'Outfit', sans-serif",
        background: active ? C.accentSoft : "transparent",
        color: active ? C.accent : C.textSecondary,
        transition: "background .12s ease, color .12s ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.035)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {icon && <CIcon name={icon} size={16} inline />}
      <span style={{
        fontSize: 13, fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0,
      }}>
        {label}
      </span>
      {right != null && <span style={{ flexShrink: 0 }}>{right}</span>}
    </button>
  );
}

// A small mono count for use as a RailRow `right`.
export function RailCount({ children, active }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: MONO, color: active ? C.accent : C.textMuted }}>
      {children}
    </span>
  );
}
