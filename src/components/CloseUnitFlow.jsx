// ─── CloseUnitFlow ──────────────────────────────────────────────────────
//
// Two-step flow for closing a unit, per teacher feedback in PR 6 spec:
//
//   Step 1 — Modal: "Close this unit?"
//     [Not yet]   [Continue with the summary →]
//
//   Step 2 — Full-page summary: stats, narrative, decks ranked.
//     [Back]    [Close unit]
//
// The two steps are intentional: closing a unit is a pedagogically
// meaningful moment, not a checkbox toggle. The modal asks for intent;
// the summary lets the teacher SEE the unit before committing. They can
// back out at either step.
//
// Auto-promotion logic (when closing the active unit):
//   When the closed unit was active='active', the most-recently-created
//   'planned' unit is promoted to 'active' so PlanView's Current tab
//   isn't suddenly empty. If no planned exists, Current shows an empty
//   state. The teacher can manually activate any unit by viewing it
//   (though manual activation is a follow-up — for now reaching a
//   planned unit happens via Upcoming tab).
//
// Reopening a closed unit:
//   This component also exposes a "Reopen" button used from the unit
//   header in PlanView when the unit is already closed. Reopen sets
//   status='planned' (NOT 'active' — preserves whichever unit is
//   currently active).

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getUnitRetentionSummary } from "../lib/spaced-repetition";
import { C, MONO } from "./tokens";
import SectionBadge, { sectionAccent } from "./SectionBadge";
import { buildRoute } from "../routes";
import {
  generateClosingNarrative,
  generateSuggestedReviewQuestions,
  saveReviewDeck,
  findExistingReviewDeck,
} from "../lib/close-unit-ai";
// PR 76: i18n centralizado
import { useT } from "../i18n";
import { captureError } from "../lib/sentry";

// PR 76: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "closeUnitFlow".

