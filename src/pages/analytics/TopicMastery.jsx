// src/pages/analytics/TopicMastery.jsx
//
// F3 Analytics Studio: Topic Mastery page — matriz de temas + drill al
// detalle del tema (tendencia semanal + más falladas + misconceptions).

import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { StudioShell, StudioSkeleton } from "../../components/analytics";
import TopicMatrix from "../../components/analytics/TopicMatrix";
import TopicTrendPanel from "../../components/analytics/TopicTrendPanel";
import MisconceptionPanel from "../../components/analytics/MisconceptionPanel";
import TopicQuestionsList from "../../components/analytics/TopicQuestionsList";
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod } from "../../lib/analytics/benchmark";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { ROUTES, buildRoute } from "../../routes";
import { C } from "../../components/tokens";

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
  const [compareMode, setCompareMode] = useState("off");
  const { from, to } = periodToRange(period);
  const compareRange =
    compareMode === "prev" ? previousPeriod(from, to) : { from: null, to: null };

  const initialTopic = searchParams.get("topic") || null;
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);

  const classQ = useClassAnalytics(classId, { from, to });
  const topicQ = useTopicDetail(classId, selectedTopic, { from, to });
  // F4: 2nd fetch shifted to previous period. `enabled: !!classId && !!topic`
  // gating means passing null disables the query entirely when compareMode === 'off'
  // or no topic is selected.
  const compareTopicQ = useTopicDetail(
    compareMode === "prev" ? classId : null,
    compareMode === "prev" ? selectedTopic : null,
    { from: compareRange.from, to: compareRange.to },
  );

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
    <StudioShell
      view="topics"
      title="Temas"
      period={period}
      onPeriodChange={setPeriod}
      toolbarExtras={<CompareToggle value={compareMode} onChange={setCompareMode} />}
    >
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%" }}>
        {classQ.error && (
          <div role="alert" style={{ background: C.redSoft, border: `1px solid ${C.red}`, color: C.red, padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
            Error: {String(classQ.error.message || classQ.error)}
          </div>
        )}

        {loading && topics.length === 0 ? (
          <StudioSkeleton variant="topic" />
        ) : (
          <>
            <TopicMatrix
              topics={topics}
              selectedTopic={selectedTopic}
              onSelect={(t) => setSelectedTopic(t === selectedTopic ? null : t)}
            />
            {selectedTopic && (
              <>
                <TopicTrendPanel
                  topic={selectedTopic}
                  data={detail?.weekly_trend ?? []}
                  compareData={
                    compareMode === "prev"
                      ? compareTopicQ.data?.weekly_trend ?? null
                      : null
                  }
                  loading={topicQ.isPending && !detail}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MisconceptionPanel
                    question={(detail?.questions ?? [])[0]}
                    onDrillDeck={(deckId) => navigate(buildRoute.deckResults(deckId))}
                  />
                  <TopicQuestionsList
                    questions={detail?.questions ?? []}
                    onItemClick={(it) => {
                      if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </StudioShell>
  );
}
