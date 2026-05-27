// ─── CleoPlanCard ────────────────────────────────────────────────────────────
// One card for a PLAN: the ordered list of things Cleo will do from a single
// request ("make a report for X, build a deck from this PDF, and add unit 2",
// or "create units 1 to 8"). The teacher confirms ONCE and the writes run in
// order; this card just reflects per-step progress.
//
// Used for any multi-step plan AND for a single bulk create_units (which needs
// the name list + rename "quiz"). A single ordinary action still uses the
// simpler CleoActionCard.
//
// Two kinds of step:
//   • WRITE steps (create_class/unit/units/deck/review) run via
//     executeCleoAction when the teacher confirms.
//   • LINK steps (navigate incl. a class report, launch_session, schedule_unit)
//     never auto-run mid-plan — they show a button the teacher taps to go
//     there (which closes the panel), so a chain never yanks them away.
//
// Lifecycle (planStatus + per-step stepStatuses/results) is CONTROLLED by the
// parent (CleoChat stores it on the chat message), so closing/reopening the
// panel never re-runs a finished plan.
import { useState } from "react";
import { C } from "./tokens";
import { buildRoute } from "../routes";
import { routeForNavigate } from "../lib/cleo-actions";
import DeckOptionsForm from "./DeckOptionsForm";

const WRITE_TYPES = new Set([
  "create_class", "create_unit", "create_units", "create_deck", "generate_review_deck",
]);
const isWrite = (step) => WRITE_TYPES.has(step?.type);

// Where a read-only "movement" step points. Mirrors the executors that don't
// write (navigate / launch_session / schedule_unit).
function linkFor(step) {
  if (step.type === "navigate") return routeForNavigate(step);
  if (step.type === "launch_session") return step.deckId ? buildRoute.sessionsOptions(step.deckId) : null;
  if (step.type === "schedule_unit") {
    return buildRoute.classDetail(step.classId) + (step.unitId ? `?unit=${encodeURIComponent(step.unitId)}` : "");
  }
  return null;
}

function stepSummary(step, tp) {
  switch (step.type) {
    case "create_class": return tp.sumCreateClass.replace("{name}", step.name || "");
    case "create_unit": return tp.sumCreateUnit.replace("{name}", step.name || "").replace("{class}", step.className || "");
    case "create_units": return tp.sumCreateUnits.replace("{n}", String(step.names?.length || 0)).replace("{class}", step.className || "");
    case "create_deck": return tp.sumCreateDeck.replace("{class}", step.className || "");
    case "generate_review_deck": return tp.sumReview.replace("{unit}", step.unitName || "").replace("{class}", step.className || "");
    case "navigate": return step.target === "class_report" ? tp.sumReport.replace("{class}", step.className || "") : tp.sumOpen;
    case "launch_session": return tp.sumLaunch.replace("{deck}", step.deckTitle || "");
    case "schedule_unit": return tp.sumSchedule.replace("{unit}", step.unitName || "");
    default: return step.type;
  }
}

function linkLabel(step, tp) {
  if (step.type === "navigate") return step.target === "class_report" ? tp.viewReport : tp.open;
  if (step.type === "launch_session") return tp.launch;
  if (step.type === "schedule_unit") return tp.openPlanner;
  return tp.open;
}

