// src/components/analytics/StudentDrawer.jsx
//
// F8 Analytics Studio: quick-peek lateral de un alumno del roster, sin
// salir del Class Detail (spec §5.2 "drawer lateral"). Usa los datos que
// ClassDetail ya tiene (roster snapshot + riskInputs) — peek instantáneo,
// sin fetch. El botón "Ver perfil completo" navega al StudentProfile.
//
// Props:
//   student: row del roster snapshot ({ name, avgRetention, strongTopics,
//            weakTopics, topics: [{topic, retention_score, last_reviewed_at}] })
//            o null (drawer cerrado).
//   riskInputs: inputs para riskScore() (o null).
//   onClose: () => void
//   onOpenFull: (student) => void  — navega al perfil completo.

import { useEffect } from "react";
import { C, SH } from "../tokens";
import { riskScore } from "../../lib/analytics/risk";
import RiskBadge from "./RiskBadge";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const retCol = (v) => (v >= 70 ? C.green : v >= 40 ? C.orange : C.red);

export default function StudentDrawer({ student, riskInputs = null, onClose, onOpenFull }) {
  const lang = useLang();
  const t = useT("classDetail", lang);
  const c = useT("studioCommon", lang);
  const open = !!student;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const risk = riskInputs ? riskScore(riskInputs) : null;
  const weakTopics = [...(student.topics || [])]
    .filter((t) => t.retention_score != null)
    .sort((a, b) => a.retention_score - b.retention_score)
    .slice(0, 4);

  return (
    <>
      <div
        className="sd-drawer-backdrop"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.28)", zIndex: 60, animation: "fadeIn .15s ease-out" }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.drawerSummaryOf(student.name)}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 340,
          maxWidth: "90vw",
          background: C.bg,
          borderLeft: `1px solid ${C.border}`,
          boxShadow: SH.lg,
          zIndex: 61,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          animation: "drawerIn .22s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <style>{`
          @keyframes drawerIn { from { transform: translateX(20px); opacity: .6 } to { transform: none; opacity: 1 } }
          @media (prefers-reduced-motion: reduce) {
            aside[role=dialog] { animation: none !important }
            .sd-drawer-backdrop { animation: none !important }
          }
        `}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, flex: 1, minWidth: 0 }}>{student.name}</div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", lineHeight: 1, color: C.textSecondary }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55 }}>{c.retention}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: retCol(student.avgRetention) }}>
              {student.avgRetention}%
            </div>
          </div>
          {risk && <RiskBadge level={risk.level} score={risk.score} />}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t.weakestTopics}</div>
          {weakTopics.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.55 }}>{t.noTopicData}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {weakTopics.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{t.topic}</span>
                  <b style={{ color: retCol(Number(t.retention_score)) }}>{Math.round(t.retention_score)}%</b>
                </div>
              ))}
            </div>
          )}
        </div>

        {risk && risk.reasons.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t.riskSignals}</div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, lineHeight: 1.5, color: C.textSecondary }}>
              {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <button
          onClick={() => onOpenFull?.(student)}
          style={{
            marginTop: "auto",
            padding: "9px 14px",
            borderRadius: 8,
            border: "none",
            background: C.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.viewFullProfile}
        </button>
      </aside>
    </>
  );
}
