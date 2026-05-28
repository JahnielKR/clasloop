// src/components/analytics/StudentMostFailedList.jsx
//
// F2 Analytics Studio: Top preguntas más falladas del alumno
// (paralelo a MostMissedList de F1, pero scoped a un alumno).
// Drill a DeckResults funciona; "Asignar repaso" es stub (F5).

export default function StudentMostFailedList({ classId, studentRef, items = [], onItemClick }) {
  const show = items.slice(0, 5);

  return (
    <div
      style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}
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
      <span
        title="Llega en F5 (Cleo + generator student-level)"
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
        Asignar repaso · pronto
      </span>
    </div>
  );
}
