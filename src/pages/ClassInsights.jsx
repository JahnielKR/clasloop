// ─── /classes/:id/insights — Per-deck aggregate stats for a class ──────
// Teachers see, per deck of the class, how the whole class is doing:
//   - % correct (partials count as half)
//   - total responses (small number alongside)
//   - colored bar (green ≥80, orange ≥50, red <50 — same thresholds
//     as DeckResults so the teacher's mental model is consistent)
//
// The page is grouped into 3 collapsible sections — Warmups, Exit
// Tickets, General Review — all closed by default. "Tema = deck" per
// the user's framing: each deck is its own topic, no cross-deck
// rollups. For per-question breakdown, clicking a deck row navigates
// to /decks/:id/results which already covers that need.
//
// Decks with zero responses are NOT shown — server-side HAVING filters
// them out. No placeholder messaging for them (decision from user).
//
// Aggregation runs in Postgres via class_decks_summary() so we don't
// download every response. RLS already restricts what the teacher sees.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { C } from "../components/tokens";
import { ROUTES, buildRoute } from "../routes";
import { fetchClassDecksSummary, groupRowsBySection, pctColor } from "../lib/class-insights";
import { sectionLabels, resolveClassAccent } from "../lib/class-hierarchy";

// ─── i18n ────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    title: "Insights",
    backToClass: "Back to class",
    loading: "Loading insights…",
    error: "Could not load insights.",
    classNotFound: "Class not found.",
    emptyTitle: "No data yet",
    emptyHint: "Once students practice these decks, results will appear here.",
    decksCount: "{n} decks",
    deckCountOne: "1 deck",
    responses: "{n} responses",
    responsesOne: "1 response",
    pendingLabel: "{n} pending",
    pendingLabelOne: "1 pending",
    noDataInSection: "—",
  },
  es: {
    title: "Insights",
    backToClass: "Volver a la clase",
    loading: "Cargando insights…",
    error: "No se pudieron cargar los insights.",
    classNotFound: "Clase no encontrada.",
    emptyTitle: "Aún no hay datos",
    emptyHint: "Cuando los estudiantes practiquen los decks, los resultados aparecerán acá.",
    decksCount: "{n} decks",
    deckCountOne: "1 deck",
    responses: "{n} respuestas",
    responsesOne: "1 respuesta",
    pendingLabel: "{n} pendientes",
    pendingLabelOne: "1 pendiente",
    noDataInSection: "—",
  },
  ko: {
    title: "인사이트",
    backToClass: "수업으로 돌아가기",
    loading: "인사이트 불러오는 중…",
    error: "인사이트를 불러올 수 없습니다.",
    classNotFound: "수업을 찾을 수 없습니다.",
    emptyTitle: "아직 데이터가 없습니다",
    emptyHint: "학생들이 덱을 연습하면 결과가 여기에 표시됩니다.",
    decksCount: "덱 {n}개",
    deckCountOne: "덱 1개",
    responses: "응답 {n}개",
    responsesOne: "응답 1개",
    pendingLabel: "대기 {n}개",
    pendingLabelOne: "대기 1개",
    noDataInSection: "—",
  },
};

