// src/pages/analytics/TopicMastery.jsx
//
// F3 Analytics Studio: Topic Mastery page — matriz de temas + drill al
// detalle del tema (tendencia semanal + más falladas + misconceptions).

import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import TopicMatrix from "../../components/analytics/TopicMatrix";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { ROUTES } from "../../routes";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  switch (period) {
    case "d7":
      return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
    case "d30":
      return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
    case "custom":
      return { from: null, to: null };
    case "d90":
    default:
      return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
  }
}

export default function TopicMastery() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const match = /^\/school\/topics\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;

  const [period, setPeriod] = useState("d90");
  const { from, to } = periodToRange(period);

  const initialTopic = searchParams.get("topic") || null;
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);

  const classQ = useClassAnalytics(classId, { from, to });
  const topicQ = useTopicDetail(classId, selectedTopic, { from, to });

  useEffect(() => {
    if (!classId) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, navigate]);

  // Sync selectedTopic <-> URL (?topic=...) so deep links work.
  useEffect(() => {
    const current = searchParams.get("topic") || null;
    if (selectedTopic !== current) {
      const next = new URLSearchParams(searchParams);
      if (selectedTopic) next.set("topic", selectedTopic);
      else next.delete("topic");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);

  if (!classId) return null;

  const topics = classQ.data?.topic_mastery ?? [];
  const detail = topicQ.data;
  const loading = classQ.isPending;

  return (
    <StudioShell view="topics" title="Temas" period={period} onPeriodChange={setPeriod}>
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {classQ.error && (
          <div role="alert" style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
            Error: {String(classQ.error.message || classQ.error)}
          </div>
        )}

        {loading && topics.length === 0 ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando temas…</div>
        ) : (
          <>
            <TopicMatrix
              topics={topics}
              selectedTopic={selectedTopic}
              onSelect={(t) => setSelectedTopic(t === selectedTopic ? null : t)}
            />
            {selectedTopic && (
              <>
                <div data-block="TopicTrendPanel" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div data-block="MisconceptionPanel" />
                  <div data-block="QuestionsList" />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </StudioShell>
  );
}
