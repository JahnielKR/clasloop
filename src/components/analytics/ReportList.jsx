// src/components/analytics/ReportList.jsx
//
// F7 Analytics Studio: lista de reportes guardados con export (PDF/CSV/Excel)
// + delete. El export re-fetcha los datos frescos de class_analytics y arma
// el model con las secciones guardadas (el model guardado es la receta;
// los datos se traen al vuelo para que el reporte siempre sea actual).
// i18n: useT("reports") + useT("studioCommon").

import { C } from "../tokens";
import ExportMenu from "./ExportMenu";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

// Short localized date for the saved-report sub-line (e.g. "May 30").
function fmtDate(iso, lang) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : lang, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function ReportList({
  reports = [],
  onExportModel,
  onDelete,
  deletingId = null,
}) {
  const lang = useLang();
  const t = useT("reports", lang);
  const c = useT("studioCommon", lang);
  if (reports.length === 0) {
    return (
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 16,
          opacity: 0.6,
          fontSize: 13,
        }}
      >
        {t.empty}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reports.map((r) => (
        <div
          key={r.id}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: C.textSecondary }}>
              {t.sectionsCount(r.model?.sections?.length ?? 0)} · {r.period || "—"}
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
            title={c.delete}
            style={{
              border: `1px solid ${C.redSoft}`,
              background: C.redSoft,
              color: C.red,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: deletingId === r.id ? "wait" : "pointer",
            }}
          >
            {deletingId === r.id ? "…" : c.delete}
          </button>
        </div>
      ))}
    </div>
  );
}
