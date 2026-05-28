// src/components/analytics/TopicBarListPanel.jsx
//
// F1 Analytics Studio: panel con Top-N temas (dominados o críticos)
// del Class Detail. Reusa HorizontalBarList. Variant = "dominated" | "critical".
//
// Props:
//   variant: "dominated" | "critical"
//   topicMastery: array — viene de class_analytics.topic_mastery
//                        [{ topic, retention_score, … }]
//   limit: number = 5
//   onTopicClick: (topic) => void  opcional — F1 no se cablea (la página
//   de Tema entra en F3).

import { HorizontalBarList } from "../charts";

const COLORS = {
  dominated: "#dcfce7", // verde claro
  critical: "#fee2e2",  // rojo claro
};

export default function TopicBarListPanel({
  variant = "dominated",
  topicMastery = [],
  limit = 5,
  onTopicClick,
}) {
  const isDominated = variant === "dominated";
  // class_analytics ya ordena por retention_score ASC (peor primero).
  const sorted = [...topicMastery].sort((a, b) => {
    const av = a.retention_score ?? 0;
    const bv = b.retention_score ?? 0;
    return isDominated ? bv - av : av - bv;
  });
  const items = sorted.slice(0, limit).map((t) => ({
    label: t.topic,
    value: Math.round(t.retention_score ?? 0),
    color: COLORS[variant],
  }));

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {isDominated ? "Top temas dominados" : "Top temas críticos"}
      </div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin temas registrados.
        </div>
      ) : (
        <HorizontalBarList
          items={items}
          max={100}
          onItemClick={onTopicClick}
        />
      )}
    </div>
  );
}
