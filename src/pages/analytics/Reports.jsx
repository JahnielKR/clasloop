// src/pages/analytics/Reports.jsx
//
// Ola B: /school/reports. Composer (left) + live preview (right) sharing a
// lifted draft; saved-reports list full-width below. The saved `model` is the
// recipe (incl. ordered sections); export re-fetches fresh data and builds the
// model — buildClassReportModel renders sections in array order.

import { useState } from "react";
import { StudioShell } from "../../components/analytics";
import Skeleton from "../../components/ui/Skeleton";
import ReportComposer from "../../components/analytics/ReportComposer";
import ReportPreview from "../../components/analytics/ReportPreview";
import ReportList from "../../components/analytics/ReportList";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useReports, useCreateReport, useDeleteReport } from "../../hooks/useReports";
import { buildClassReportModel } from "../../lib/analytics/report-model";
import { supabase } from "../../lib/supabase";
import { C } from "../../components/tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  const days = period === "d7" ? 7 : period === "d90" ? 90 : 30;
  return { from: new Date(now.getTime() - ms(days)).toISOString(), to: now.toISOString() };
}

export default function Reports() {
  const lang = useLang();
  const t = useT("reports", lang);
  const PERIOD_LABEL = { d7: t.periodD7, d30: t.periodD30, d90: t.periodD90 };
  const overviewQ = useAnalyticsOverview();
  const classes = overviewQ.data ?? [];
  const reportsQ = useReports();
  const createM = useCreateReport();
  const deleteM = useDeleteReport();
  const [deletingId, setDeletingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const draftClassName =
    classes.find((c) => c.class_id === draft?.classId)?.class_name || "";

  function handleSave({ name, classId, period, sections }) {
    const cls = classes.find((c) => c.class_id === classId);
    createM.mutate({
      name,
      scope: "class",
      class_id: classId,
      period: PERIOD_LABEL[period] || period,
      model: {
        scope: "class",
        period: PERIOD_LABEL[period] || period,
        periodId: period,
        className: cls?.class_name || "",
        sections,
      },
    });
  }

  // Re-fetch fresh class_analytics + build the model from the saved recipe.
  async function buildModelForReport(report) {
    const m = report.model || {};
    const { from, to } = periodToRange(m.periodId || "d30");
    const { data } = await supabase.rpc("class_analytics", {
      p_class_id: report.class_id,
      p_from: from,
      p_to: to,
    });
    return buildClassReportModel({
      className: m.className || "",
      period: m.period || report.period || "",
      lang,
      classAnalytics: data || {},
      sections: m.sections || ["kpis", "topics", "most_missed"],
    });
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteM.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <StudioShell view="reports" title={t.title}>
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%" }}>
        {/* Composer + live preview share the lifted draft. Responsive without
            media queries (Ola 6 pattern): two columns when there's room, one on
            phones. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 16,
            alignItems: "start",
            marginBottom: 16,
          }}
        >
          <ReportComposer
            classes={classes}
            onSave={handleSave}
            saving={createM.isPending}
            onDraftChange={setDraft}
          />
          <ReportPreview draft={draft} className={draftClassName} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.saved}</div>
        {reportsQ.isPending ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={56} radius={8} />
            <Skeleton height={56} radius={8} />
          </div>
        ) : (
          <ReportList
            reports={reportsQ.data ?? []}
            onExportModel={buildModelForReport}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}
      </div>
    </StudioShell>
  );
}
