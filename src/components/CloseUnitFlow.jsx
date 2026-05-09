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
import { supabase } from "../lib/supabase";
import { getUnitRetentionSummary } from "../lib/spaced-repetition";
import { C, MONO } from "./tokens";
import SectionBadge, { sectionAccent } from "./SectionBadge";

const i18n = {
  en: {
    confirmTitle: "Close this unit?",
    confirmBody: "We'll show you a summary of how the class did, suggest a closing review based on the weakest topics, and let you start the next unit.",
    confirmBody2: "Decks from this unit don't disappear — they stay in your library and may resurface as review suggestions weeks later.",
    notYet: "Not yet",
    continueToSummary: "Continue with the summary →",

    summaryHeader: "Closing summary",
    summarySubtitle: "Here's how {unit} went.",
    daysPlanned: "Days planned",
    daysLaunched: "Days launched",
    avgRetention: "Average retention",
    totalSessions: "Total sessions",
    noDataYet: "No data yet — this unit was closed before any session ran.",
    deckBreakdown: "Deck breakdown",
    deckBreakdownHint: "Sorted by retention. Strongest first.",
    strongest: "Strongest",
    weakest: "Weakest",
    statusStrong: "Strong",
    statusMedium: "Medium",
    statusWeak: "Weak",
    statusNew: "Not yet run",
    notLaunched: "not launched",

    back: "← Back",
    closeUnit: "Close unit",
    closing: "Closing…",
    closeError: "Could not close the unit. Try again.",

    // Reopen flow (lighter, single-step)
    reopenLabel: "Reopen",
    reopenConfirm: "Reopen {unit}?",
    reopenBody: "It will go back to 'Planned'. Your closing summary stays available.",
    reopenAction: "Reopen unit",
    reopening: "Reopening…",
    reopenError: "Could not reopen. Try again.",
    cancel: "Cancel",
  },
  es: {
    confirmTitle: "¿Cerrar esta unidad?",
    confirmBody: "Te mostraremos un resumen de cómo le fue a la clase, sugeriremos un repaso de cierre basado en los temas más débiles, y te dejamos empezar la siguiente unidad.",
    confirmBody2: "Los decks de esta unidad no desaparecen — quedan en tu biblioteca y pueden volver como sugerencias de repaso semanas después.",
    notYet: "Todavía no",
    continueToSummary: "Continuar al resumen →",

    summaryHeader: "Resumen de cierre",
    summarySubtitle: "Así fue {unit}.",
    daysPlanned: "Días planeados",
    daysLaunched: "Días lanzados",
    avgRetention: "Retención promedio",
    totalSessions: "Sesiones totales",
    noDataYet: "Sin datos — esta unidad se cerró sin sesiones lanzadas.",
    deckBreakdown: "Desglose por deck",
    deckBreakdownHint: "Ordenado por retención. Los mejores primero.",
    strongest: "Mejor",
    weakest: "Peor",
    statusStrong: "Fuerte",
    statusMedium: "Medio",
    statusWeak: "Débil",
    statusNew: "Sin lanzar",
    notLaunched: "no lanzado",

    back: "← Volver",
    closeUnit: "Cerrar unidad",
    closing: "Cerrando…",
    closeError: "No se pudo cerrar. Intenta de nuevo.",

    reopenLabel: "Reabrir",
    reopenConfirm: "¿Reabrir {unit}?",
    reopenBody: "Volverá a estado 'Planeada'. Tu resumen de cierre se mantiene.",
    reopenAction: "Reabrir unidad",
    reopening: "Reabriendo…",
    reopenError: "No se pudo reabrir. Intenta de nuevo.",
    cancel: "Cancelar",
  },
  ko: {
    confirmTitle: "이 단원을 종료할까요?",
    confirmBody: "수업이 어떻게 진행되었는지 요약을 보여드리고, 가장 약한 주제를 기반으로 마무리 복습을 제안하며, 다음 단원을 시작할 수 있게 해드립니다.",
    confirmBody2: "이 단원의 덱은 사라지지 않습니다 — 라이브러리에 남아있으며 몇 주 후 복습 제안으로 다시 나타날 수 있습니다.",
    notYet: "아직",
    continueToSummary: "요약 보기 →",

    summaryHeader: "종료 요약",
    summarySubtitle: "{unit}은(는) 이렇게 진행되었습니다.",
    daysPlanned: "계획된 일수",
    daysLaunched: "실행된 일수",
    avgRetention: "평균 보존율",
    totalSessions: "전체 세션",
    noDataYet: "데이터 없음 — 세션 실행 없이 종료되었습니다.",
    deckBreakdown: "덱별 분석",
    deckBreakdownHint: "보존율 순 정렬. 가장 강한 것부터.",
    strongest: "최강",
    weakest: "최약",
    statusStrong: "강함",
    statusMedium: "보통",
    statusWeak: "약함",
    statusNew: "미실행",
    notLaunched: "미실행",

    back: "← 뒤로",
    closeUnit: "단원 종료",
    closing: "종료 중…",
    closeError: "종료할 수 없습니다. 다시 시도하세요.",

    reopenLabel: "다시 열기",
    reopenConfirm: "{unit}을(를) 다시 열까요?",
    reopenBody: "'예정' 상태로 돌아갑니다. 종료 요약은 유지됩니다.",
    reopenAction: "단원 다시 열기",
    reopening: "다시 여는 중…",
    reopenError: "다시 열 수 없습니다.",
    cancel: "취소",
  },
};

