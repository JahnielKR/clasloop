// src/components/analytics/SessionHistoryTable.jsx
//
// F2 Analytics Studio: historial por sesión del alumno.
// F8: headers ordenables (Cuándo / % correcto) + filas con keyboard nav.

import { useMemo, useState } from "react";
import {
  formatPercent,
  formatDurationShort,
  formatRelativeDay,
} from "../../lib/analytics/formatters";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import { C } from "../tokens";

function pctColor(pct) {
  if (pct == null) return C.textSecondary;
  if (pct >= 70) return C.green;
  if (pct >= 40) return C.orange;
  return C.red;
}

const TYPE_LABEL = { warmup: "Warmup", exitTicket: "Exit ticket" };

const SORT_COLS = {
  when: (r) => (r.session_completed_at ? new Date(r.session_completed_at).getTime() : null),
  pct: (r) => (r.pct_correct == null ? null : Number(r.pct_correct)),
};

export default function SessionHistoryTable({ items = [], onRowClick }) {
  const [sortKey, setSortKey] = useState("when");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const accessor = SORT_COLS[sortKey];
    if (!accessor) return items;
    return sortRows(items, accessor, sortDir);
  }, [items, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) {
        setSortKey("when");
        setSortDir("desc");
      } else {
        setSortDir(nd);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  const arrow = (key) => (key !== sortKey || !sortDir ? "" : sortDir === "asc" ? " ▲" : " ▼");
  const sortableTh = (key, label, first = false) => (
    <th
      onClick={() => handleSort(key)}
      aria-sort={key === sortKey ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", padding: first ? "5px 0" : undefined }}
      title="Ordenar"
    >
      {label}{arrow(key)}
    </th>
  );

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Historial por sesión</div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin sesiones completadas en esta ventana.
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {/* Ola 6: scroll wrapper so the 6-col history scrolls instead of
              clipping on phones; minWidth keeps the columns legible. */}
          <table style={{ width: "100%", minWidth: 480, fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {sortableTh("when", "Cuándo", true)}
              <th>Tema</th>
              <th>Tipo</th>
              {sortableTh("pct", "% correcto")}
              <th>Tiempo medio</th>
              <th>Respuestas</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => {
              const clickable = !!onRowClick && !!it.deck_id;
              const drill = clickable ? () => onRowClick(it) : undefined;
              return (
                <tr
                  key={it.session_id}
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
                  style={{ borderTop: `1px solid ${C.bgSoft}`, cursor: clickable ? "pointer" : "default" }}
                >
                  <td style={{ padding: "7px 0" }}>{formatRelativeDay(it.session_completed_at)}</td>
                  <td>{it.session_topic || "—"}</td>
                  <td style={{ opacity: 0.75 }}>{TYPE_LABEL[it.session_type] || it.session_type}</td>
                  <td style={{ color: pctColor(it.pct_correct), fontWeight: 600 }}>
                    {formatPercent(it.pct_correct)}
                  </td>
                  <td>{formatDurationShort(it.avg_time_ms)}</td>
                  <td style={{ opacity: 0.75 }}>
                    {it.responses_correct}/{it.responses_total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
