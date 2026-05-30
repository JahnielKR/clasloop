// src/lib/analytics/cleo-usage.ts
//
// Pure aggregation of a teacher's own `ai_generations` "gold" for the
// "Tu uso de Cleo" Studio view. No Supabase / React here — the rows are fetched
// by src/hooks/useCleoUsage.js and aggregated by this module. Tested in
// __tests__/cleo-usage.test.ts.
//
// Gold semantics (see api/_lib/ai-gold.js): per generation,
//   accepted_count = questions the teacher published verbatim
//   edited_count   = questions reworded before publishing
// A row "has gold" when accepted_count is non-null (capture started 2026-05-30;
// older rows are null → counted in volume + distributions, excluded from rates).

export interface CleoGenRow {
  activity_type?: string | null;
  model_used?: string | null;
  input_type?: string | null;
  num_questions?: number | null;
  accepted_count?: number | null;
  edited_count?: number | null;
  regenerated_count?: number | null;
  time_to_publish_ms?: number | null;
}

export interface CleoUsageSummary {
  totalGenerations: number;
  goldCount: number;
  acceptedTotal: number;
  editedTotal: number;
  keptTotal: number;
  /** accepted / (accepted + edited) over gold rows; null when nothing was kept. */
  acceptanceRate: number | null;
  /** edited / (accepted + edited) over gold rows; null when nothing was kept. */
  editRate: number | null;
  medianTimeToPublishMs: number | null;
  byType: Array<[string, number]>;
  byModel: Array<[string, number]>;
  byInput: Array<[string, number]>;
}

/** Median of a numeric array; null when empty. */
export function median(nums: number[]): number | null {
  if (!nums || nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Friendly model label: drop a single trailing all-digit date segment. */
export function prettyModel(model: string | null | undefined): string {
  if (!model) return "desconocido";
  const parts = String(model).split("-");
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join("-") || "desconocido";
}

function distribution(
  rows: CleoGenRow[],
  key: (r: CleoGenRow) => string,
): Array<[string, number]> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

const hasGold = (r: CleoGenRow): boolean => r.accepted_count != null;

export function summarizeCleoUsage(rows: CleoGenRow[]): CleoUsageSummary {
  const safe = Array.isArray(rows) ? rows : [];
  const goldRows = safe.filter(hasGold);

  const acceptedTotal = goldRows.reduce((a, r) => a + (r.accepted_count || 0), 0);
  const editedTotal = goldRows.reduce((a, r) => a + (r.edited_count || 0), 0);
  const keptTotal = acceptedTotal + editedTotal;

  const times = safe
    .map((r) => r.time_to_publish_ms)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  return {
    totalGenerations: safe.length,
    goldCount: goldRows.length,
    acceptedTotal,
    editedTotal,
    keptTotal,
    acceptanceRate: keptTotal > 0 ? acceptedTotal / keptTotal : null,
    editRate: keptTotal > 0 ? editedTotal / keptTotal : null,
    medianTimeToPublishMs: median(times),
    byType: distribution(safe, (r) => r.activity_type || "desconocido"),
    byModel: distribution(safe, (r) => prettyModel(r.model_used)),
    byInput: distribution(safe, (r) => r.input_type || "desconocido"),
  };
}
