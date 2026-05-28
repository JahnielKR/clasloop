// src/components/analytics/KpiBand.jsx
//
// F1 Analytics Studio: banda de stat cards del Class Detail.
// 5 tiles: % correcto · Participación · Respuestas · Tiempo promedio · Temas en riesgo.
//
// Props:
//   kpis: { responses_total, responses_correct, pct_correct, avg_time_ms, unique_participants }
//         — viene de class_analytics RPC (campo "kpis").
//   timeseries: array de useClassTimeseries (para sparklines).
//   topicMastery: array (para contar "en riesgo" en F1 — alumnos en riesgo
//                        real entra en F5 con Cleo+Predictivo; F1 cuenta
//                        topics con retention<40 como proxy).
//
// En F1 "Δ vs período anterior" no aparece todavía — la lógica de período
// anterior vive en F4 (Comparar). Honest placeholder: solo el valor.

import StatCardWithSparkline from "./StatCardWithSparkline";
// Import explícito del archivo: el barrel `../../lib/analytics` choca con
// `src/lib/analytics.ts` (wrapper PostHog del PR 69). Node/Rollup resuelven
// el .ts primero. Usamos el path al archivo para evitar la ambigüedad.
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
  formatDelta,
} from "../../lib/analytics/formatters";
import { pctChangeOrNull } from "../../lib/analytics/benchmark";

export default function KpiBand({
  kpis = {},
  timeseries = [],
  topicMastery = [],
  compareKpis = null,
  percentile = null,
}) {
  const pctSpark = timeseries.map((t) => Number(t.value) || 0);
  const participationSpark = timeseries.map((t) => Number(t.unique_participants) || 0);
  const sessionsSpark = timeseries.map((t) => Number(t.responses_total) || 0);

  // F1 proxy: tópicos en riesgo = retention_score < 40 (la "en riesgo
  // por alumno" llega en F5 con Cleo + el RPC student_risk).
  const atRiskTopics = topicMastery.filter(
    (t) => (t.retention_score ?? 0) < 40,
  ).length;

  // F4: derive delta chip per tile from compareKpis (period-prev fetch).
  // Polarity nit: avg_time_ms "more = worse" but F4 keeps "more = good"
  // universally — documented as out of scope in the plan.
  function deltaProps(field) {
    if (compareKpis == null) return null;
    const pct = pctChangeOrNull(compareKpis[field], kpis[field]);
    if (pct == null) return null;
    const rounded = Math.round(pct);
    return {
      label: formatDelta(rounded),
      tone: rounded > 0 ? "good" : rounded < 0 ? "bad" : "neutral",
    };
  }

  // F4: percentile chip falls back into the "% correcto" tile when there's
  // no compare active. compareKpis wins to avoid double-badging.
  const pctCorrectDelta =
    deltaProps("pct_correct") ||
    (percentile != null ? { label: `P${percentile}`, tone: "neutral" } : null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      <StatCardWithSparkline
        label="% correcto"
        value={formatPercent(kpis.pct_correct)}
        sparkPoints={pctSpark}
        delta={pctCorrectDelta}
      />
      <StatCardWithSparkline
        label="Participación"
        value={formatNumber(kpis.unique_participants)}
        sparkPoints={participationSpark}
        delta={deltaProps("unique_participants")}
      />
      <StatCardWithSparkline
        label="Respuestas"
        value={formatNumber(kpis.responses_total)}
        sparkPoints={sessionsSpark}
        delta={deltaProps("responses_total")}
      />
      <StatCardWithSparkline
        label="Tiempo promedio"
        value={formatDurationShort(kpis.avg_time_ms)}
        delta={deltaProps("avg_time_ms")}
      />
      <StatCardWithSparkline
        label="Temas en riesgo"
        value={formatNumber(atRiskTopics)}
        tone={atRiskTopics > 0 ? "danger" : "default"}
      />
    </div>
  );
}
