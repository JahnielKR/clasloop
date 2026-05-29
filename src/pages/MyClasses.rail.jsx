// ─── MyClassesRail — overview sidebar for the teacher's My Classes ───────
//
// Fills the right-side gutter (via TwoColPage) on wide screens with a quick
// read of the teacher's whole school: totals + a "needs attention" list of
// classes missing material or students. Everything comes from data the page
// already loaded (classes + per-class deck/student counts) except the pending-
// review count, which reuses the same lib helper the sidebar badge uses.
//
// Styling intentionally mirrors ReviewRail so every rail across the app reads
// as one system. (If a third rail appears, factor these shared card/stat
// styles into a small kit — not worth the abstraction for two.)

import { C, MONO, withAlpha } from "../components/tokens";

const card = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
  fontFamily: "'Outfit', sans-serif",
};
const railLabel = {
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.textMuted,
  fontWeight: 700,
  marginBottom: 12,
};

function Stat({ value, label }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, fontFamily: MONO, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function AttentionRow({ name, reason, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 10px",
        marginBottom: 2,
        border: "none",
        borderRadius: 7,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "'Outfit', sans-serif",
        background: "transparent",
        color: C.textSecondary,
        transition: "background .12s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.bgSoft; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        fontSize: 13, fontWeight: 500,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0,
      }}>
        {name}
      </span>
      <span style={{
        fontSize: 10.5, fontWeight: 600, flexShrink: 0,
        color: C.orange, background: C.orangeSoft,
        padding: "2px 8px", borderRadius: 999,
      }}>
        {reason}
      </span>
    </button>
  );
}

export default function MyClassesRail({
  t,
  classCount,
  studentTotal,
  deckTotal,
  pendingReviews,
  onOpenReview,
  needsAttention = [],
  onOpenClass,
}) {
  return (
    <div>
      {/* School at a glance */}
      <div style={card}>
        <div style={railLabel}>{t.railHeading}</div>
        <div style={{ display: "flex", gap: 18 }}>
          <Stat value={classCount} label={t.railClasses} />
          <Stat value={studentTotal} label={t.railStudents} />
          <Stat value={deckTotal} label={t.railDecks} />
        </div>

        {pendingReviews > 0 && (
          <button
            onClick={onOpenReview}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 8, marginTop: 14, padding: "10px 12px",
              border: `1px solid ${C.border}`, borderRadius: 9,
              background: C.bgSoft, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif", color: C.text,
              transition: "border-color .12s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = withAlpha(C.accent, "66"); }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
          >
            <span style={{ fontSize: 12.5, color: C.textSecondary }}>{t.railPending}</span>
            <span style={{
              fontSize: 11.5, fontWeight: 700, fontFamily: MONO,
              color: "#fff", background: C.accent,
              padding: "1px 8px", borderRadius: 999,
            }}>
              {pendingReviews}
            </span>
          </button>
        )}
      </div>

      {/* Needs attention — classes missing material or students */}
      {needsAttention.length > 0 && (
        <div style={card}>
          <div style={railLabel}>{t.railAttentionHeading}</div>
          {needsAttention.map((c) => (
            <AttentionRow
              key={c.id}
              name={c.name}
              reason={c.reasonText}
              onClick={() => onOpenClass(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
