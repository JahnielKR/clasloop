// src/components/analytics/CleoStrip.jsx
//
// F1 Analytics Studio: franja Cleo en el Class Detail.
//
// Desviación del plan F1:
//   El plan asumía que close-unit-ai.js exponía un generador a nivel de
//   CLASE (`generateSuggestedReviewQuestions({classId, topics})`), pero
//   la firma real es `({unit, classObj, summary, lang})` — está
//   diseñada para el flujo de cerrar una UNIDAD. Adaptarlo class-level
//   requiere un wrapper nuevo que pertenece a F5 (Cleo + class-level
//   review generator).
//
//   En F1 el visual queda completo (narrativa placeholder + 3 chips de
//   acción), pero los 3 chips son stub con "pronto · F5". Cuando F5 cablee
//   el generator class-scoped, los 3 se activan sin tocar este archivo.
//
// Props:
//   classId: string  — preservado en la API para que F5 no rompa el call site
//   weakTopics: string[]  — top temas con peor retención (para la narrativa)

const ACCENT = "#7c3aed";
const ACCENT_BG = "#ede9fe";

function ActionChip({ label }) {
  return (
    <span
      style={{
        border: "1px solid #d4d4d8",
        color: "#71717a",
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 12,
        cursor: "not-allowed",
      }}
      title="Llega en F5 (Cleo + generator class-level)"
    >
      {label} · pronto
    </span>
  );
}

export default function CleoStrip({ classId, weakTopics = [] }) {
  // F1 placeholder narrative; F5 la reemplaza con output de Gemini.
  const narrative =
    weakTopics.length > 0
      ? `Los temas con menor retención esta ventana son: ${weakTopics.slice(0, 3).join(", ")}. La narrativa pedagógica completa llega cuando se active Cleo (F5).`
      : "Sin datos suficientes en esta ventana de fechas. La narrativa pedagógica llega cuando se active Cleo (F5).";

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
        <b>Cleo:</b> {narrative}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip label="Generar repaso de lo flojo" />
          <ActionChip label="Reenseñar ahora" />
          <ActionChip label="Que vuelva mañana" />
        </div>
      </div>
    </div>
  );
}
