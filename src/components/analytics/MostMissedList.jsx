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

export default function MostMissedList({ classId, items = [], onItemClick }) {
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
      {/* Stub action — class-level review generator vive en F5. */}
      <span
        title="Llega en F5 (Cleo + generator class-level)"
        style={{
          display: "inline-block",
          marginTop: 8,
          border: "1px solid #d4d4d8",
          color: "#71717a",
          padding: "2px 9px",
          borderRadius: 6,
          fontSize: 12,
          cursor: "not-allowed",
        }}
      >
        Generar repaso · pronto
      </span>
    </div>
  );
}
