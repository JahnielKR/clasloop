// src/components/analytics/RosterTable.jsx
//
// F1 Analytics Studio: roster del Class Detail con sparklines + badges.
// F5: columna de riesgo (RiskBadge).
// F8: headers ordenables (table-sort), filtro por nombre, filas con
// keyboard nav (tabIndex + Enter/Space → drill).

import { useMemo, useState } from "react";
// Import explícito: barrel `../../lib/analytics` choca con
// `src/lib/analytics.ts` (PostHog wrapper). Ver KpiBand.jsx.
import { formatRelativeDay } from "../../lib/analytics/formatters";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import RiskBadge from "./RiskBadge";
import { riskScore } from "../../lib/analytics/risk";

function badgeStyle(tone) {
  return {
    padding: "1px 7px",
    borderRadius: 10,
    fontSize: 11,
    background:
      tone === "good" ? "#dcfce7" : tone === "warn" ? "#fef3c7" : tone === "bad" ? "#fee2e2" : "#f4f4f5",
    color:
      tone === "good" ? "#15803d" : tone === "warn" ? "#854d0e" : tone === "bad" ? "#b91c1c" : "#52525b",
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

const COLUMNS = [
  { key: "name", label: "Alumno", accessor: (r) => r.name },
  { key: "retention", label: "Retención", accessor: (r) => r.avgRetention },
  { key: "risk", label: "Riesgo", accessor: (r) => r._riskScore },
  { key: "lastActivity", label: "Última actividad", accessor: (r) => r._lastTs },
  { key: "status", label: "Estado", accessor: (r) => r._statusLabel },
];

export default function RosterTable({ students = [], riskInputsByName = {}, onRowClick }) {
  const [sortKey, setSortKey] = useState("retention");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("");

  const decorated = useMemo(() => {
    return students.map((s) => {
      const inputs = riskInputsByName[s.name];
      const risk = inputs ? riskScore(inputs) : null;
      const lastDate = lastReviewedDate(s);
      return {
        ...s,
        _risk: risk,
        _riskScore: risk ? risk.score : null,
        _lastTs: lastDate ? lastDate.getTime() : null,
        _lastDate: lastDate,
        _statusLabel: statusFor(s).label,
      };
    });
  }, [students, riskInputsByName]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return decorated;
    return decorated.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [decorated, filter]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return sortRows(filtered, col.accessor, sortDir);
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) {
        setSortKey("retention");
        setSortDir("desc");
      } else {
        setSortDir(nd);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const arrow = (key) => {
    if (key !== sortKey || !sortDir) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Roster</div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre…"
          aria-label="Filtrar alumnos por nombre"
          style={{
            marginLeft: "auto",
            padding: "4px 9px",
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid #e4e4e7",
            width: 170,
          }}
        />
      </div>
      {students.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin alumnos registrados.</div>
      ) : sorted.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin alumnos que coincidan con "{filter}".</div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  aria-sort={c.key === sortKey ? (sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none") : "none"}
                  style={{ padding: "5px 0", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  title="Ordenar"
                >
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const status = statusFor(s);
              const clickable = !!onRowClick;
              const drill = clickable ? () => onRowClick(s) : undefined;
              return (
                <tr
                  key={s.name}
                  onClick={drill}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            drill();
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: "1px solid #f4f4f5", cursor: clickable ? "pointer" : "default" }}
                >
                  <td style={{ padding: "7px 0" }}>{s.name}</td>
                  <td>
                    <div style={{ display: "inline-block", width: 80, marginRight: 6 }}>
                      <div
                        style={{
                          background: s.avgRetention >= 70 ? "#dcfce7" : s.avgRetention >= 40 ? "#fef3c7" : "#fee2e2",
                          height: 6,
                          width: `${Math.min(100, s.avgRetention)}%`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {s.avgRetention}%
                  </td>
                  <td>
                    {s._risk ? (
                      <RiskBadge level={s._risk.level} score={s._risk.score} compact />
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td>{formatRelativeDay(s._lastDate)}</td>
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
