// src/components/analytics/CleoStudentStrip.jsx
//
// F5 Analytics Studio: franja Cleo del Student Profile — narrativa real
// + chip "Asignarle repaso" cableado a generateStudentReviewQuestions.

import { useEffect, useState } from "react";
import { C } from "../tokens";
import { supabase } from "../../lib/supabase";
import {
  generateStudentReviewQuestions,
  saveClassReviewDeck,
} from "../../lib/close-unit-ai";
import { buildStudentNarrativeContext } from "../../lib/analytics/cleo-analytics";

const ACCENT = C.purple;
const ACCENT_BG = C.purpleSoft;

function ActionChip({ label, onClick, disabled = false, stub = false, title }) {
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
      {label}{stub ? " · pronto" : ""}
    </button>
  );
}

export default function CleoStudentStrip({
  studentRef,
  weakTopics = [],
  deltaVsClass = null,
  detail = null,
  classObj = null,
  profile = null,
  onReviewCreated,
  lang = "es",
}) {
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!detail) {
      setNarrative("");
      return;
    }
    let cancelled = false;
    setNarrativeLoading(true);
    setError(null);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { if (!cancelled) setNarrativeLoading(false); return; }
      const context = buildStudentNarrativeContext({
        studentName: studentRef,
        detail,
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
        if (resp.ok && data?.narrative) setNarrative(data.narrative);
        else setNarrative("");
      } catch {
        if (!cancelled) setNarrative("");
      } finally {
        if (!cancelled) setNarrativeLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [studentRef, detail, lang]);

  async function handleAssignReview() {
    if (!classObj || !studentRef) return;
    setGenerating(true);
    setError(null);
    const gen = await generateStudentReviewQuestions({
      classObj,
      studentName: studentRef,
      weakTopics,
      mostFailed: detail?.most_failed || [],
      lang,
    });
    if (!gen.ok) { setError(gen.error); setGenerating(false); return; }
    const save = await saveClassReviewDeck({
      classObj,
      questions: gen.questions,
      lang: gen.inferredLang || lang,
      authorId: profile?.id || null,
      studentName: studentRef,
    });
    setGenerating(false);
    if (save.ok && onReviewCreated) onReviewCreated(save.deckId);
    else if (!save.ok) setError(save.error || "save_failed");
  }

  // Fallback narrative
  const parts = [];
  if (weakTopics.length > 0) parts.push(`Temas a reforzar: ${weakTopics.slice(0, 3).join(", ")}.`);
  if (deltaVsClass != null) {
    if (deltaVsClass >= 0) parts.push(`Está ${deltaVsClass}% por encima de la media de la clase.`);
    else parts.push(`Está ${Math.abs(deltaVsClass)}% por debajo de la media de la clase.`);
  }
  const display = narrative ||
    (narrativeLoading ? "Cleo está analizando al alumno…" :
      (parts.length > 0 ? parts.join(" ") : "Sin datos suficientes en esta ventana."));

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
      data-student-ref={studentRef}
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
          <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>
            No pude generar el repaso ({error}). Intentá de nuevo.
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip
            label={generating ? "Generando…" : "Asignarle repaso"}
            onClick={handleAssignReview}
            disabled={generating || !classObj}
            title="Crea un deck de repaso enfocado en este alumno"
          />
          <ActionChip
            label="Mensaje a familia"
            stub
            title="Llega cuando se sume mensajería a familias"
          />
        </div>
      </div>
    </div>
  );
}
