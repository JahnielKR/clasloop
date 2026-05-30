// src/pages/analytics/Reports.jsx
//
// F7 Analytics Studio: vista /school/reports. Composer (crear reporte) +
// lista de reportes guardados (exportar / eliminar). El export re-fetcha
// class_analytics fresco y arma el model con las secciones guardadas.

import { useState } from "react";
import { StudioShell } from "../../components/analytics";
import Skeleton from "../../components/ui/Skeleton";
import ReportComposer from "../../components/analytics/ReportComposer";
import ReportList from "../../components/analytics/ReportList";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import {
  useReports,
  useCreateReport,
  useDeleteReport,
} from "../../hooks/useReports";
import { buildClassReportModel } from "../../lib/analytics/report-model";
import { supabase } from "../../lib/supabase";
import { C } from "../../components/tokens";

const PERIOD_LABEL = { d7: "7 días", d30: "30 días", d90: "90 días" };

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  const days = period === "d7" ? 7 : period === "d90" ? 90 : 30;
  return {
    from: new Date(now.getTime() - ms(days)).toISOString(),
    to: now.toISOString(),
  };
}

export default function Reports() {
  const overviewQ = useAnalyticsOverview();
  const classes = overviewQ.data ?? [];
  const reportsQ = useReports();
  const createM = useCreateReport();
  const deleteM = useDeleteReport();
  const [deletingId, setDeletingId] = useState(null);

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
      className: m.className || "Clase",
      period: m.period || report.period || "30 días",
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
    <StudioShell view="reports" title="Reportes">
      <div
        style={{
          padding: 18,
          background: C.bgSoft,
          minHeight: "100%",
          display: "grid",
          // Responsive without media queries: two columns when there's room,
          // collapses to one on phones (min(100%, 300px) prevents overflow
          // below 300px). Ola 6 — was a fixed "320px 1fr" that forced
          // horizontal scroll on mobile.
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <ReportComposer
          classes={classes}
          onSave={handleSave}
          saving={createM.isPending}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Reportes guardados
          </div>
          {reportsQ.isPending ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton height={56} radius={8} />
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
      </div>
    </StudioShell>
  );
}
