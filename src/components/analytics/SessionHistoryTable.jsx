// src/components/analytics/SessionHistoryTable.jsx
//
// F2 Analytics Studio: historial por sesión del alumno.
// Una fila por sesión (top 20 más recientes en la ventana, ya ordenadas
// por completed_at DESC desde el RPC). Click → DeckResults para ese deck.

import {
  formatPercent,
  formatDurationShort,
  formatRelativeDay,
} from "../../lib/analytics/formatters";

function pctColor(pct) {
  if (pct == null) return "#71717a";
  if (pct >= 70) return "#15803d";
  if (pct >= 40) return "#854d0e";
  return "#b91c1c";
}

const TYPE_LABEL = {
  warmup: "Warmup",
  exitTicket: "Exit ticket",
};

export default function SessionHistoryTable({ items = [], onRowClick }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Historial por sesión
      </div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin sesiones completadas en esta ventana.
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
              <th style={{ padding: "5px 0" }}>Cuándo</th>
              <th>Tema</th>
              <th>Tipo</th>
              <th>% correcto</th>
              <th>Tiempo medio</th>
              <th>Respuestas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const clickable = !!onRowClick && !!it.deck_id;
              return (
                <tr
                  key={it.session_id}
                  onClick={clickable ? () => onRowClick(it) : undefined}
                  style={{
                    borderTop: "1px solid #f4f4f5",
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  <td style={{ padding: "7px 0" }}>
                    {formatRelativeDay(it.session_completed_at)}
                  </td>
                  <td>{it.session_topic || "—"}</td>
                  <td style={{ opacity: 0.75 }}>
                    {TYPE_LABEL[it.session_type] || it.session_type}
                  </td>
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
      )}
    </div>
  );
}
