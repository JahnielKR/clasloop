// src/components/analytics/ClassTable.jsx
//
// Analytics Studio Área 3: tabla de clases del cockpit /school. Modelada en
// RosterTable (mismo sort/filtro/keyboard). Métrica primaria: % correcto, con
// sparkline de tendencia del período (overview_timeseries). Fila → ClassDetail.

import { useMemo, useState } from "react";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import { formatRelativeDay } from "../../lib/analytics/formatters";
import { SparklineCell } from "../charts";
import { C } from "../tokens";

const tierColor = (v) => (v >= 70 ? C.green : v >= 40 ? C.orange : C.red);
const tierSoft = (v) => (v >= 70 ? C.greenSoft : v >= 40 ? C.orangeSoft : C.redSoft);

// rows: [{ class_id, class_name, pctCorrect:number|null, trend:{points,delta,trend},
//          participation_pct, session_count, member_count, last_activity_at }]
const COLUMNS = [
  { key: "name", label: "Clase", accessor: (r) => r.class_name },
  { key: "pct", label: "% correcto", accessor: (r) => r.pctCorrect },
  { key: "trend", label: "Tendencia", accessor: (r) => r.trend?.delta ?? null, sortable: false },
  { key: "part", label: "Participación", accessor: (r) => r.participation_pct },
  { key: "sessions", label: "Sesiones", accessor: (r) => r.session_count },
  { key: "students", label: "Alumnos", accessor: (r) => r.member_count },
  { key: "activity", label: "Última actividad", accessor: (r) => (r.last_activity_at ? new Date(r.last_activity_at).getTime() : null) },
];

export default function ClassTable({ rows = [], onRowClick }) {
  const [sortKey, setSortKey] = useState("pct");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.class_name || "").toLowerCase().includes(q));
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return sortRows(filtered, col.accessor, sortDir);
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    const col = COLUMNS.find((c) => c.key === key);
    if (col && col.sortable === false) return;
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) { setSortKey("pct"); setSortDir("desc"); } else { setSortDir(nd); }
    } else { setSortKey(key); setSortDir("asc"); }
  }
  const arrow = (key) => (key !== sortKey || !sortDir ? "" : sortDir === "asc" ? " ▲" : " ▼");

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Clases</div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre…"
          aria-label="Filtrar clases por nombre"
          style={{ marginLeft: "auto", padding: "4px 9px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}`, width: 170 }}
        />
      </div>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin clases registradas.</div>
      ) : sorted.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin clases que coincidan con "{filter}".</div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key}
                  onClick={() => handleSort(c.key)}
                  style={{ padding: "5px 0", cursor: c.sortable === false ? "default" : "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  title={c.sortable === false ? undefined : "Ordenar"}>
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const clickable = !!onRowClick;
              const drill = clickable ? () => onRowClick(r) : undefined;
              const pct = r.pctCorrect;
              return (
                <tr key={r.class_id}
                  onClick={drill}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drill(); } } : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: `1px solid ${C.bgSoft}`, cursor: clickable ? "pointer" : "default" }}>
                  <td style={{ padding: "7px 0" }}>{r.class_name}</td>
                  <td>
                    {pct == null ? <span style={{ opacity: 0.4 }}>—</span> : (
                      <>
                        <div style={{ display: "inline-block", width: 70, marginRight: 6 }}>
                          <div style={{ background: tierSoft(pct), height: 6, width: `${Math.min(100, pct)}%`, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: tierColor(pct), fontWeight: 600 }}>{pct}%</span>
                      </>
                    )}
                  </td>
                  <td><SparklineCell points={r.trend?.points ?? []} trend={r.trend?.trend} width={70} height={18} /></td>
                  <td>{r.participation_pct != null ? `${Math.round(r.participation_pct)}%` : "—"}</td>
                  <td>{r.session_count ?? 0}</td>
                  <td>{r.member_count ?? 0}</td>
                  <td>{formatRelativeDay(r.last_activity_at ? new Date(r.last_activity_at) : null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
