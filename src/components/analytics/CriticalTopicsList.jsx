// src/components/analytics/CriticalTopicsList.jsx
//
// Analytics Studio Área 3: temas críticos (retención < 40) de TODAS las clases.
// items: CriticalTopic[] de overview-aggregate.criticalTopics().
// onTopicClick(item) → drill a la vista de Temas.
// onGenerateReview(item) → genera un repaso del tema (lo maneja el orquestador,
// que tiene el classObj + profile para llamar close-unit-ai).

import { C } from "../tokens";

const tierColor = (v) => (v >= 70 ? C.green : v >= 40 ? C.orange : C.red);

export default function CriticalTopicsList({ items = [], onTopicClick, onGenerateReview, generatingKey = null }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${C.orange}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Temas críticos</div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Ningún tema bajo el umbral.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((t) => {
            const key = `${t.classId}-${t.topic}`;
            const busy = generatingKey === key;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: C.bgSoft }}>
                <div
                  onClick={onTopicClick ? () => onTopicClick(t) : undefined}
                  onKeyDown={onTopicClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTopicClick(t); } } : undefined}
                  tabIndex={onTopicClick ? 0 : undefined}
                  role={onTopicClick ? "button" : undefined}
                  style={{ minWidth: 0, flex: 1, cursor: onTopicClick ? "pointer" : "default" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{t.className}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: tierColor(t.retention) }}>{t.retention}%</span>
                {onGenerateReview && (
                  <button
                    onClick={() => onGenerateReview(t)}
                    disabled={busy}
                    style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, cursor: busy ? "default" : "pointer", color: C.accent, whiteSpace: "nowrap" }}>
                    {busy ? "Generando…" : "Generar repaso"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
