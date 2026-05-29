// src/lib/analytics/overview-aggregate.ts
// Pure cross-class aggregators for the /school cockpit. No React, no Supabase.
//
//  - globalKpis: % correct (weighted by volume) + totals for the KPI band.
//  - classTrend: per-class sparkline points + avg + delta + trend, from overview_timeseries rows.
//  - criticalTopics: topics below a retention threshold, cross-class, ascending.
//  - topRiskStudents: per-class risk results flattened, sorted by score desc, top N.

export interface TsRow { class_id: string; bucket: string; value: number | null; responses_total: number; }
export interface OverviewRow {
  class_id: string; class_name?: string; member_count?: number; session_count?: number;
  topics_snapshot?: Array<{ topic: string; retention_score: number }>;
}

export interface GlobalKpis { pctCorrect: number | null; classesActive: number; totalStudents: number; totalSessions: number; }

export function globalKpis(ts: readonly TsRow[], overview: readonly OverviewRow[]): GlobalKpis {
  let num = 0, den = 0;
  for (const r of ts) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const w = Number(r.responses_total) || 0;
    num += Number(r.value) * w;
    den += w;
  }
  return {
    pctCorrect: den > 0 ? Math.round(num / den) : null,
    classesActive: overview.length,
    totalStudents: overview.reduce((s, r) => s + (Number(r.member_count) || 0), 0),
    totalSessions: overview.reduce((s, r) => s + (Number(r.session_count) || 0), 0),
  };
}

export type Trend = "up" | "down" | "flat" | "new";
export interface ClassTrend { points: number[]; avg: number | null; delta: number | null; trend: Trend; }

export function classTrend(ts: readonly TsRow[]): Record<string, ClassTrend> {
  const byClass: Record<string, TsRow[]> = {};
  for (const r of ts) (byClass[r.class_id] ||= []).push(r);
  const out: Record<string, ClassTrend> = {};
  for (const [id, rows] of Object.entries(byClass)) {
    const sorted = [...rows].sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
    const points = sorted.map((r) => Number(r.value) || 0);
    // Weighted average % correct over the period (by responses per bucket) —
    // this is the stable representative number for the table column.
    let num = 0, den = 0;
    for (const r of sorted) {
      if (r.value == null || !Number.isFinite(Number(r.value))) continue;
      const w = Number(r.responses_total) || 0;
      num += Number(r.value) * w; den += w;
    }
    const avg = den > 0 ? Math.round(num / den) : null;
    if (points.length < 2) { out[id] = { points, avg, delta: null, trend: "new" }; continue; }
    const delta = points[points.length - 1] - points[0];
    out[id] = { points, avg, delta, trend: delta > 1 ? "up" : delta < -1 ? "down" : "flat" };
  }
  return out;
}

export interface CriticalTopic { classId: string; className: string; topic: string; retention: number; }

export function criticalTopics(overview: readonly OverviewRow[], threshold = 40): CriticalTopic[] {
  const out: CriticalTopic[] = [];
  for (const row of overview) {
    for (const t of row.topics_snapshot ?? []) {
      if ((t.retention_score ?? 0) < threshold) {
        out.push({ classId: row.class_id, className: row.class_name ?? "", topic: t.topic, retention: Math.round(t.retention_score ?? 0) });
      }
    }
  }
  return out.sort((a, b) => a.retention - b.retention);
}

export interface PerClassRisk {
  classId: string; className: string;
  students: Array<{ name: string; risk: { score: number; level: "low" | "med" | "high"; reasons: string[] } }>;
}
export interface RankedRiskStudent { classId: string; className: string; name: string; score: number; level: "low" | "med" | "high"; reasons: string[]; }

export function topRiskStudents(perClass: readonly PerClassRisk[], n = 5): RankedRiskStudent[] {
  const flat: RankedRiskStudent[] = [];
  for (const c of perClass) {
    for (const s of c.students) {
      flat.push({ classId: c.classId, className: c.className, name: s.name, score: s.risk.score, level: s.risk.level, reasons: s.risk.reasons });
    }
  }
  return flat.sort((a, b) => b.score - a.score).slice(0, n);
}
