// src/lib/analytics/report-sections.js
//
// Ola B: single catalog of the report's sections. Both the composer (selectable
// cards) and the preview (render order) import this so the list + ids never
// drift. labelKey reuses the existing `reports` i18n keys; descKey are new.
// Pure — no React, no Supabase.

export const REPORT_SECTIONS = [
  { id: "kpis", labelKey: "secKpis", descKey: "secKpisDesc" },
  { id: "topics", labelKey: "secTopics", descKey: "secTopicsDesc" },
  { id: "most_missed", labelKey: "secMostMissed", descKey: "secMostMissedDesc" },
];

// Return a NEW order array with `id` moved one slot up/down. No-op at the
// boundaries or when `id` isn't present. `dir` is "up" | "down".
export function moveSection(order, id, dir) {
  const i = order.indexOf(id);
  if (i === -1) return [...order];
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= order.length) return [...order];
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