// ─── Step 1: confirmation modal ─────────────────────────────────────────
export function CloseUnitConfirmModal({ open, unit, onCancel, onContinue, lang = "en" }) {
  const t = i18n[lang] || i18n.en;
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
export function CloseUnitSummary({ unit, lang = "en", onBack, onConfirm }) {
  const t = i18n[lang] || i18n.en;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!unit?.id) return;
    let cancelled = false;
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
  }, [unit?.id]);

  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    setErrorMsg("");
    try {
      // 1. Mark this unit closed
      const { error: e1 } = await supabase
        .from("units")
        .update({ status: "closed", closed_at: new Date().toISOString() })
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
    <div style={{ paddingBottom: 40, maxWidth: 720, margin: "0 auto" }}>
      {/* Back link */}
      <button
        onClick={onBack}
        disabled={closing}
        style={{
          background: "transparent",
          border: "none",
          color: C.textSecondary,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13, fontWeight: 500,
          cursor: closing ? "wait" : "pointer",
          padding: "4px 0",
          marginBottom: 18,
          opacity: closing ? 0.5 : 1,
        }}
      >
        {t.back}
      </button>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: C.textMuted,
          marginBottom: 6,
          fontFamily: "'Outfit', sans-serif",
        }}>
          {t.summaryHeader}
        </div>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 28, fontWeight: 700,
          color: C.text,
          letterSpacing: "-0.02em",
          marginBottom: 6,
          lineHeight: 1.2,
        }}>
          {unit.name}
        </h1>
        <p style={{
          fontSize: 14, color: C.textSecondary,
          lineHeight: 1.5,
        }}>
          {t.summarySubtitle.replace("{unit}", unit.name)}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 28,
      }}>
        <Stat label={t.daysPlanned} value={summary.dayCount} />
        <Stat label={t.daysLaunched} value={`${summary.daysLaunched}/${summary.dayCount}`} />
        <Stat
          label={t.avgRetention}
          value={summary.averageRetention !== null ? `${summary.averageRetention}%` : "—"}
          accent={summary.averageRetention !== null
            ? (summary.averageRetention >= 70 ? C.green
              : summary.averageRetention >= 40 ? C.orange
              : C.red)
            : C.textMuted}
        />
        <Stat label={t.totalSessions} value={summary.totalSessions} />
      </div>

      {/* Strongest / weakest highlight */}
      {hasData && summary.strongest && summary.weakest && summary.strongest.deck.id !== summary.weakest.deck.id && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginBottom: 28,
        }}>
          <HighlightCard
            label={t.strongest}
            deck={summary.strongest.deck}
            retention={summary.strongest.retention}
            color={C.green}
            lang={lang}
          />
          <HighlightCard
            label={t.weakest}
            deck={summary.weakest.deck}
            retention={summary.weakest.retention}
            color={C.red}
            lang={lang}
          />
        </div>
      )}

      {/* Deck breakdown */}
      {sortedDecks.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14, fontWeight: 700,
            color: C.text,
            marginBottom: 4,
          }}>
            {t.deckBreakdown}
          </h3>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
            {t.deckBreakdownHint}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedDecks.map(({ deck, retention, status, sessionCount }) => {
              const stripe = sectionAccent(deck.section);
              const retCol = retention === null ? C.textMuted
                : retention >= 70 ? C.green
                : retention >= 40 ? C.orange
                : C.red;
              const statusLabel = status === 'strong' ? t.statusStrong
                : status === 'medium' ? t.statusMedium
                : status === 'weak' ? t.statusWeak
                : t.statusNew;
              return (
                <div
                  key={deck.id}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${stripe}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <SectionBadge section={deck.section} lang={lang} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 13.5, fontWeight: 600, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {deck.title}
                    </div>
                    <div style={{
                      fontSize: 11, color: C.textMuted,
                      marginTop: 2,
                    }}>
                      {sessionCount > 0
                        ? `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}`
                        : t.notLaunched}
                    </div>
                  </div>
                  {retention !== null ? (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontFamily: MONO,
                        fontSize: 13, fontWeight: 700,
                        color: retCol,
                      }}>
                        {retention}%
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "2px 6px", borderRadius: 4,
                        background: retCol + "1A",
                        color: retCol,
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 10.5, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      color: C.textMuted,
                      flexShrink: 0,
                    }}>
                      {t.statusNew}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No-data fallback */}
      {!hasData && (
        <div style={{
          padding: "24px 20px",
          background: C.bgSoft,
          border: `1px dashed ${C.border}`,
          borderRadius: 10,
          textAlign: "center",
          color: C.textSecondary,
          fontSize: 13,
          marginBottom: 28,
        }}>
          {t.noDataYet}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: "flex", gap: 8, justifyContent: "flex-end",
        paddingTop: 16,
        borderTop: `1px solid ${C.border}`,
      }}>
        <button
          onClick={onBack}
          disabled={closing}
          style={{
            padding: "10px 18px",
            borderRadius: 7,
            background: "transparent",
            color: C.textSecondary,
            border: `1px solid ${C.border}`,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13.5, fontWeight: 500,
            cursor: closing ? "wait" : "pointer",
          }}
        >
          {t.back}
        </button>
        <button
          onClick={handleClose}
          disabled={closing}
          style={{
            padding: "10px 18px",
            borderRadius: 7,
            background: "#000",
            color: "#fff",
            border: "none",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13.5, fontWeight: 600,
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

// ─── Reopen confirmation modal ──────────────────────────────────────────
//
// Lighter than close — reopening is reversible (you can close again),
// so a single-step modal is enough.
export function ReopenUnitModal({ open, unit, onCancel, onConfirm, lang = "en" }) {
  const t = i18n[lang] || i18n.en;
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
