// src/hooks/useTopicDetail.js
//
// F3 Analytics Studio: payload del Topic Mastery view (un tema concreto).
// Una llamada → KPIs + tendencia semanal + top-15 preguntas falladas con
// answer_distribution + el question jsonb del deck (para MisconceptionPanel).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const topicDetailKey = (classId, topic, from, to) =>
  ["analytics", "topic", classId, topic, from || null, to || null];

async function fetchTopicDetail(classId, topic, from, to) {
  const { data, error } = await supabase.rpc("topic_detail", {
    p_class_id: classId,
    p_topic: topic,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data;
}

export function useTopicDetail(classId, topic, { from, to } = {}) {
  return useQuery({
    queryKey: topicDetailKey(classId, topic, from, to),
    enabled: !!classId && !!topic,
    queryFn: () => fetchTopicDetail(classId, topic, from, to),
  });
}
