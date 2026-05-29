// src/components/analytics/StudentMostFailedList.jsx
//
// F2 Analytics Studio: Top preguntas más falladas del alumno
// (paralelo a MostMissedList de F1, pero scoped a un alumno).
// Drill a DeckResults funciona; "Asignar repaso" es stub (F5).

import { C } from "../tokens";

export default function StudentMostFailedList({ classId, studentRef, items = [], onItemClick, onAssignReview, generating = false }) {
  const show = items.slice(0, 5);

  return (
    <div
      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}
      data-class-id={classId}
      data-student-ref={studentRef}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Más falladas por el alumno
      </div>
      {show.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>
          Sin datos suficientes.
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          {show.map((it, i) => (
            <div
              key={`${it.deck_id}-${it.question_index}`}
              onClick={onItemClick ? () => onItemClick(it) : undefined}
              style={{
                borderBottom: i < show.length - 1 ? `1px solid ${C.bgSoft}` : "none",
                padding: "3px 0",
                cursor: onItemClick ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                P. {it.question_index + 1}
                {it.topic ? ` · ${it.topic}` : ""}
              </span>
              <b
                style={{
                  color:
                    it.error_rate >= 60
                      ? C.red
                      : it.error_rate >= 40
                        ? C.orange
                        : C.green,
                }}
              >
                {Math.round(it.error_rate)}% err
              </b>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onAssignReview}
        disabled={!onAssignReview || generating}
        title={generating ? "Generando…" : "Crear deck de repaso enfocado en este alumno"}
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
          cursor: onAssignReview ? (generating ? "wait" : "pointer") : "not-allowed",
          opacity: onAssignReview ? 1 : 0.55,
        }}
      >
        {generating ? "Generando…" : "Asignar repaso"}
      </button>
    </div>
  );
}
