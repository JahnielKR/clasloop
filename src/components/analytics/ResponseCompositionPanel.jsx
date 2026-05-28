// src/components/analytics/ResponseCompositionPanel.jsx
//
// F1 Analytics Studio: composición de respuestas (donut + leyenda) del Class Detail.
// kpis viene de class_analytics: { responses_total, responses_correct }.
// En F1 no tenemos parcial/pendiente desagregados — pintamos correcto vs
// incorrecto solamente. Se puede extender cuando el RPC los devuelva.

import { Donut } from "../charts";
// Import explícito (mismo motivo que KpiBand/TrendPanel — colisión con
// src/lib/analytics.ts).
import { formatNumber } from "../../lib/analytics/formatters";

const PALETTE = {
  correct: "#16a34a",
  incorrect: "#dc2626",
};

export default function ResponseCompositionPanel({ kpis = {} }) {
  const total = kpis.responses_total ?? 0;
  const correct = kpis.responses_correct ?? 0;
  const incorrect = Math.max(0, total - correct);

  const data = [
    { name: "Correcto", value: correct, color: PALETTE.correct },
    { name: "Incorrecto", value: incorrect, color: PALETTE.incorrect },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Composición de respuestas
      </div>
      {total === 0 ? (
        <div style={{ height: 160, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin respuestas en esta ventana.
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Donut
            data={data}
            centerLabel={formatNumber(total)}
            centerSubLabel="respuestas"
            height={150}
          />
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <LegendRow color={PALETTE.correct} label="Correcto" value={correct} total={total} />
            <LegendRow color={PALETTE.incorrect} label="Incorrecto" value={incorrect} total={total} />
          </div>
        </div>
      )}
    </div>
  );
}

function LegendRow({ color, label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          background: color,
          borderRadius: 2,
          marginRight: 6,
        }}
      />
      {label} · <b>{pct}%</b>
    </div>
  );
}
