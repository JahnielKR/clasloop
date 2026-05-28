// src/components/analytics/MostMissedList.jsx
//
// F1 Analytics Studio: Top preguntas más falladas del Class Detail.
// Recibe most_missed de class_analytics (top 10, ya ordenado por error_rate).
//
// Desviación del plan F1 (misma razón que CleoStrip):
//   El botón "Generar repaso" iba a reusar close-unit-ai, pero ese módulo
//   está diseñado para flujo unit-level ({unit, classObj, summary}), no
//   class-level. Class-scoped review generator es F5. En F1 el botón
//   queda visible pero stub "pronto · F5".
//
//   El drill-down (click en una fila → DeckResults) SÍ funciona en F1.
//
// Props:
//   classId: string  — preservado para que F5 no rompa el call site
//   items: most_missed array de class_analytics
//          [{ question_index, deck_id, topic, total_responses, incorrect_count, error_rate }]
//   onItemClick: (item) => void — drill al DeckResults; lo enchufa el padre.

export default function MostMissedList({ classId, items = [], onItemClick, onGenerateReview, generating = false }) {
  const show = items.slice(0, 3);

  return (
    <div
      style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}
      data-class-id={classId}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Más falladas
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
                borderBottom: i < show.length - 1 ? "1px solid #f4f4f5" : "none",
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
                      ? "#dc2626"
                      : it.error_rate >= 40
                        ? "#eab308"
                        : "#16a34a",
                }}
              >
                {Math.round(it.error_rate)}% err
              </b>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onGenerateReview}
        disabled={!onGenerateReview || generating}
        title={generating ? "Generando…" : "Crear deck de repaso de lo más fallado"}
        style={{
          display: "inline-block",
          marginTop: 8,
          border: "1px solid #c4b5fd",
          color: "#5b21b6",
          background: "#f5f3ff",
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
