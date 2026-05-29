// src/components/analytics/TopicMatrix.jsx
//
// F3 Analytics Studio: matriz de dominio por tema. Grid de celdas, una
// por tema. Color por tier de retención (verde/amarillo/rojo). Click
// selecciona; tema seleccionado se destaca con borde azul.
//
// Props:
//   topics: [{ topic, retention_score, ... }] — de class_analytics.topic_mastery
//   selectedTopic: string | null
//   onSelect: (topic: string) => void

import { C } from "../tokens";

function tierColor(score) {
  if (score >= 70) return { bg: C.greenSoft, color: C.green, label: "fuerte" };
  if (score >= 40) return { bg: C.orangeSoft, color: C.orange, label: "flojo" };
  return { bg: C.redSoft, color: C.red, label: "crítico" };
}

export default function TopicMatrix({ topics = [], selectedTopic = null, onSelect }) {
  if (topics.length === 0) {
    return (
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 16,
          opacity: 0.55,
          fontSize: 14,
        }}
      >
        Sin temas registrados todavía.
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>Matriz de dominio</b>
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          {topics.length} {topics.length === 1 ? "tema" : "temas"} · click selecciona
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {topics.map((t) => {
          const score = Math.round(Number(t.retention_score) || 0);
          const tier = tierColor(score);
          const active = t.topic === selectedTopic;
          return (
            <button
              key={t.topic}
              onClick={() => onSelect?.(t.topic)}
              aria-pressed={active}
              style={{
                background: tier.bg,
                color: tier.color,
                border: active ? `2px solid ${C.accent}` : "1px solid transparent",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1.3,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.topic}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>{score}%</span>
                <span style={{ opacity: 0.7 }}>{tier.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
