// src/components/analytics/PulseStrip.jsx
//
// F6 Analytics Studio: franja "Pulso de hoy" para el Overview tab del
// Director. Resumen visual del día con 4 tiles + un link a /school/live
// cuando hay sesión activa.

import { useNavigate } from "react-router-dom";
import { useTodayPulse } from "../../hooks/useTodayPulse";
import { computeTodayPulse } from "../../lib/analytics/pulse-of-today";
import LiveTile from "./LiveTile";
import { buildRoute } from "../../routes";
import { C } from "../tokens";

const ACCENT = C.purple;

export default function PulseStrip() {
  const navigate = useNavigate();
  const { data, isPending } = useTodayPulse();

  const pulse = data
    ? computeTodayPulse({
        sessions: data.sessions,
        responses: data.responses,
        classes: data.classes,
      })
    : null;

  if (isPending && !pulse) {
    return (
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          opacity: 0.55,
          fontSize: 13,
        }}
      >
        Cargando el pulso de hoy…
      </div>
    );
  }

  if (!pulse) return null;

  const tiles = [
    {
      label: "Sesiones de hoy",
      value: pulse.completed_sessions + pulse.active_sessions,
      unit: pulse.has_active ? "activa" : "",
      tone: pulse.has_active ? "live" : "default",
    },
    {
      label: "% correcto hoy",
      value: pulse.pct_correct_today != null ? pulse.pct_correct_today : "—",
      unit: pulse.pct_correct_today != null ? "%" : "",
      tone:
        pulse.pct_correct_today == null
          ? "default"
          : pulse.pct_correct_today >= 70
            ? "good"
            : pulse.pct_correct_today >= 40
              ? "warn"
              : "bad",
    },
    {
      label: "Top clase",
      value: pulse.top_class?.name || "—",
      unit: pulse.top_class ? `${pulse.top_class.response_count} resp.` : "",
    },
    {
      label: "Top alumno",
      value: pulse.top_student?.name || "—",
      unit: pulse.top_student ? `${pulse.top_student.pct_correct}%` : "",
      tone: pulse.top_student ? "good" : "default",
    },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: ACCENT,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Pulso de hoy
        </div>
        {pulse.has_active && (
          <button
            onClick={() => navigate(buildRoute.analyticsLive())}
            style={{
              border: `1px solid ${C.purple}`,
              background: C.purpleSoft,
              color: C.purple,
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.purple,
                display: "inline-block",
              }}
            />
            En vivo
          </button>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {tiles.map((t, i) => (
          <LiveTile
            key={i}
            label={t.label}
            value={t.value}
            unit={t.unit}
            tone={t.tone}
            live={pulse.has_active && i === 0}
            onClick={
              i === 0 && pulse.has_active
                ? () => navigate(buildRoute.analyticsLive())
                : null
            }
          />
        ))}
      </div>
    </div>
  );
}