export default function CleoPlanCard({
  steps = [], t, lang = "en", file = null,
  planStatus = "idle", stepStatuses = [], results = [],
  onRunPlan, onCancel, onNavigate,
}) {
  const tp = t.plan;
  const idle = planStatus === "idle";

  // Editable bits (only matter before the first run): the per-unit names for a
  // create_units step (the "quiz"), the deck options for a create_deck step,
  // and which inline editors are expanded.
  const [unitNames, setUnitNames] = useState(() => {
    const m = {};
    steps.forEach((s, i) => { if (s.type === "create_units") m[i] = [...(s.names || [])]; });
    return m;
  });
  const [deckPayloads, setDeckPayloads] = useState({});
  const [openEditor, setOpenEditor] = useState({});

  const toggleEditor = (i) => setOpenEditor((o) => ({ ...o, [i]: !o[i] }));
  const setName = (i, k, val) =>
    setUnitNames((prev) => {
      const arr = [...(prev[i] || [])];
      arr[k] = val;
      return { ...prev, [i]: arr };
    });

  // Merge the teacher's edits back into the steps before handing them up to run.
  const buildFinal = () =>
    steps.map((s, i) => {
      if (s.type === "create_units") {
        const names = (unitNames[i] || s.names || []).map((n) => String(n || "").trim()).filter(Boolean);
        return { ...s, names };
      }
      if (s.type === "create_deck") return deckPayloads[i] || s;
      return s;
    });

  const writeIdx = steps.map((_, i) => i).filter((i) => isWrite(steps[i]));
  const total = writeIdx.length;
  const doneCount = writeIdx.filter((i) => stepStatuses[i] === "done").length;
  const failCount = writeIdx.filter((i) => stepStatuses[i] === "error").length;

  const btn = (primary) => ({
    flex: primary ? 1 : "0 0 auto",
    padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: "pointer",
    border: primary ? "none" : `1px solid ${C.border}`,
    background: primary ? C.accent : "transparent",
    color: primary ? "#fff" : C.textMuted,
  });
  const linkBtn = {
    padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${C.border}`, background: "transparent", color: C.accent,
  };
  const nameInput = {
    width: "100%", padding: "6px 9px", borderRadius: 8, marginBottom: 6, boxSizing: "border-box",
    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
    fontSize: 12.5, fontFamily: "'Outfit',sans-serif", outline: "none",
  };

  // Right-side status glyph for a write step once the plan is running/done.
  const statusGlyph = (i) => {
    const st = stepStatuses[i];
    if (st === "running") return <span style={{ fontSize: 12, color: C.textMuted }}>{tp.working}</span>;
    if (st === "done") return <span style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>✓</span>;
    if (st === "error") return <span style={{ fontSize: 14, color: C.red, fontWeight: 700 }}>✗</span>;
    return <span style={{ fontSize: 12, color: C.textMuted }}>•</span>;
  };

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 12, background: C.bg,
      padding: 12, marginTop: 8, maxWidth: "92%",
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 10 }}>{tp.heading}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => {
          const link = !isWrite(step);
          const to = link ? linkFor(step) : null;
          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <span style={{
                  flexShrink: 0, width: 20, height: 20, borderRadius: 6, marginTop: 1,
                  background: C.bgSoft, color: C.textMuted, fontSize: 11.5, fontWeight: 700,
                  display: "grid", placeItems: "center",
                }}>{i + 1}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{stepSummary(step, tp)}</div>

                  {/* create_units: names preview + the rename "quiz" */}
                  {step.type === "create_units" && (
                    <div style={{ marginTop: 4 }}>
                      {idle && !openEditor[i] && (
                        <button
                          onClick={() => toggleEditor(i)}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 600 }}
                        >{tp.editNames}</button>
                      )}
                      {idle && openEditor[i] && (
                        <div style={{ marginTop: 4 }}>
                          {(unitNames[i] || []).map((nm, k) => (
                            <input key={k} value={nm} onChange={(e) => setName(i, k, e.target.value)} maxLength={80} style={nameInput} />
                          ))}
                        </div>
                      )}
                      {!idle && (
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                          {(unitNames[i] || step.names || []).join(" · ")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* create_deck: collapsed by default, "Adjust" reveals the form */}
                  {step.type === "create_deck" && idle && (
                    <div style={{ marginTop: 4 }}>
                      {!openEditor[i] ? (
                        <button
                          onClick={() => toggleEditor(i)}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 600 }}
                        >{tp.adjust}</button>
                      ) : (
                        <div style={{ marginTop: 6 }}>
                          <DeckOptionsForm
                            action={step}
                            t={t.action}
                            lang={lang}
                            fileName={step.source === "document" ? (file?.name || "") : ""}
                            onChange={(p) => setDeckPayloads((d) => ({ ...d, [i]: p }))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* right rail: link button (movement steps) or status (writes) */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  {link && to && planStatus !== "running" && (
                    <button style={linkBtn} onClick={() => onNavigate(to)}>{linkLabel(step, tp)}</button>
                  )}
                  {!link && !idle && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {statusGlyph(i)}
                      {stepStatuses[i] === "done" && results[i]?.to && (
                        <button style={linkBtn} onClick={() => onNavigate(results[i].to)}>{tp.view}</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div style={{ marginTop: 12 }}>
        {idle && (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(false)} onClick={onCancel}>{tp.cancel}</button>
            <button style={btn(true)} onClick={() => onRunPlan(buildFinal())}>{tp.confirm}</button>
          </div>
        )}
        {planStatus === "running" && (
          <div style={{ fontSize: 12.5, color: C.textMuted }}>{tp.runningNote}</div>
        )}
        {planStatus === "done" && (
          <div>
            <div style={{ fontSize: 13, color: failCount ? C.text : C.green, fontWeight: 600, marginBottom: failCount ? 8 : 0 }}>
              {tp.summary.replace("{done}", String(doneCount)).replace("{total}", String(total))}
            </div>
            {failCount > 0 && (
              <button style={btn(true)} onClick={() => onRunPlan(buildFinal())}>{tp.retry}</button>
            )}
          </div>
        )}
        {planStatus === "canceled" && (
          <div style={{ fontSize: 12.5, color: C.textMuted }}>{tp.canceled}</div>
        )}
      </div>
    </div>
  );
}
