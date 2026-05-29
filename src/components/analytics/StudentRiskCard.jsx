// src/components/analytics/StudentRiskCard.jsx
//
// F5 Analytics Studio: card de riesgo del Student Profile.
// Muestra el score numérico + level badge + lista de razones (en español)
// devueltas por riskScore() en src/lib/analytics/risk.ts.
//
// Props:
//   inputs: lo que riskScore() consume (recentPctCorrect, weeklyPctCorrect,
//           recentParticipation, daysSinceLastActivity)
//   loading: boolean — opcional, mientras student_risk fetcha
//
// El cálculo del score se hace ACÁ (no en el padre) para que el componente
// sea autosuficiente y la heurística viva en un solo lugar (risk.ts).

import { riskScore } from "../../lib/analytics/risk";
import RiskBadge from "./RiskBadge";
import { C } from "../tokens";

const ACCENT = C.purple;

export default function StudentRiskCard({ inputs, loading = false, studentName }) {
  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, opacity: 0.55 }}>Calculando riesgo…</div>
      </div>
    );
  }
  if (!inputs) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, opacity: 0.55 }}>
          Sin datos de riesgo para este alumno.
        </div>
      </div>
    );
  }
  const r = riskScore(inputs);
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Análisis de riesgo {studentName ? `— ${studentName}` : ""}
        </div>
        <RiskBadge level={r.level} score={r.score} />
      </div>
      {r.reasons.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Sin señales de riesgo detectadas en la ventana actual.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, lineHeight: 1.55 }}>
          {r.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cardStyle = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderLeft: `3px solid ${ACCENT}`,
  borderRadius: 8,
  padding: "10px 14px",
  margin: "10px 0",
};
