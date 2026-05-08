// ─── Class insights — RPC wrapper + UI helpers ─────────────────────────
// Powers /classes/:id/insights. Heavy aggregation runs server-side via
// the class_decks_summary() Postgres function (see migration file).
// Here we just call it, normalize keys to camelCase, and group by section
// for the page's collapsible structure (Warmups / Exit Tickets / General
// Review).

import { supabase } from "./supabase";
import { SECTIONS } from "./class-hierarchy";

// Fetch deck-level summary for a class.
//
// Returns { rows, error }:
//   rows: array of { deckId, deckTitle, deckSection, unitId,
//                    totalResponses, totalPoints, totalMaxPoints,
//                    pctCorrect, pendingReviewCount }
//         — one entry per deck that has at least one response. Decks
//         with zero responses are filtered out server-side (HAVING).
//   error: string error message, or null on success.
export async function fetchClassDecksSummary(classId) {
  if (!classId) return { rows: [], error: "Missing class id" };

  const { data, error } = await supabase.rpc("class_decks_summary", {
    p_class_id: classId,
  });

  if (error) {
    return { rows: [], error: error.message || "Failed to load insights" };
  }

  const rows = (data || []).map((r) => ({
    deckId: r.deck_id,
    deckTitle: r.deck_title,
    deckSection: r.deck_section,
    unitId: r.unit_id,
    totalResponses: r.total_responses,
    totalPoints: r.total_points,
    totalMaxPoints: r.total_max_points,
    pctCorrect: r.pct_correct, // number 0..100, or null when no max_points
    pendingReviewCount: r.pending_review_count,
  }));

  return { rows, error: null };
}

// ─── Helpers for the UI ─────────────────────────────────────────────────

// Group deck rows by section, in the canonical SECTIONS order. Returns
// an array of { sectionId, decksWithData, totalDecksInSection } so the
// page can iterate it directly in the order the rest of the app uses
// (warmup → exit_ticket → general_review).
//
// Each section reports:
//   - decksWithData: rows where totalResponses > 0 (the usable rows for
//     the % bars)
//   - totalDecksInSection: how many decks the class has in that section
//     overall, regardless of whether they have responses yet. Used by
//     the UI to decide between "show rows" vs "show 'no X used yet'
//     message" inside an expanded section.
//
// Sections with zero decks (decksWithData=[] AND totalDecksInSection=0)
// are still present in the result — the page can render the section
// label without expanding it. We don't filter them out here so the
// caller has full control over the layout.
export function groupRowsBySection(rows) {
  const bySection = new Map(SECTIONS.map((s) => [s.id, []]));
  for (const row of rows) {
    if (bySection.has(row.deckSection)) {
      bySection.get(row.deckSection).push(row);
    } else {
      // Defensive: if a row comes in with a section we don't recognize,
      // dump it into general_review so it's at least visible.
      bySection.get("general_review").push(row);
    }
  }
  return SECTIONS.map((s) => {
    const allDecks = bySection.get(s.id) || [];
    const decksWithData = allDecks.filter((d) => d.totalResponses > 0);
    return {
      sectionId: s.id,
      decksWithData,
      totalDecksInSection: allDecks.length,
    };
  });
}

// Color the percentage bar by tier — same thresholds as deck-stats.js
// and the rest of the app.
//   ≥80 green : the class got it
//   ≥50 orange: mixed, worth re-teaching some
//   <50 red   : needs serious re-teaching
export function pctColor(pct, palette) {
  if (pct == null) return palette.textMuted;
  if (pct >= 80) return palette.green;
  if (pct >= 50) return palette.orange;
  return palette.red;
}
