// src/components/analytics/RosterTable.jsx
//
// F1 Analytics Studio: roster del Class Detail con sparklines + badges.
// F5: columna de riesgo (RiskBadge).
// F8: headers ordenables (table-sort), filtro por nombre, filas con
// keyboard nav (tabIndex + Enter/Space → drill).
// i18n: headers/estados via useT("studioCommon").

import { useMemo, useState } from "react";
// Import explícito: barrel `../../lib/analytics` choca con
// `src/lib/analytics.ts` (PostHog wrapper). Ver KpiBand.jsx.
import { formatRelativeDay } from "../../lib/analytics/formatters";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import RiskBadge from "./RiskBadge";
import { riskScore } from "../../lib/analytics/risk";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

function badgeStyle(tone) {
  return {
    padding: "1px 7px",
    borderRadius: 10,
    fontSize: 11,
    background:
      tone === "good" ? C.greenSoft : tone === "warn" ? C.orangeSoft : tone === "bad" ? C.redSoft : C.bgSoft,
    color:
      tone === "good" ? C.green : tone === "warn" ? C.orange : tone === "bad" ? C.red : C.textSecondary,
  };
}

// Returns { tone, key } — the key resolves to a studioCommon status label.
function statusFor(s) {
  if (s.weakTopics > s.strongTopics) return { tone: "bad", key: "statusRisk" };
  if (s.strongTopics > s.weakTopics) return { tone: "good", key: "statusRising" };
  return { tone: "warn", key: "statusStable" };
}

function lastReviewedDate(s) {
  let latest = null;
  for (const t of s.topics || []) {
    if (!t.last_reviewed_at) continue;
    const d = new Date(t.last_reviewed_at);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

const COLUMNS = [
  { key: "name", labelKey: "colStudent", accessor: (r) => r.name },
  { key: "retention", labelKey: "colRetention", accessor: (r) => r.avgRetention },
  { key: "risk", labelKey: "colRisk", accessor: (r) => r._riskScore },
  { key: "lastActivity", labelKey: "colLastActivity", accessor: (r) => r._lastTs },
  { key: "status", labelKey: "colStatus", accessor: (r) => r._statusKey },
];

export default function RosterTable({ students = [], riskInputsByName = {}, onRowClick }) {
  const t = useT("studioCommon", useLang());
  const [sortKey, setSortKey] = useState("retention");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("");

  const decorated = useMemo(() => {
    return students.map((s) => {
      const inputs = riskInputsByName[s.name];
      const risk = inputs ? riskScore(inputs) : null;
      const lastDate = lastReviewedDate(s);
      return {
        ...s,
        _risk: risk,
        _riskScore: risk ? risk.score : null,
        _lastTs: lastDate ? lastDate.getTime() : null,
        _lastDate: lastDate,
        _statusKey: statusFor(s).key,
      };
    });
  }, [students, riskInputsByName]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return decorated;
    return decorated.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [decorated, filter]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return sortRows(filtered, col.accessor, sortDir);
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) {
        setSortKey("retention");
        setSortDir("desc");
      } else {
        setSortDir(nd);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const arrow = (key) => {
    if (key !== sortKey || !sortDir) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.roster}</div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.filterByName}
          aria-label={t.filterByName}
          style={{
            marginLeft: "auto",
            padding: "4px 9px",
            fontSize: 12,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            width: 170,
          }}
        />
      </div>
      {students.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>{t.noStudents}</div>
      ) : sorted.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>{t.noMatch(filter)}</div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {/* Ola 6: scroll wrapper so the 5-col roster scrolls instead of
              clipping on phones; minWidth keeps the columns legible. */}
          <table style={{ width: "100%", minWidth: 520, fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  aria-sort={c.key === sortKey ? (sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none") : "none"}
                  style={{ padding: "5px 0", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  title={t.sortTitle}
                >
                  {t[c.labelKey]}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const status = statusFor(s);
              const clickable = !!onRowClick;
              const drill = clickable ? () => onRowClick(s) : undefined;
              return (
                <tr
                  key={s.name}
                  onClick={drill}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            drill();
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: `1px solid ${C.bgSoft}`, cursor: clickable ? "pointer" : "default" }}
                >
                  <td style={{ padding: "7px 0" }}>{s.name}</td>
                  <td>
                    <div style={{ display: "inline-block", width: 80, marginRight: 6 }}>
                      <div
                        style={{
                          background: s.avgRetention >= 70 ? C.greenSoft : s.avgRetention >= 40 ? C.orangeSoft : C.redSoft,
                          height: 6,
                          width: `${Math.min(100, s.avgRetention)}%`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {s.avgRetention}%
                  </td>
                  <td>
                    {s._risk ? (
                      <RiskBadge level={s._risk.level} score={s._risk.score} compact />
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td>{formatRelativeDay(s._lastDate)}</td>
                  <td>
                    <span style={badgeStyle(status.tone)}>{t[status.key]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
