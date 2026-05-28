// src/components/analytics/CompareToggle.jsx
//
// F4 Analytics Studio: toggle "Comparar" en la toolbar de las páginas
// de detalle (ClassDetail / StudentProfile / TopicMastery).
//
// Props:
//   value: 'off' | 'prev'  — 'off' = sin comparar; 'prev' = vs período anterior
//   onChange: (next) => void
//
// Future modes ('class-vs-class', 'student-vs-class-avg') quedan para
// iteraciones posteriores.

export default function CompareToggle({ value = "off", onChange }) {
  const active = value === "prev";
  return (
    <button
      onClick={() => onChange?.(active ? "off" : "prev")}
      aria-pressed={active}
      style={{
        padding: "4px 11px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? "#2563eb" : "#fff",
        color: active ? "#fff" : "inherit",
        border: "1px solid #e4e4e7",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span aria-hidden style={{ fontSize: 11 }}>{active ? "✓" : "▦"}</span>
      Comparar
    </button>
  );
}
