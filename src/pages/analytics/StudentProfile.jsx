// src/pages/analytics/StudentProfile.jsx
//
// F2 Analytics Studio: Student Profile page — la página que HOY NO existe.
// Ruta /school/student/:classId/:studentRef. Fetches via useStudentDetail.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import { useStudentDetail } from "../../hooks/useStudentDetail";
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

export default function StudentProfile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const match = /^\/school\/student\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;
  const studentRef = match ? decodeURIComponent(match[2]) : null;

  const [period, setPeriod] = useState("d90");
  const { from, to } = periodToRange(period);

  const detailQ = useStudentDetail(classId, studentRef, { from, to });

  useEffect(() => {
    if (!classId || !studentRef) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, studentRef, navigate]);

  if (!classId || !studentRef) return null;

  const d = detailQ.data;
  const loading = detailQ.isPending;
  const error = detailQ.error;

  return (
    <StudioShell
      view="student"
      title={`Estudiante: ${studentRef}`}
      period={period}
      onPeriodChange={setPeriod}
    >
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {error && (
          <div
            role="alert"
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            Error cargando el perfil: {String(error.message || error)}
          </div>
        )}

        {loading && !d ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando perfil del estudiante…</div>
        ) : (
          <>
            {/* Bloques reales se enchufan en tasks 5-8. */}
            <div data-block="StudentKpiBand" />
            <div data-block="CleoStudentStrip" />
            <div data-block="TrajectoryPanel" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div data-block="TopicBarListPanel" data-variant="student-mastery" />
              <div data-block="StudentMostFailedList" />
            </div>
            <div data-block="SessionHistoryTable" />
          </>
        )}
      </div>
    </StudioShell>
  );
}
