// src/components/analytics/ReportList.jsx
//
// F7 Analytics Studio: lista de reportes guardados con export (PDF/CSV/Excel)
// + delete. El export re-fetcha los datos frescos de class_analytics y arma
// el model con las secciones guardadas (el model guardado es la receta;
// los datos se traen al vuelo para que el reporte siempre sea actual).

import ExportMenu from "./ExportMenu";

export default function ReportList({
  reports = [],
  onExportModel,
  onDelete,
  deletingId = null,
}) {
  if (reports.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e4e4e7",
          borderRadius: 8,
          padding: 16,
          opacity: 0.6,
          fontSize: 13,
        }}
      >
        Todavía no guardaste ningún reporte. Creá uno con el formulario.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reports.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#71717a" }}>
              {(r.model?.sections?.length ?? 0)} secciones · {r.period || "—"}
            </div>
          </div>
          <ExportMenu
            baseName={
              r.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "reporte"
            }
            buildModel={() => onExportModel?.(r)}
          />
          <button
            onClick={() => onDelete?.(r.id)}
            disabled={deletingId === r.id}
            title="Eliminar"
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: deletingId === r.id ? "wait" : "pointer",
            }}
          >
            {deletingId === r.id ? "…" : "Eliminar"}
          </button>
        </div>
      ))}
    </div>
  );
}
