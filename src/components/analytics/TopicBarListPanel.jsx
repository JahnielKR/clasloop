// src/components/analytics/TopicBarListPanel.jsx
//
// F1 Analytics Studio: panel con Top-N temas (dominados o críticos).
// F8: el panel "crítico" maneja el crossfilter — click en un tema lo
// selecciona (resalta sus preguntas en MostMissedList) y resalta la barra.

import { HorizontalBarList } from "../charts";
import { useCrossfilter } from "../../hooks/useCrossfilter";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const COLORS = {
  dominated: C.greenSoft,
  critical: C.redSoft,
};

export default function TopicBarListPanel({
  variant = "dominated",
  topicMastery = [],
  limit = 5,
  onTopicClick,
}) {
  const t = useT("classDetail", useLang());
  const { selectedTopic, toggleTopic } = useCrossfilter();
  const isDominated = variant === "dominated";
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

  const crossfilterActive = variant === "critical";

  function handleItemClick(item) {
    if (crossfilterActive) toggleTopic(item.label);
    onTopicClick?.(item);
  }

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {isDominated ? t.topDominated : t.topCritical}
      </div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>{t.noTopics}</div>
      ) : (
        <HorizontalBarList
          items={items}
          max={100}
          onItemClick={(onTopicClick || crossfilterActive) ? handleItemClick : undefined}
          activeLabel={crossfilterActive ? selectedTopic : null}
          titleFormatter={(it) =>
            crossfilterActive ? t.topicTooltipHighlight(it.label, it.value) : t.topicTooltipView(it.label, it.value)
          }
        />
      )}
    </div>
  );
}
