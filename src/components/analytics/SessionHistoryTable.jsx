// src/components/analytics/SessionHistoryTable.jsx
//
// F2 Analytics Studio: tabla del historial de sesiones del alumno.
// F8: sortable (table-sort) + filas clickeables (teclado) → drill al recap.
//
// Columns: Cuándo · Deck · Aciertos · Tiempo. Default sort: fecha desc.
// i18n: headers/estados via useT("studentProfile").

import { useMemo, useState } from "react";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const fmtDur = (ms) => {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const COLUMNS = [
  { key: "taken_at", labelKey: "colDate", accessor: (r) => (r.taken_at ? new Date(r.taken_at).getTime() : 0), align: "left" },
  { key: "deck_title", labelKey: "colDeck", accessor: (r) => r.deck_title || "", align: "left" },
  { key: "pct_correct", labelKey: "colScore", accessor: (r) => (r.pct_correct == null ? -1 : r.pct_correct), align: "right" },
  { key: "avg_time_ms", labelKey: "colTime", accessor: (r) => (r.avg_time_ms == null ? -1 : r.avg_time_ms), align: "right" },
];

export default function SessionHistoryTable({ items = [], onRowClick }) {
  const t = useT("studentProfile", useLang());
  const [sortKey, setSortKey] = useState("taken_at");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return items;
    return sortRows(items, col.accessor, sortDir);
  }, [items, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) setSortDir((d) => nextSortDir(null, d) || "desc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const arrow = (key) => (key !== sortKey || !sortDir ? "" : sortDir === "asc" ? " ▲" : " ▼");

  if (items.length === 0) {
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.histTitle}</div>
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>{t.histEmpty}</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.histTitle}</div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 480, fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  style={{ padding: "5px 8px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: c.align }}
                >
                  {t[c.labelKey]}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const clickable = !!onRowClick;
              const drill = clickable ? () => onRowClick(s) : undefined;
              return (
                <tr
                  key={i}
                  onClick={drill}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drill(); } } : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: `1px solid ${C.bgSoft}`, cursor: clickable ? "pointer" : "default" }}
                >
                  <td style={{ padding: "7px 8px" }}>{fmtDate(s.taken_at)}</td>
                  <td style={{ padding: "7px 8px" }}>{s.deck_title || "—"}</td>
                  <td style={{ padding: "7px 8px", textAlign: "right" }}>{s.pct_correct == null ? "—" : `${s.pct_correct}%`}</td>
                  <td style={{ padding: "7px 8px", textAlign: "right" }}>{s.avg_time_ms == null ? "—" : fmtDur(s.avg_time_ms)}</td>
                </tr>
              );
            })}
          </tbody>
          </table>
      </div>
    </div>
  );
}