// ─── Step 1: confirmation modal ─────────────────────────────────────────
export function CloseUnitConfirmModal({ open, unit, onCancel, onContinue, lang = "en" }) {
  const t = useT("closeUnitFlow", lang);
  if (!open || !unit) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          width: "100%",
          maxWidth: 440,
          padding: "22px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17, fontWeight: 700,
          color: C.text,
          letterSpacing: "-0.01em",
          marginBottom: 8,
        }}>
          {t.confirmTitle}
        </div>
        <div style={{
          fontSize: 13.5, color: C.textSecondary,
          lineHeight: 1.5, marginBottom: 6,
        }}>
          <strong style={{ color: C.text }}>{unit.name}</strong>
        </div>
        <div style={{
          fontSize: 13, color: C.textSecondary,
          lineHeight: 1.55, marginBottom: 12,
        }}>
          {t.confirmBody}
        </div>
        <div style={{
          fontSize: 12.5, color: C.textMuted,
          lineHeight: 1.55, marginBottom: 22,
        }}>
          {t.confirmBody2}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 16px",
              borderRadius: 7,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t.notYet}
          </button>
          <button
            onClick={onContinue}
            style={{
              // Black button — user explicitly asked for the mockup style.
              // Negative space, high contrast, signals "this is the
              // serious action".
              padding: "9px 16px",
              borderRadius: 7,
              background: "#000",
              color: "#fff",
              border: "none",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: "pointer",
              transition: "background .12s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1A1A1A"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#000"; }}
          >
            {t.continueToSummary}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: summary page ───────────────────────────────────────────────
//
// Full-page experience showing the unit's stats. Renders inline (not as
// a modal) — the closing of a unit deserves space, not a small dialog.
// ClassPage swaps PlanView for this when closingUnit is set.
export function CloseUnitSummary({ unit, classObj, userId, lang = "en", onBack, onConfirm }) {
  const t = useT("closeUnitFlow", lang);
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // PR6.2: optional reflection from the teacher, saved to units.closing_note
  const [closingNote, setClosingNote] = useState("");

  // PR 12: AI narrative state
  // narrative is the {whatWorked, whatDidnt} object once generated.
  // Loads from unit.closing_narrative cache if present, otherwise auto-
  // generates via /api/close-unit-narrative when the summary data lands.
  const [narrative, setNarrative] = useState(unit?.closing_narrative || null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");

  // PR 12: Suggested review deck state
  // The deck isn't created automatically — teacher clicks "Generate".
  // Once created, we store the deck id so the View link works.
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDeckId, setReviewDeckId] = useState(null);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (!unit?.id) return;
    let cancelled = false;
    // Pre-fill the closing-note textarea if the unit already has one
    // (the teacher is re-closing a previously-closed-then-reopened unit,
    // or revisiting the close-flow on the same unit).
    setClosingNote(unit.closing_note || "");
    (async () => {
      setLoading(true);
      try {
        const data = await getUnitRetentionSummary(unit.id);
        if (!cancelled) setSummary(data);
      } catch (e) {
        console.error("Unit summary fetch failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch keyed on unit id only; reading unit.closing_note here must not re-trigger the fetch
  }, [unit?.id]);

  // PR 12.4: Check if a closing review deck was already generated for
  // this unit. If so, lock the generation button (HARD lock — the
  // teacher can't regenerate from here; they'd have to delete the
  // existing deck from their library first, then revisit close-unit).
  // This survives page reload, browser close, etc — the lock is
  // inferred from the actual deck's existence, not from local state.
  useEffect(() => {
    if (!unit?.id || !classObj?.id) return;
    let cancelled = false;
    (async () => {
      const res = await findExistingReviewDeck({ unit, classObj });
      if (!cancelled && res.ok && res.deckId) {
        setReviewDeckId(res.deckId);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the ids only; passing the full unit/classObj objects must not re-run on every render
  }, [unit?.id, classObj?.id]);

  // PR 12: Auto-generate the AI narrative when the summary is ready.
  // Skip if we already have one cached on the unit row (the teacher
  // is revisiting a previously-summarized unit). Skip if data is too
  // sparse (no decks, no responses) — the writer prompt would just
  // produce the "not enough data" placeholder, no point spending an
  // API call on that. Show that placeholder directly instead.
  useEffect(() => {
    if (!summary || !unit?.id) return;
    // Already cached on the unit row — use it.
    if (unit.closing_narrative) {
      setNarrative(unit.closing_narrative);
      return;
    }
    // Sparse data — show the static "not enough data" message without
    // calling the API.
    const totalResponses = summary.totalResponses || 0;
    const totalSessions = summary.totalSessions || 0;
    if (totalResponses === 0 && totalSessions === 0) {
      setNarrative({
        whatWorked: t.aiNotEnoughData,
        whatDidnt: "",
        _staticFallback: true,
      });
      return;
    }
    // Real generation
    let cancelled = false;
    (async () => {
      setNarrativeLoading(true);
      setNarrativeError("");
      const result = await generateClosingNarrative({
        unitId: unit.id,
        unit,
        classObj,
        summary,
        lang,
      });
      if (cancelled) return;
      setNarrativeLoading(false);
      if (result.ok) {
        setNarrative(result.narrative);
      } else {
        setNarrativeError(result.error);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, unit?.id]);

  // Manual retry for the narrative — only used after an error.
  const retryNarrative = async () => {
    if (!summary || !unit?.id) return;
    setNarrativeLoading(true);
    setNarrativeError("");
    const result = await generateClosingNarrative({
      unitId: unit.id,
      unit,
      classObj,
      summary,
      lang,
    });
    setNarrativeLoading(false);
    if (result.ok) setNarrative(result.narrative);
    else setNarrativeError(result.error);
  };

  // PR 12: handler for the "Generate review deck" button.
  // Generates 7 questions targeting the unit's weakest topics, then
  // saves them as a new general_review deck in the same class.
  const handleGenerateReview = async () => {
    if (!summary || !classObj || !userId) return;
    setReviewLoading(true);
    setReviewError("");
    setReviewDeckId(null);
    const gen = await generateSuggestedReviewQuestions({
      unit, classObj, summary, lang,
    });
    if (!gen.ok) {
      setReviewLoading(false);
      setReviewError(gen.error);
      return;
    }
    const saved = await saveReviewDeck({
      unit,
      classObj,
      questions: gen.questions,
      // PR 12.3: use the language inferred from the unit's deck rows
      // (matches what the AI actually wrote), not the UI language.
      // Falls back to UI lang if inference failed.
      lang: gen.inferredLang || lang,
      authorId: userId,
    });
    setReviewLoading(false);
    if (saved.ok) {
      setReviewDeckId(saved.deckId);
    } else {
      setReviewError(saved.error);
    }
  };

  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    setErrorMsg("");
    try {
      // 1. Mark this unit closed (and save the optional reflection note)
      const trimmedNote = closingNote.trim();
      const updatePayload = {
        status: "closed",
        closed_at: new Date().toISOString(),
      };
      // Only include closing_note if the teacher actually wrote something —
      // we don't want to overwrite a previous note with empty string if
      // they're re-closing a unit (edge case, but safe).
      if (trimmedNote) updatePayload.closing_note = trimmedNote;
      const { error: e1 } = await supabase
        .from("units")
        .update(updatePayload)
        .eq("id", unit.id);
      if (e1) throw e1;

      // 2. Auto-promote: find the most recently created 'planned' unit
      //    in the same class and mark it 'active'. Skip if none exists.
      const { data: candidates } = await supabase
        .from("units")
        .select("id")
        .eq("class_id", unit.class_id)
        .eq("status", "planned")
        .order("created_at", { ascending: false })
        .limit(1);
      const next = (candidates || [])[0];
      if (next) {
        await supabase
          .from("units")
          .update({ status: "active" })
          .eq("id", next.id);
      }

      onConfirm && onConfirm({ promotedId: next?.id || null });
    } catch (e) {
      captureError(e, { source: "CloseUnitFlow.closeUnit" });
      console.error("Close unit failed:", e);
      setErrorMsg(t.closeError);
    } finally {
      setClosing(false);
    }
  };

  if (loading || !summary) {
    return (
      <div style={{
        padding: "40px 20px",
        textAlign: "center",
        color: C.textMuted,
        fontFamily: "'Outfit', sans-serif",
      }}>
        Loading…
      </div>
    );
  }

  // Sort decks by retention desc; nulls (unrun) at the bottom
  const sortedDecks = [...summary.decks].sort((a, b) => {
    if (a.retention === null && b.retention === null) return 0;
    if (a.retention === null) return 1;
    if (b.retention === null) return -1;
    return b.retention - a.retention;
  });

  const hasData = summary.averageRetention !== null;

  return (
    <div style={{
      paddingBottom: 40,
      maxWidth: 700,
      margin: "0 auto",
      // The mockup-like card frame: the summary lives inside a soft
      // bordered card that distinguishes it from the rest of the page.
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "24px 28px 28px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    }}>
      {/* Back link */}
      <button
        onClick={onBack}
        disabled={closing}
        style={{
          background: "transparent",
          border: "none",
          color: C.textSecondary,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 12.5, fontWeight: 500,
          cursor: closing ? "wait" : "pointer",
          padding: "2px 0",
          marginBottom: 16,
          opacity: closing ? 0.5 : 1,
        }}
      >
        {t.back}
      </button>

      {/* Header — narrative title + meta line */}
      <h1 style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 22, fontWeight: 700,
        color: C.text,
        letterSpacing: "-0.015em",
        marginBottom: 6,
        lineHeight: 1.2,
      }}>
        {t.youreClosing} <span style={{ color: C.text }}>"{unit.name}"</span>
      </h1>
      <div style={{
        fontSize: 13, color: C.textMuted,
        marginBottom: 16, lineHeight: 1.5,
      }}>
        {/* Meta line: days · warmups · exits · responses */}
        <MetaPart label={summary.dayCount} unit={t.daysUnit} />
        <Sep />
        <MetaPart label={summary.warmupSessionCount} unit={t.warmupsLaunched} accent={C.orange} />
        <Sep />
        <MetaPart label={summary.exitSessionCount} unit={t.exitsLaunched} accent={C.purple} />
        {summary.totalResponses > 0 && (
          <>
            <Sep />
            <MetaPart label={summary.totalResponses} unit={t.studentResponses} />
          </>
        )}
      </div>

      {/* Stats inline — single bordered row at the top of the data */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: 20,
        padding: "12px 0",
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        marginBottom: 24,
        fontSize: 13,
        color: C.textSecondary,
      }}>
        <InlineStat
          value={summary.averageRetention !== null ? `${summary.averageRetention}%` : "—"}
          label={t.avgRetentionShort}
          accent={summary.averageRetention !== null
            ? (summary.averageRetention >= 70 ? C.green
              : summary.averageRetention >= 40 ? C.orange
              : C.red)
            : C.textMuted}
        />
        <InlineStat value={summary.strongTopics} label={t.strongTopics} />
        <InlineStat value={summary.weakTopics} label={t.weakTopics} accent={summary.weakTopics > 0 ? C.red : null} />
        <InlineStat value={summary.totalSessions} label={t.launches} />
      </div>

      {/* PR 12: AI-generated narrative (What worked / What didn't).
          Three states:
            1. narrativeLoading {"\u2192"} soft skeleton
            2. narrativeError {"\u2192"} error card with retry
            3. narrative present {"\u2192"} render the two paragraphs
          The narrative auto-generates when summary lands (see effect
          above). Cached on units.closing_narrative so re-visiting the
          summary doesn't re-bill the API. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: C.textMuted,
          marginBottom: 10,
          fontFamily: "'Outfit', sans-serif",
        }}>
          {t.aiInsightsLabel}
        </div>

        {narrativeLoading && (
          <div style={{
            padding: "16px 18px",
            background: C.bgSoft,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 13, color: C.textMuted,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: `2px solid ${C.border}`,
              borderTopColor: C.accent,
              animation: "cuf-spin 0.8s linear infinite",
            }} />
            <span>{t.aiGenerating}</span>
            <style>{`@keyframes cuf-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!narrativeLoading && narrativeError && (
          <div style={{
            padding: "14px 16px",
            background: C.redSoft || "#FEE",
            border: `1px solid ${C.red}33`,
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            fontSize: 13, color: C.red,
          }}>
            <span>{t.aiError}</span>
            <button
              onClick={retryNarrative}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: C.bg,
                border: `1px solid ${C.red}55`,
                color: C.red,
                fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {t.aiRetry}
            </button>
          </div>
        )}

        {!narrativeLoading && !narrativeError && narrative && (
          <div style={{
            padding: "16px 18px",
            background: C.bgSoft,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
          }}>
            {/* What worked */}
            {narrative.whatWorked && (
              <div style={{ marginBottom: narrative.whatDidnt ? 14 : 0 }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: C.green || "#0F7B6C",
                  marginBottom: 6,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {t.whatWorkedLabel}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 13.5, lineHeight: 1.6,
                  color: C.text,
                }}>
                  {narrative.whatWorked}
                </p>
              </div>
            )}
            {/* What didn't */}
            {narrative.whatDidnt && (
              <div>
                <div style={{
                  fontSize: 10.5, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: C.orange || "#D9730D",
                  marginBottom: 6,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {t.whatDidntLabel}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 13.5, lineHeight: 1.6,
                  color: C.text,
                }}>
                  {narrative.whatDidnt}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PR 12: Suggested closing review — generates a 7-question recap
          deck targeting the unit's weakest topics. Only shown when the
          unit has weak topics worth reviewing. Three states:
            1. idle (no deck yet) {"\u2192"} "Generate review deck" button
            2. reviewLoading {"\u2192"} "Building..." with spinner
            3. reviewDeckId {"\u2192"} success with "View deck" link
          Errors render inline with the button so retry is one click. */}
      {summary.weakTopics > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: C.textMuted,
            marginBottom: 10,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {t.closingReviewLabel}
          </div>
          <div style={{
            padding: "14px 16px",
            background: C.bgSoft,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: 12.5, color: C.textSecondary,
              lineHeight: 1.5,
              marginBottom: 12,
            }}>
              {t.closingReviewHint}
            </div>

            {!reviewDeckId && !reviewLoading && (
              <button
                onClick={handleGenerateReview}
                disabled={reviewLoading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 7,
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: "pointer",
                }}
              >
                {t.reviewGenerate}
              </button>
            )}

            {reviewLoading && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 13, color: C.textMuted,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: `2px solid ${C.border}`,
                  borderTopColor: C.accent,
                  animation: "cuf-spin 0.8s linear infinite",
                }} />
                <span>{t.reviewGenerating}</span>
              </div>
            )}

            {reviewDeckId && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, color: C.green,
                  fontWeight: 500,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>{t.reviewSuccess}</span>
                </div>
                {/* PR 12.2: direct button to the new deck — saves the
                    teacher a manual hunt through their library. */}
                <button
                  onClick={() => navigate(buildRoute.deckEdit(reviewDeckId))}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 7,
                    background: C.bg,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t.reviewView}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {reviewError && (
              <div style={{
                marginTop: 10,
                fontSize: 12, color: C.red,
              }}>
                {t.reviewError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optional closing note — saves to units.closing_note on confirm.
          Free-form 1-2 sentences. Not required, just an outlet for the
          teacher to capture intent / reflection at close time. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: C.textMuted,
          marginBottom: 8,
          fontFamily: "'Outfit', sans-serif",
        }}>
          {t.noteLabel}
        </div>
        <textarea
          value={closingNote}
          onChange={e => setClosingNote(e.target.value)}
          placeholder={t.notePlaceholder}
          rows={3}
          maxLength={500}
          disabled={closing}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            color: C.text,
            background: C.bg,
            outline: "none",
            resize: "vertical",
            minHeight: 60,
            lineHeight: 1.5,
            transition: "border-color .12s ease",
            boxSizing: "border-box",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
        />
        <div style={{
          fontSize: 10.5, color: C.textMuted,
          marginTop: 4,
          textAlign: "right",
          fontFamily: MONO,
        }}>
          {closingNote.length}/500
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex", gap: 8, justifyContent: "flex-end",
        paddingTop: 14,
        borderTop: `1px solid ${C.border}`,
      }}>
        <button
          onClick={onBack}
          disabled={closing}
          style={{
            padding: "9px 16px",
            borderRadius: 7,
            background: "transparent",
            color: C.textSecondary,
            border: `1px solid ${C.border}`,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13, fontWeight: 500,
            cursor: closing ? "wait" : "pointer",
          }}
        >
          {t.back}
        </button>
        <button
          onClick={handleClose}
          disabled={closing}
          style={{
            padding: "9px 18px",
            borderRadius: 7,
            background: "#000",
            color: "#fff",
            border: "none",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13, fontWeight: 600,
            cursor: closing ? "wait" : "pointer",
            opacity: closing ? 0.7 : 1,
          }}
        >
          {closing ? t.closing : t.closeUnit}
        </button>
      </div>
      {errorMsg && (
        <div style={{
          marginTop: 10,
          padding: "8px 12px",
          background: "#FEE",
          color: C.red,
          borderRadius: 6,
          fontSize: 12,
          textAlign: "right",
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// ─── Tiny presentational helpers for the summary header ─────────────────
function MetaPart({ label, unit, accent }) {
  return (
    <span>
      <strong style={{ color: accent || C.text, fontWeight: 600 }}>{label}</strong>
      <span style={{ marginLeft: 4 }}>{unit}</span>
    </span>
  );
}
function Sep() {
  return <span style={{ margin: "0 8px", color: C.textMuted }}>·</span>;
}
function InlineStat({ value, label, accent }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
      <strong style={{
        color: accent || C.text,
        fontWeight: 700,
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
      }}>{value}</strong>
      <span style={{ color: C.textMuted, fontSize: 12.5 }}>{label}</span>
    </span>
  );
}

// ─── Reopen confirmation modal ──────────────────────────────────────────
//
// Lighter than close — reopening is reversible (you can close again),
// so a single-step modal is enough.
export function ReopenUnitModal({ open, unit, onCancel, onConfirm, lang = "en" }) {
  const t = useT("closeUnitFlow", lang);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!open || !unit) return null;

  const handleReopen = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    // Reopen: status goes back to 'planned' (NOT 'active' — we don't
    // want to bump the currently-active unit unless the teacher decides).
    // closed_at stays — it remains as a record of when this unit was
    // closed, useful if the teacher closes it again later.
    const { error } = await supabase
      .from("units")
      .update({ status: "planned" })
      .eq("id", unit.id);
    setBusy(false);
    if (error) {
      setErrorMsg(t.reopenError);
      return;
    }
    onConfirm && onConfirm();
  };

  return (
    <div
      onClick={busy ? undefined : onCancel}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          width: "100%",
          maxWidth: 420,
          padding: "22px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 16, fontWeight: 700,
          color: C.text,
          marginBottom: 8,
        }}>
          {t.reopenConfirm.replace("{unit}", unit.name)}
        </div>
        <div style={{
          fontSize: 13, color: C.textSecondary,
          lineHeight: 1.5, marginBottom: 20,
        }}>
          {t.reopenBody}
        </div>
        {errorMsg && (
          <div style={{
            padding: "8px 12px",
            background: "#FEE",
            color: C.red,
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 12,
          }}>
            {errorMsg}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "9px 16px",
              borderRadius: 7,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 500,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleReopen}
            disabled={busy}
            style={{
              padding: "9px 16px",
              borderRadius: 7,
              background: C.accent,
              color: "#fff",
              border: "none",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? t.reopening : t.reopenAction}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────
function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.07em",
        color: C.textMuted,
        marginBottom: 4,
        fontFamily: "'Outfit', sans-serif",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 22, fontWeight: 700,
        color: accent || C.text,
        letterSpacing: "-0.01em",
        lineHeight: 1.1,
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Highlight card (strongest / weakest) ───────────────────────────────
function HighlightCard({ label, deck, retention, color, lang }) {
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.07em",
        color,
        marginBottom: 8,
        fontFamily: "'Outfit', sans-serif",
      }}>
        {label}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 4,
      }}>
        <SectionBadge section={deck.section} lang={lang} />
        <span style={{
          fontFamily: MONO,
          fontSize: 16, fontWeight: 700,
          color,
        }}>
          {retention}%
        </span>
      </div>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14, fontWeight: 600, color: C.text,
        lineHeight: 1.3,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {deck.title}
      </div>
    </div>
  );
}