export default function ClassInsights({ profile, lang = "en" }) {
  // Same trick as DeckResults / Review: useParams() doesn't work in this
  // app (App.jsx maps page via pathToPage, no real <Routes>). Parse the
  // classId from the pathname directly.
  const location = useLocation();
  const classId = useMemo(() => {
    const m = location.pathname.match(/^\/classes\/([^/]+)\/insights\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [location.pathname]);
  const navigate = useNavigate();
  const t = i18n[lang] || i18n.en;
  const sLabels = sectionLabels(lang);

  // ── State ─────────────────────────────────────────────────────────────
  const [classObj, setClassObj] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Track which sections are expanded. Default: all closed (decision
  // from user — keeps the page calm on entry, teacher decides which
  // section to drill into).
  const [openSections, setOpenSections] = useState(() => ({
    warmup: false,
    exit_ticket: false,
    general_review: false,
  }));

  // ── Fetch class meta + summary in parallel ───────────────────────────
  const fetchAll = useCallback(async () => {
    if (!classId) {
      setError(t.classNotFound);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [classRes, summaryRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name, subject, grade, color_id")
          .eq("id", classId)
          .maybeSingle(),
        fetchClassDecksSummary(classId),
      ]);

      if (classRes.error || !classRes.data) {
        setError(t.classNotFound);
        setClassObj(null);
        return;
      }
      setClassObj(classRes.data);

      if (summaryRes.error) {
        setError(summaryRes.error);
      } else {
        setRows(summaryRes.rows);
      }
    } catch (e) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [classId, t.error, t.classNotFound]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const grouped = useMemo(() => groupRowsBySection(rows), [rows]);
  const accent = useMemo(() => resolveClassAccent(classObj), [classObj]);
  const hasAnyData = !loading && !error && rows.length > 0;

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div style={{
      maxWidth: 820, margin: "0 auto",
      padding: "24px 18px 80px",
      fontFamily: "'Outfit',sans-serif",
    }}>
      <style>{`
        @keyframes ci-fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .ci-card { animation: ci-fadeUp .25s ease both; }
        @keyframes ci-grow { from { width: 0; } }
        .ci-bar { animation: ci-grow .55s cubic-bezier(0.18, 0.67, 0.6, 1.22) both; }
        .ci-row { transition: background .12s ease, transform .12s ease; }
        .ci-row:hover { background: var(--c-bg-soft); }
        .ci-row:active { transform: scale(0.998); }
        .ci-section-summary { list-style: none; cursor: pointer; }
        .ci-section-summary::-webkit-details-marker { display: none; }
        details[open] .ci-chevron { transform: rotate(90deg); }
        .ci-chevron { transition: transform .18s ease; }
      `}</style>

      {/* Header: back to class */}
      <button
        onClick={() => navigate(classId ? buildRoute.classDetail(classId) : ROUTES.CLASSES)}
        style={{
          marginBottom: 14,
          padding: "6px 10px",
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 500,
          background: "transparent",
          color: C.textSecondary,
          border: `1px solid ${C.border}`,
          cursor: "pointer",
          fontFamily: "'Outfit',sans-serif",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t.backToClass}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <CIcon name="chart" size={32} />
        <h1 style={{
          fontSize: 24, fontWeight: 700, margin: 0, color: C.text,
          letterSpacing: "-.01em",
        }}>
          {t.title}
        </h1>
      </div>
      {classObj && (
        <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.5 }}>
          {classObj.name}
        </p>
      )}

      {/* Loading / error */}
      {loading && (
        <div style={{ textAlign: "center", color: C.textMuted, padding: "40px 0", fontSize: 14 }}>
          {t.loading}
        </div>
      )}
      {!loading && error && (
        <div style={{
          background: C.redSoft, color: C.red, padding: "10px 14px",
          borderRadius: 8, fontSize: 13, marginBottom: 14, lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {/* Empty state — no decks with data across the entire class */}
      {!loading && !error && classObj && rows.length === 0 && (
        <div className="ci-card" style={{
          textAlign: "center", padding: "60px 20px",
          background: C.bg, border: `1px dashed ${C.border}`,
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: C.text }}>
            {t.emptyTitle}
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {t.emptyHint}
          </p>
        </div>
      )}

      {/* Sections — always render all 3 in canonical order. Sections
          with zero decks are still shown but disabled (no toggle, dim
          summary). This keeps the visual structure stable so the
          teacher always knows where each section lives. */}
      {hasAnyData && grouped.map(({ sectionId, decks }) => {
        const sectionLabel = sLabels[sectionId]?.name || sectionId;
        const hasData = decks.length > 0;
        const isOpen = openSections[sectionId];

        return (
          <details
            key={sectionId}
            open={isOpen}
            onToggle={(e) => {
              // Sync local state with native <details> toggle so we can
              // animate the chevron and possibly read state elsewhere.
              const nextOpen = e.currentTarget.open;
              setOpenSections((prev) =>
                prev[sectionId] === nextOpen ? prev : { ...prev, [sectionId]: nextOpen }
              );
            }}
            style={{
              marginBottom: 10,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.bg,
              overflow: "hidden",
              opacity: hasData ? 1 : 0.55,
            }}
          >
            <summary
              className="ci-section-summary"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: hasData ? "pointer" : "default",
                userSelect: "none",
              }}
              onClick={(e) => {
                if (!hasData) {
                  e.preventDefault();
                  return;
                }
                // Let the native toggle happen; we sync via onToggle above.
              }}
            >
              <svg
                className="ci-chevron"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                style={{ color: C.textMuted, flexShrink: 0 }}
              >
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text, flex: 1 }}>
                {sectionLabel}
              </span>
              <span style={{ fontSize: 12, color: C.textMuted }}>
                {decks.length === 1
                  ? t.deckCountOne
                  : t.decksCount.replace("{n}", String(decks.length))}
              </span>
            </summary>

            {hasData && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {decks.map((deck) => (
                  <DeckRow
                    key={deck.deckId}
                    deck={deck}
                    accent={accent}
                    t={t}
                    onClick={() => navigate(buildRoute.deckResults(deck.deckId))}
                  />
                ))}
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}

// ─── DeckRow ─────────────────────────────────────────────────────────────
// One row per deck inside an expanded section. Clickable — navigates to
// /decks/:id/results for the per-question drilldown.
function DeckRow({ deck, accent, t, onClick }) {
  const pct = deck.pctCorrect;
  const barColor = pctColor(pct, C);
  const widthPct = pct == null ? 0 : Math.max(2, pct); // floor at 2% so a 0% bar is still visible

  return (
    <button
      onClick={onClick}
      className="ci-row"
      style={{
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 16px",
        cursor: "pointer",
        fontFamily: "'Outfit',sans-serif",
        display: "block",
      }}
    >
      {/* Title row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 8,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 600, color: C.text,
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {deck.deckTitle}
        </span>
        <span style={{
          fontSize: 14, fontWeight: 700, color: barColor,
          flexShrink: 0, fontVariantNumeric: "tabular-nums",
        }}>
          {pct == null ? "—" : `${pct}%`}
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 8, borderRadius: 4, background: C.bgSoft,
        overflow: "hidden", marginBottom: 6,
      }}>
        <div
          className="ci-bar"
          style={{
            height: "100%",
            width: `${widthPct}%`,
            background: barColor,
            borderRadius: 4,
          }}
        />
      </div>

      {/* Footer: total responses + pending */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        fontSize: 11, color: C.textMuted,
      }}>
        <span>
          {deck.totalResponses === 1
            ? t.responsesOne
            : t.responses.replace("{n}", String(deck.totalResponses))}
        </span>
        {deck.pendingReviewCount > 0 && (
          <span style={{
            background: C.accentSoft,
            color: C.accent,
            padding: "1px 7px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 10,
          }}>
            {deck.pendingReviewCount === 1
              ? t.pendingLabelOne
              : t.pendingLabel.replace("{n}", String(deck.pendingReviewCount))}
          </span>
        )}
      </div>
    </button>
  );
}
