// src/components/analytics/CleoStudentStrip.jsx
//
// F2 Analytics Studio: franja Cleo del Student Profile.
// Narrativa placeholder hasta F5 (mismo patrón que CleoStrip de F1).
// Chips de acción stub: F5 cablea Cleo class+student-level.

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
      title="Llega en F5 (Cleo con contexto de alumno)"
    >
      {label} · pronto
    </span>
  );
}

export default function CleoStudentStrip({ studentRef, weakTopics = [], deltaVsClass = null }) {
  const parts = [];
  if (weakTopics.length > 0) {
    parts.push(`Temas a reforzar: ${weakTopics.slice(0, 3).join(", ")}.`);
  }
  if (deltaVsClass != null) {
    if (deltaVsClass >= 0) {
      parts.push(`Está ${deltaVsClass}% por encima de la media de la clase.`);
    } else {
      parts.push(`Está ${Math.abs(deltaVsClass)}% por debajo de la media de la clase.`);
    }
  }
  const narrative =
    parts.length > 0
      ? `${parts.join(" ")} La narrativa pedagógica completa llega en F5.`
      : "Sin datos suficientes en esta ventana. La narrativa pedagógica llega en F5.";

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
        <b>Cleo:</b> {narrative}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip label="Asignarle repaso" />
          <ActionChip label="Mensaje a familia" />
        </div>
      </div>
    </div>
  );
}
