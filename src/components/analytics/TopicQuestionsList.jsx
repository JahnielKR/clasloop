// src/components/analytics/TopicQuestionsList.jsx
//
// F3 Analytics Studio: lista compacta de las preguntas falladas del tema
// (las que no son la TOP — esa la come MisconceptionPanel). Click → DeckResults.

import { C } from "../tokens";

export default function TopicQuestionsList({ questions = [], onItemClick }) {
  // El primer item ya lo muestra MisconceptionPanel.
  const rest = questions.slice(1, 8);

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Otras preguntas falladas
      </div>
      {rest.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>
          Sin preguntas adicionales con error en esta ventana.
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          {rest.map((it, i) => (
            <div
              key={`${it.deck_id}-${it.question_index}`}
              onClick={onItemClick ? () => onItemClick(it) : undefined}
              style={{
                borderBottom: i < rest.length - 1 ? `1px solid ${C.bgSoft}` : "none",
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
                {it.question?.q || `P. ${it.question_index + 1}`}
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
    </div>
  );
}
