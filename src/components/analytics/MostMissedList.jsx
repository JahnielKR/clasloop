// src/components/analytics/MostMissedList.jsx
//
// F1 Analytics Studio: Top preguntas más falladas del Class Detail.
// F5: botón "Generar repaso" (class-scoped generator).
// F8: crossfilter — cuando hay un tema seleccionado (TopicBarListPanel),
// resalta las preguntas de ese tema y atenúa el resto. Filas keyboard-nav.
//
// Props:
//   classId, items, onItemClick (F1) · onGenerateReview, generating (F5)

import { useCrossfilter } from "../../hooks/useCrossfilter";
import { C } from "../tokens";

export default function MostMissedList({ classId, items = [], onItemClick, onGenerateReview, generating = false }) {
  const { selectedTopic } = useCrossfilter();
  const show = items.slice(0, 3);

  return (
    <div
      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}
      data-class-id={classId}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Más falladas</div>
      {selectedTopic && (
        <div style={{ fontSize: 11, color: C.accent, marginBottom: 4 }}>
          Resaltando: {selectedTopic}
        </div>
      )}
      {show.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>Sin datos suficientes.</div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          {show.map((it, i) => {
            const dimmed = selectedTopic != null && it.topic !== selectedTopic;
            const match = selectedTopic != null && it.topic === selectedTopic;
            const drill = onItemClick ? () => onItemClick(it) : undefined;
            return (
              <div
                key={`${it.deck_id}-${it.question_index}`}
                onClick={drill}
                onKeyDown={
                  onItemClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          drill();
                        }
                      }
                    : undefined
                }
                tabIndex={onItemClick ? 0 : undefined}
                role={onItemClick ? "button" : undefined}
                style={{
                  borderBottom: i < show.length - 1 ? `1px solid ${C.bgSoft}` : "none",
                  borderLeft: match ? `3px solid ${C.accent}` : "3px solid transparent",
                  padding: "3px 0 3px 6px",
                  cursor: onItemClick ? "pointer" : "default",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  opacity: dimmed ? 0.35 : 1,
                  transition: "opacity .15s ease",
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  P. {it.question_index + 1}
                  {it.topic ? ` · ${it.topic}` : ""}
                </span>
                <b
                  style={{
                    color: it.error_rate >= 60 ? C.red : it.error_rate >= 40 ? C.orange : C.green,
                  }}
                >
                  {Math.round(it.error_rate)}% err
                </b>
              </div>
            );
          })}
        </div>
      )}
      <button
        onClick={onGenerateReview}
        disabled={!onGenerateReview || generating}
        title={generating ? "Generando…" : "Crear deck de repaso de lo más fallado"}
        style={{
          display: "inline-block",
          marginTop: 8,
          border: `1px solid ${C.purple}`,
          color: C.purple,
          background: C.purpleSoft,
          padding: "3px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          cursor: onGenerateReview ? (generating ? "wait" : "pointer") : "not-allowed",
          opacity: onGenerateReview ? 1 : 0.55,
        }}
      >
        {generating ? "Generando…" : "Generar repaso"}
      </button>
    </div>
  );
}
