// src/components/analytics/RosterTable.jsx
//
// F1 Analytics Studio: roster del Class Detail con sparklines + badges
// (Semrush "table con visuals en cada fila").
//
// Data: en F1 derivamos el roster del students_snapshot que ya viene en
// analytics_overview (lo expone useDirector). ClassDetail también consume
// useDirector para esto — React Query cachea bajo DIRECTOR_KEY, así que
// si Director ya está cargado, esto es gratis. F2 introducirá
// student_detail y RosterTable migra a su propio fetch + drill-down.

import { SparklineCell } from "../charts";
// Import explícito: barrel `../../lib/analytics` choca con
// `src/lib/analytics.ts` (PostHog wrapper). Ver KpiBand.jsx.
import { formatRelativeDay } from "../../lib/analytics/formatters";

function badgeStyle(tone) {
  return {
    padding: "1px 7px",
    borderRadius: 10,
    fontSize: 11,
    background:
      tone === "good"
        ? "#dcfce7"
        : tone === "warn"
          ? "#fef3c7"
          : tone === "bad"
            ? "#fee2e2"
            : "#f4f4f5",
    color:
      tone === "good"
        ? "#15803d"
        : tone === "warn"
          ? "#854d0e"
          : tone === "bad"
            ? "#b91c1c"
            : "#52525b",
  };
}

function statusFor(s) {
  if (s.weakTopics > s.strongTopics) return { tone: "bad", label: "Riesgo" };
  if (s.strongTopics > s.weakTopics) return { tone: "good", label: "Subiendo" };
  return { tone: "warn", label: "Estable" };
}

function lastReviewedDate(s) {
  let latest = null;
  for (const t of s.topics || []) {
    if (!t.last_reviewed_at) continue;
    const d = new Date(t.last_reviewed_at);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

function topicRetentionPoints(s) {
  // F1: ordenar los topics por last_reviewed_at asc y devolver retention_score
  // como serie. No es una serie temporal real, pero el sparkline ilustra
  // la dispersión del alumno por temas.
  const arr = [...(s.topics || [])]
    .filter((t) => t.last_reviewed_at)
    .sort(
      (a, b) =>
        new Date(a.last_reviewed_at).getTime() -
        new Date(b.last_reviewed_at).getTime(),
    );
  return arr.map((t) => Number(t.retention_score) || 0);
}

export default function RosterTable({ students = [], onRowClick }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Roster</div>
      {students.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin alumnos registrados.
        </div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              opacity: 0.55,
              textAlign: "left",
            }}
          >
            <tr>
              <th style={{ padding: "5px 0" }}>Alumno</th>
              <th>Retención</th>
              <th>Disp. por tema</th>
              <th>Última actividad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const status = statusFor(s);
              const lastDate = lastReviewedDate(s);
              const points = topicRetentionPoints(s);
              const clickable = !!onRowClick;
              return (
                <tr
                  key={s.name}
                  onClick={clickable ? () => onRowClick(s) : undefined}
                  style={{
                    borderTop: "1px solid #f4f4f5",
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  <td style={{ padding: "7px 0" }}>{s.name}</td>
                  <td>
                    <div style={{ display: "inline-block", width: 80, marginRight: 6 }}>
                      <div
                        style={{
                          background:
                            s.avgRetention >= 70
                              ? "#dcfce7"
                              : s.avgRetention >= 40
                                ? "#fef3c7"
                                : "#fee2e2",
                          height: 6,
                          width: `${Math.min(100, s.avgRetention)}%`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {s.avgRetention}%
                  </td>
                  <td>
                    <SparklineCell points={points} trend="flat" width={70} height={16} />
                  </td>
                  <td>{formatRelativeDay(lastDate)}</td>
                  <td>
                    <span style={badgeStyle(status.tone)}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
