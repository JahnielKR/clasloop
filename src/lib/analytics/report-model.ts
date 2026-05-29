// ─── src/lib/analytics/report-model.ts ─────────────────────────────────
// Modelo normalizado de reporte. Una sola forma uniforme que los 3
// exporters (CSV / PDF / XLSX) consumen. Sin React, sin Supabase.
//
// Un model = { title, scope, period, sections }.
// Cada section es:
//   - tipo "list": { type, title, rows: [{label, value}] }
//   - tipo "table": { type, title, columns: string[], data: any[][] }

export interface ReportSection {
  type: string;
  title: string;
  rows?: { label: string; value: any }[];
  columns?: string[];
  data?: any[][];
}

export interface ReportModel {
  title: string;
  scope: "class" | "student" | "overview";
  period: string;
  sections: ReportSection[];
}

/** Catálogo de secciones que el composer ofrece como checkboxes. */
export const SECTION_TYPES = [
  { id: "kpis", label: "Indicadores clave" },
  { id: "topics", label: "Dominio por tema" },
  { id: "most_missed", label: "Preguntas más falladas" },
];

const KPI_LABELS: Record<string, string> = {
  pct_correct: "% correcto",
  unique_participants: "Participantes",
  responses_total: "Respuestas",
  avg_time_ms: "Tiempo medio (ms)",
};

function kpiSection(kpis: any): ReportSection {
  const k = kpis || {};
  const rows = Object.keys(KPI_LABELS)
    .filter((key) => k[key] != null)
    .map((key) => ({ label: KPI_LABELS[key], value: k[key] }));
  return { type: "kpis", title: "Indicadores clave", rows };
}

function topicsSection(topicMastery: any[]): ReportSection {
  const data = (topicMastery || [])
    .filter((t) => t.retention_score != null)
    .map((t) => [t.topic, Number(t.retention_score)]);
  return { type: "topics", title: "Dominio por tema", columns: ["Tema", "Retención"], data };
}

function mostMissedSection(missed: any[]): ReportSection {
  const data = (missed || []).map((m) => [
    `P. ${Number(m.question_index) + 1}`,
    m.topic || "",
    `${Math.round(Number(m.error_rate))}%`,
  ]);
  return {
    type: "most_missed",
    title: "Preguntas más falladas",
    columns: ["Pregunta", "Tema", "Error"],
    data,
  };
}

export function buildClassReportModel(args: {
  className: string;
  period: string;
  classAnalytics: any;
  sections: string[];
}): ReportModel {
  const ca = args.classAnalytics || {};
  const builders: Record<string, () => ReportSection> = {
    kpis: () => kpiSection(ca.kpis),
    topics: () => topicsSection(ca.topic_mastery),
    most_missed: () => mostMissedSection(ca.most_missed),
  };
  const sections = (args.sections || [])
    .filter((id) => builders[id])
    .map((id) => builders[id]());
  return {
    title: `Reporte — ${args.className || "Clase"} (${args.period})`,
    scope: "class",
    period: args.period,
    sections,
  };
}
