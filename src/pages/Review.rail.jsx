// ─── ReviewRail — overview sidebar for /review ───────────────────────────
//
// Lives in the right rail that TwoColPage reserves on wide screens, turning the
// previously-empty side gutter into a glanceable summary of the grading queue.
// Everything here is derived from data Review.jsx already computed (no new
// queries) except `gradedToday`, which the page fetches once and refreshes
// after each grade. Kept in its own file so Review.jsx doesn't grow further.
//
// The "By class" rows drive the SAME `classFilter` the in-flow dropdown uses —
// so the rail is both insight (per-class counts the dropdown doesn't show) and
// action (one click to focus a class).

import { C, MONO } from "../components/tokens";

// Tint the "waiting longest" value warmer as it ages — a calm nudge, not alarm.
function ageColor(iso) {
  if (!iso) return C.textSecondary;
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days >= 3) return C.red;
  if (days >= 1) return C.orange;
  return C.textSecondary;
}

function Stat({ value, label, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || C.text, fontFamily: MONO, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function ClassRow({ label, count, active, onClick }) {
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
        background: active ? C.accentSoft : "transparent",
        color: active ? C.accent : C.textSecondary,
        transition: "background .12s ease, color .12s ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.035)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        fontSize: 13, fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11.5, fontWeight: 700, fontFamily: MONO,
        color: active ? C.accent : C.textMuted, flexShrink: 0,
      }}>
        {count}
      </span>
    </button>
  );
}

export default function ReviewRail({
  t,
  globalPending,
  studentCount,
  gradedToday,
  oldestCreatedAt,
  formatRelative,
  classBreakdown = [],
  allCount,
  classFilter,
  setClassFilter,
}) {
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

  return (
    <div>
      {/* Overview card */}
      <div style={card}>
        <div style={railLabel}>{t.railHeading}</div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 38, fontWeight: 800, color: C.text, fontFamily: MONO, lineHeight: 1 }}>
            {globalPending}
          </span>
          <span style={{ fontSize: 13, color: C.textSecondary }}>{t.railTotalLabel}</span>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
          <Stat value={studentCount} label={t.railStudentsLabel} />
          <Stat value={gradedToday} label={t.railGradedToday} color={gradedToday > 0 ? C.green : undefined} />
        </div>

        {oldestCreatedAt && (
          <div style={{
            marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>{t.railWaitingLabel}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: ageColor(oldestCreatedAt) }}>
              {formatRelative(oldestCreatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* By-class breakdown — only worth showing with more than one class */}
      {classBreakdown.length > 1 && (
        <div style={card}>
          <div style={railLabel}>{t.railByClassLabel}</div>
          <ClassRow
            label={t.filterAllClasses}
            count={allCount}
            active={!classFilter}
            onClick={() => setClassFilter(null)}
          />
          {classBreakdown.map((c) => (
            <ClassRow
              key={c.classId}
              label={c.className}
              count={c.count}
              active={classFilter === c.classId}
              onClick={() => setClassFilter(c.classId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
