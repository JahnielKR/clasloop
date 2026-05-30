// src/pages/analytics/CleoUsage.jsx
//
// Analytics Studio — "Tu uso de Cleo". Teacher-facing view of the
// ai_generations "gold" (instrumented in PR #85): how much of Cleo's raw output
// you keep verbatim vs edit, how long until you publish, and your mix of
// question types / models / inputs. Reads the teacher's own rows via RLS
// (useCleoUsage) and aggregates with the pure src/lib/analytics/cleo-usage.ts.

import { useState, useMemo } from "react";
import StudioShell from "../../components/analytics/StudioShell";
import StatCardWithSparkline from "../../components/analytics/StatCardWithSparkline";
import AnimatedNumber from "../../components/analytics/AnimatedNumber";
import StudioSkeleton from "../../components/analytics/StudioSkeleton";
import { useCleoUsage } from "../../hooks/useCleoUsage";
import { summarizeCleoUsage } from "../../lib/analytics/cleo-usage";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
} from "../../lib/analytics/formatters";
import { C, withAlpha } from "../../components/tokens";

// period chip → from/to. Memoized by the caller (useMemo on [period]) so the
// query key stays stable across renders — the render-loop lesson from the
// 2026-05-30 Studio bug fixes (never derive new Date() into a queryKey in the
// render body). Local copy: each analytics page defines its own (ClassDetail,
// StudentProfile, TopicMastery do too).
function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  switch (period) {
    case "d7":
      return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
    case "d90":
      return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
    case "custom":
      return { from: null, to: null }; // all-time (Custom picker is a later phase)
    case "d30":
    default:
      return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
  }
}

// Friendly labels for the distribution rows (raw codes otherwise).
const TYPE_LABELS = {
  mix: "Mixto",
  image_generation: "Imagen (IA)",
  mcq: "Opción múltiple",
  tf: "Verdadero/Falso",
  fill: "Completar",
  order: "Ordenar",
  match: "Relacionar",
  poll: "Encuesta",
  free: "Respuesta libre",
};
const INPUT_LABELS = {
  text: "Texto",
  pdf: "PDF",
  image: "Imagen",
  docx: "Word",
  pptx: "PowerPoint",
};

export default function CleoUsage() {
  const [period, setPeriod] = useState("d30");
  const { from, to } = useMemo(() => periodToRange(period), [period]);
  const q = useCleoUsage({ from, to });
  const summary = useMemo(() => summarizeCleoUsage(q.data || []), [q.data]);

  // Guard null before scaling to a percent (null * 100 === 0 in JS, which would
  // wrongly show "0%" instead of the "—" empty state).
  const accPct = summary.acceptanceRate == null ? null : summary.acceptanceRate * 100;
  const editPct = summary.editRate == null ? null : summary.editRate * 100;

  return (
    <StudioShell view="cleo" title="Tu uso de Cleo" period={period} onPeriodChange={setPeriod}>
      {q.isLoading ? (
        <StudioSkeleton variant="topic" />
      ) : q.isError ? (
        <ErrorBox message={q.error?.message} />
      ) : summary.totalGenerations === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* KPI band */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            <StatCardWithSparkline
              label="Generaciones"
              value={<AnimatedNumber value={summary.totalGenerations} format={formatNumber} />}
              hint="Veces que generaste preguntas con Cleo en este período"
            />
            <StatCardWithSparkline
              label="Tasa de aceptación"
              value={<AnimatedNumber value={accPct} format={formatPercent} />}
              hint="% de preguntas que publicaste tal cual salieron de Cleo"
            />
            <StatCardWithSparkline
              label="% editado"
              value={<AnimatedNumber value={editPct} format={formatPercent} />}
              hint="% de preguntas que reescribiste antes de publicar"
            />
            <StatCardWithSparkline
              label="Time-to-publish"
              value={<AnimatedNumber value={summary.medianTimeToPublishMs} format={formatDurationShort} />}
              hint="Mediana del tiempo entre generar y guardar el deck"
            />
          </div>

          {summary.goldCount === 0 && (
            <div
              style={{
                padding: "10px 14px",
                background: C.bgSoft,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: C.textSecondary,
                lineHeight: 1.5,
              }}
            >
              La <strong>tasa de aceptación</strong>, el <strong>% editado</strong> y el{" "}
              <strong>time-to-publish</strong> aparecen cuando guardes decks generados con Cleo
              — la captura de estos datos empezó el 30/05, así que las generaciones anteriores
              no los tienen. El volumen y las distribuciones de abajo sí cuentan todo.
            </div>
          )}

          {/* Distribuciones */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <DistList title="Por tipo de pregunta" rows={summary.byType} total={summary.totalGenerations} labelMap={TYPE_LABELS} />
            <DistList title="Por modelo" rows={summary.byModel} total={summary.totalGenerations} />
            <DistList title="Por tipo de entrada" rows={summary.byInput} total={summary.totalGenerations} labelMap={INPUT_LABELS} />
          </div>
        </div>
      )}
    </StudioShell>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function DistList({ title, rows, total, labelMap }) {
  return (
    <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.textSecondary, borderBottom: `1px solid ${C.border}` }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 14, fontSize: 12, color: C.textMuted }}>—</div>
      ) : (
        rows.map(([k, n]) => {
          const pct = total > 0 ? (n / total) * 100 : 0;
          const label = (labelMap && labelMap[k]) || k;
          return (
            <div key={k} style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, borderTop: `1px solid ${C.border}`, position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: C.accentSoft, opacity: 0.5 }} />
              <span style={{ color: C.text, fontWeight: 500, position: "relative" }}>{label}</span>
              <span style={{ color: C.textSecondary, fontSize: 12, position: "relative" }}>
                {n} <span style={{ color: C.textMuted }}>({pct.toFixed(0)}%)</span>
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "60px 20px", maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ fontSize: 18, color: C.text, margin: "0 0 8px" }}>Aún no has usado Cleo en este período</h2>
      <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
        Genera un warmup o examen con Cleo y vuelve acá: verás tu tasa de aceptación, qué tanto
        editas sus preguntas y cuánto tardas en publicar.
      </p>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div style={{ margin: 18, padding: "12px 16px", background: C.redSoft, border: `1px solid ${withAlpha(C.red, "44")}`, color: C.red, fontSize: 13, borderRadius: 8 }}>
      {message || "No se pudieron cargar tus datos de uso."}
    </div>
  );
}
