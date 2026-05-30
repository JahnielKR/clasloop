// src/components/analytics/CleoStrip.jsx
//
// F5 Analytics Studio: franja Cleo del Class Detail — narrativa real
// (via /api/analytics-narrative) + chips de acción cableados.
//
// Props:
//   classId, weakTopics (top temas críticos)
//   classObj: { id, name, subject, grade } — para el generator
//   profile: para author_id
//   classAnalytics: la respuesta cruda de class_analytics (para construir
//                   el context con cleo-analytics.ts)
//   timeseries: serie temporal de ClassDetail
//   onReviewCreated: (deckId) => void — callback para navegar al deck
//   onReteachNow: () => void  — scroll al MostMissedList
//   lang: 'es' | 'en' | 'ko'

import { useEffect, useState } from "react";
import { C } from "../tokens";
import { supabase } from "../../lib/supabase";
import { generateClassReviewQuestions, saveClassReviewDeck } from "../../lib/close-unit-ai";
import { buildClassNarrativeContext } from "../../lib/analytics/cleo-analytics";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const ACCENT = C.purple;
const ACCENT_BG = C.purpleSoft;

function ActionChip({ label, onClick, disabled = false, stub = false, title, soonLabel = "" }) {
  return (
    <button
      onClick={disabled || stub ? undefined : onClick}
      disabled={disabled || stub}
      title={title}
      style={{
        border: `1px solid ${stub ? C.border : C.purple}`,
        color: stub ? C.textSecondary : C.purple,
        background: stub ? "transparent" : C.purpleSoft,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "wait" : (stub ? "not-allowed" : "pointer"),
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {label}{stub && soonLabel ? ` · ${soonLabel}` : ""}
    </button>
  );
}

export default function CleoStrip({
  classId,
  weakTopics = [],
  classObj = null,
  profile = null,
  classAnalytics = null,
  timeseries = [],
  onReviewCreated,
  onReteachNow,
  lang = "es",
}) {
  const tt = useT("classDetail", lang);
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch narrative cuando hay weakTopics + classAnalytics
  useEffect(() => {
    if (!classAnalytics || weakTopics.length === 0) {
      setNarrative("");
      return;
    }
    let cancelled = false;
    setNarrativeLoading(true);
    setError(null);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) setNarrativeLoading(false);
        return;
      }
      const context = buildClassNarrativeContext({
        className: classObj?.name || "",
        classAnalytics,
        timeseries,
        lang,
      });
      try {
        const resp = await fetch("/api/analytics-narrative", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ context }),
        });
        const data = await resp.json();
        if (cancelled) return;
        if (resp.ok && data?.narrative) {
          setNarrative(data.narrative);
        } else {
          setNarrative("");
        }
      } catch {
        if (!cancelled) setNarrative("");
      } finally {
        if (!cancelled) setNarrativeLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [classId, weakTopics.join("|"), classAnalytics, lang]); // eslint-disable-line

  async function handleGenerateReview() {
    if (!classObj || weakTopics.length === 0) return;
    setGenerating(true);
    setError(null);
    const gen = await generateClassReviewQuestions({ classObj, weakTopics, lang });
    if (!gen.ok) {
      setError(gen.error);
      setGenerating(false);
      return;
    }
    const save = await saveClassReviewDeck({
      classObj,
      questions: gen.questions,
      lang: gen.inferredLang || lang,
      authorId: profile?.id || null,
    });
    setGenerating(false);
    if (save.ok && onReviewCreated) onReviewCreated(save.deckId);
    else if (!save.ok) setError(save.error || "save_failed");
  }

  // Placeholder narrative fallback (cuando todavía cargamos o no hay datos)
  const display = narrative ||
    (narrativeLoading ? tt.cleoAnalyzing :
      (weakTopics.length > 0
        ? tt.cleoWeakTopics(weakTopics.slice(0, 3).join(", "))
        : tt.cleoNoData));

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 8,
        padding: "12px 14px",
        margin: "10px 0",
      }}
      data-class-id={classId}
    >
      <div
        style={{
          flex: "0 0 32px",
          height: 32,
          borderRadius: "50%",
          background: ACCENT_BG,
          color: ACCENT,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        C
      </div>
      <div style={{ flex: 1, fontSize: 14 }}>
        <b>{tt.cleoLabel}</b> {display}
        {error && (
          <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>
            {tt.cleoGenError(error)}
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip
            label={generating ? tt.cleoChipGenerating : tt.cleoChipGenerate}
            onClick={handleGenerateReview}
            disabled={generating || weakTopics.length === 0}
            title={tt.cleoGenerateTitle}
          />
          <ActionChip
            label={tt.cleoChipReteach}
            onClick={onReteachNow}
            title={tt.cleoReteachTitle}
          />
          <ActionChip
            label={tt.cleoChipTomorrow}
            stub
            soonLabel={tt.cleoChipSoon}
            title={tt.cleoTomorrowTitle}
          />
        </div>
      </div>
    </div>
  );
}
