// src/components/analytics/RiskOverviewList.jsx
//
// Analytics Studio Área 3: alumnos en riesgo de TODAS las clases (cockpit).
// items: RankedRiskStudent[] de overview-aggregate.topRiskStudents().
// onStudentClick(item) → drill al perfil del alumno.
// i18n: título/estados via useT("director").

import RiskBadge from "./RiskBadge";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

export default function RiskOverviewList({ items = [], onStudentClick, loading = false }) {
  const t = useT("director", useLang());
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${C.red}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.atRisk}</div>
      {loading ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>{t.calculating}</div>
      ) : items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>{t.riskEmpty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((s) => {
            const clickable = !!onStudentClick;
            const drill = clickable ? () => onStudentClick(s) : undefined;
            return (
              <div key={`${s.classId}-${s.name}`}
                onClick={drill}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drill(); } } : undefined}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: C.bgSoft, cursor: clickable ? "pointer" : "default" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.className}{s.reasons?.[0] ? ` · ${s.reasons[0]}` : ""}
                  </div>
                </div>
                <RiskBadge level={s.level} score={s.score} compact />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
