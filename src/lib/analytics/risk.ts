// ─── src/lib/analytics/risk.ts ─────────────────────────────────────────
// Pure at-risk heuristic. Combina 4 señales en un score 0-100 + razones.
// Sin React, sin Supabase. La RPC `student_risk` devuelve los INSUMOS
// crudos por alumno; este módulo calcula el score final en el cliente.
// (Mantener la heurística en JS la hace testeable sin DB y deja la RPC
// SQL al mínimo — un solo source of truth para la matemática.)
//
// Factores:
//   • recentPctCorrect (0-100): < 30% = +40 (con boost zona crítica),
//     < 50% = +20, < 70% = +10.
//   • slope (vía weeklyPctCorrect[]): cae rápido (≤ -5) = +20, cae leve
//     (≤ -2) = +10. Sube = 0.
//   • recentParticipation (0-100): < 30% = +20, < 60% = +10.
//   • daysSinceLastActivity (días): > 14 = +20, > 7 = +10.
//
// Tope: 80 puntos en el caso típico pésimo (los 4 al máx) + 20 extra del
// boost de zona crítica → score llega a 100 en el caso real más extremo.

import { trendSlope } from "./metrics";

export type RiskLevel = "low" | "med" | "high";

export interface RiskInputs {
  /** Most-recent % correct (last 30d). Null/missing = neutral. */
  recentPctCorrect: number | null | undefined;
  /** Weekly pct_correct (chronological). 4+ buckets recommended for slope. */
  weeklyPctCorrect: readonly number[];
  /** % of class sessions the student joined in the window (0-100). */
  recentParticipation: number | null | undefined;
  /** Days since the student's last response. Null/missing = neutral. */
  daysSinceLastActivity: number | null | undefined;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 60) return "high";
  if (score >= 30) return "med";
  return "low";
}

export function riskScore(inputs: RiskInputs): RiskResult {
  const reasons: string[] = [];
  let score = 0;

  // (a) Bajo % correcto reciente — la zona crítica (< 30%) recibe un boost
  // de +20 extra encima del +20 base para llegar a +40, así un alumno
  // realmente en problemas se acerca al tope sin necesitar las 4 señales.
  const recent = inputs.recentPctCorrect;
  if (recent != null && Number.isFinite(recent)) {
    if (recent < 30) {
      score += 40;
      reasons.push(`Rendimiento muy bajo (${Math.round(recent)}% correcto).`);
    } else if (recent < 50) {
      score += 20;
      reasons.push(`Rendimiento bajo (${Math.round(recent)}% correcto).`);
    } else if (recent < 70) {
      score += 10;
      reasons.push(`Rendimiento promedio (${Math.round(recent)}% correcto).`);
    }
  }

  // (b) Slope de tendencia semanal
  const weekly = inputs.weeklyPctCorrect ?? [];
  if (weekly.length >= 3) {
    const pts = weekly.map((y, i) => ({ x: i, y }));
    const m = trendSlope(pts);
    if (m != null) {
      if (m <= -5) {
        score += 20;
        reasons.push("Su rendimiento baja rápido semana a semana.");
      } else if (m <= -2) {
        score += 10;
        reasons.push("Su rendimiento cae levemente.");
      }
    }
  }

  // (c) Baja participación
  const part = inputs.recentParticipation;
  if (part != null && Number.isFinite(part)) {
    if (part < 30) {
      score += 20;
      reasons.push(`Apenas participa (${Math.round(part)}% de las sesiones).`);
    } else if (part < 60) {
      score += 10;
      reasons.push(`Participa poco (${Math.round(part)}% de las sesiones).`);
    }
  }

  // (d) Días sin actividad
  const days = inputs.daysSinceLastActivity;
  if (days != null && Number.isFinite(days)) {
    if (days > 14) {
      score += 20;
      reasons.push(`Inactivo hace ${Math.floor(days)} días.`);
    } else if (days > 7) {
      score += 10;
      reasons.push(`Inactivo hace ${Math.floor(days)} días.`);
    }
  }

  score = Math.min(100, Math.max(0, score));
  return {
    score,
    level: classifyRisk(score),
    reasons,
  };
}
