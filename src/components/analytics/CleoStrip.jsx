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
import { supabase } from "../../lib/supabase";
import { generateClassReviewQuestions, saveClassReviewDeck } from "../../lib/close-unit-ai";
import { buildClassNarrativeContext } from "../../lib/analytics/cleo-analytics";

const ACCENT = "#7c3aed";
const ACCENT_BG = "#ede9fe";

function ActionChip({ label, onClick, disabled = false, stub = false, title }) {
  return (
    <button
      onClick={disabled || stub ? undefined : onClick}
      disabled={disabled || stub}
      title={title}
      style={{
        border: `1px solid ${stub ? "#d4d4d8" : "#c4b5fd"}`,
        color: stub ? "#71717a" : "#5b21b6",
        background: stub ? "transparent" : "#f5f3ff",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "wait" : (stub ? "not-allowed" : "pointer"),
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {label}{stub ? " · pronto" : ""}
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
    (narrativeLoading ? "Cleo está analizando los datos…" :
      (weakTopics.length > 0
        ? `Los temas con menor retención son: ${weakTopics.slice(0, 3).join(", ")}.`
        : "Sin datos suficientes en esta ventana de fechas."));

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        background: "#fff",
        border: "1px solid #e4e4e7",
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
        <b>Cleo:</b> {display}
        {error && (
          <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
            No pude generar el repaso ({error}). Intentá de nuevo.
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip
            label={generating ? "Generando…" : "Generar repaso de lo flojo"}
            onClick={handleGenerateReview}
            disabled={generating || weakTopics.length === 0}
            title="Crea un deck de repaso de 7 preguntas sobre los temas más débiles"
          />
          <ActionChip
            label="Reenseñar ahora"
            onClick={onReteachNow}
            title="Salta al panel de preguntas más falladas"
          />
          <ActionChip
            label="Que vuelva mañana"
            stub
            title="Llega cuando se sume el scheduler de tareas (F6+)"
          />
        </div>
      </div>
    </div>
  );
}
