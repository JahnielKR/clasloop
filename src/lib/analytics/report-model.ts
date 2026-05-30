// ─── src/lib/analytics/report-model.ts ─────────────────────────────────
// Modelo normalizado de reporte. Una sola forma uniforme que los 3
// exporters (CSV / PDF / XLSX) consumen. Sin React, sin Supabase.
//
// Un model = { title, scope, period, sections }.
// Cada section es:
//   - tipo "list": { type, title, rows: [{label, value}] }
//   - tipo "table": { type, title, columns: string[], data: any[][] }
//
// i18n: títulos/columnas/labels salen de getStrings("reportModel", lang)
// (no React → getStrings, no useT). Los callers pasan el lang activo de la UI.

import { getStrings } from "../../i18n";

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

/** Catálogo de secciones (solo ids — las etiquetas se localizan en la UI). */
export const SECTION_TYPES = [
  { id: "kpis" },
  { id: "topics" },
  { id: "most_missed" },
];

function kpiSection(kpis: any, t: any): ReportSection {
  const k = kpis || {};
  const KPI_LABELS: Record<string, string> = {
    pct_correct: t.kpiPctCorrect,
    unique_participants: t.kpiParticipants,
    responses_total: t.kpiResponses,
    avg_time_ms: t.kpiAvgTime,
  };
  const rows = Object.keys(KPI_LABELS)
    .filter((key) => k[key] != null)
    .map((key) => ({ label: KPI_LABELS[key], value: k[key] }));
  return { type: "kpis", title: t.secKpis, rows };
}

function topicsSection(topicMastery: any[], t: any): ReportSection {
  const data = (topicMastery || [])
    .filter((tp) => tp.retention_score != null)
    .map((tp) => [tp.topic, Number(tp.retention_score)]);
  return { type: "topics", title: t.secTopics, columns: [t.colTopic, t.colRetention], data };
}

function mostMissedSection(missed: any[], t: any): ReportSection {
  const data = (missed || []).map((m) => [
    t.qPrefix(Number(m.question_index) + 1),
    m.topic || "",
    `${Math.round(Number(m.error_rate))}%`,
  ]);
  return {
    type: "most_missed",
    title: t.secMostMissed,
    columns: [t.colQuestion, t.colTopic, t.colError],
    data,
  };
}

export function buildClassReportModel(args: {
  className: string;
  period: string;
  classAnalytics: any;
  sections: string[];
  lang?: string;
}): ReportModel {
  const t = getStrings("reportModel", args.lang || "en");
  const ca = args.classAnalytics || {};
  const builders: Record<string, () => ReportSection> = {
    kpis: () => kpiSection(ca.kpis, t),
    topics: () => topicsSection(ca.topic_mastery, t),
    most_missed: () => mostMissedSection(ca.most_missed, t),
  };
  const sections = (args.sections || [])
    .filter((id) => builders[id])
    .map((id) => builders[id]());
  return {
    title: t.reportTitle(args.className || "", args.period),
    scope: "class",
    period: args.period,
    sections,
  };
}

export function buildOverviewReportModel(args: {
  period: string;
  stats: { avgRetention: number; classes: number; students: number; sessions: number };
  perClass?: { name: string; retention: number }[];
  lang?: string;
}): ReportModel {
  const t = getStrings("reportModel", args.lang || "en");
  const s = args.stats;
  const sections: ReportSection[] = [
    {
      type: "kpis",
      title: t.overviewTitle,
      rows: [
        { label: t.avgRetention, value: `${s.avgRetention}%` },
        { label: t.activeClasses, value: s.classes },
        { label: t.students, value: s.students },
        { label: t.sessions, value: s.sessions },
      ],
    },
  ];
  if (args.perClass?.length) {
    sections.push({
      type: "topics",
      title: t.secTopics,
      columns: [t.colClass, t.colRetention],
      data: args.perClass.map((c) => [c.name, c.retention]),
    });
  }
  return {
    title: t.overviewReportTitle(args.period),
    scope: "overview",
    period: args.period,
    sections,
  };
}
