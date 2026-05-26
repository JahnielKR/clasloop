// ─── CleoActionCard ──────────────────────────────────────────────────────────
// Inline confirmation card for an action Cleo proposed (create class / unit /
// review quiz). The teacher confirms here BEFORE anything is written — Cleo
// never acts on her own. Read-only `navigate` actions don't use this card; the
// chat runs them immediately.
//
// Self-contained status: idle → running → done | error (or canceled). On
// success it shows a short confirmation + a deep-link button to what was made.
import { useState } from "react";
import { C } from "./tokens";

const sectionLabel = (s, t) =>
  s === "warmup" ? t.sectionWarmup : s === "exit_ticket" ? t.sectionExit : t.sectionGeneral;

// Which fields to show per action, in order. Each is [label, value].
const FIELD_ROWS = {
  create_class: (a, t) => [[t.fieldName, a.name], [t.fieldGrade, a.grade], [t.fieldSubject, a.subject]],
  create_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldName, a.name]],
  generate_review_deck: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName]],
  create_deck: (a, t) => [
    [t.fieldClass, a.className],
    [t.fieldSection, sectionLabel(a.section, t)],
    [t.fieldSource, a.source === "document" ? t.sourceDocument : (a.topic || t.sourceTopic)],
    [t.fieldCount, a.numQuestions],
  ],
};
const TITLE = {
  create_class: (t) => t.createClassTitle,
  create_unit: (t) => t.createUnitTitle,
  generate_review_deck: (t) => t.reviewDeckTitle,
  create_deck: (t) => t.createDeckTitle,
};

export default function CleoActionCard({ action, t, onRun, onNavigate }) {
  const [status, setStatus] = useState("idle"); // idle | running | done | error | canceled
  const [result, setResult] = useState(null);

  const rows = (FIELD_ROWS[action.type] || (() => []))(action, t);
  const title = (TITLE[action.type] || (() => ""))(t);
  // These run an AI generation step, so they take a while — show the longer
  // "building…" message instead of the quick "working…".
  const isSlow = action.type === "generate_review_deck" || action.type === "create_deck";

  const confirm = async () => {
    setStatus("running");
    const res = await onRun(action);
    if (res?.ok) { setResult(res); setStatus("done"); }
    else setStatus("error");
  };

  const doneMsg = () => {
    const k = result?.result?.kind;
    const name = result?.result?.name || "";
    if (k === "class") return t.doneClass.replace("{name}", name);
    if (k === "unit") return t.doneUnit.replace("{name}", name);
    if (k === "review_deck") return t.doneReview;
    if (k === "deck") return t.doneDeck.replace("{name}", name).replace("{count}", String(result?.result?.count ?? ""));
    return "";
  };
  const viewLabel = () => {
    const k = result?.result?.kind;
    if (k === "class") return t.viewClass;
    if (k === "unit") return t.viewUnit;
    if (k === "review_deck") return t.viewReview;
    if (k === "deck") return t.viewDeck;
    return "";
  };

  const btn = (primary) => ({
    flex: primary ? 1 : "0 0 auto",
    padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: "pointer",
    border: primary ? "none" : `1px solid ${C.border}`,
    background: primary ? C.accent : "transparent",
    color: primary ? "#fff" : C.textMuted,
  });

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 12, background: C.bg,
      padding: 12, marginTop: 8, maxWidth: "92%",
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: 8, fontSize: 13 }}>
            <span style={{ color: C.textMuted, minWidth: 64 }}>{label}</span>
            <span style={{ color: C.text, fontWeight: 500, wordBreak: "break-word" }}>{val || "—"}</span>
          </div>
        ))}
      </div>

      {status === "idle" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={() => setStatus("canceled")}>{t.cancel}</button>
          <button style={btn(true)} onClick={confirm}>{t.confirm}</button>
        </div>
      )}

      {status === "running" && (
        <div style={{ fontSize: 12.5, color: C.textMuted }}>
          {isSlow ? t.generating : t.working}
        </div>
      )}

      {status === "done" && (
        <div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>{doneMsg()}</div>
          {result?.to && (
            <button style={btn(true)} onClick={() => onNavigate(result.to)}>{viewLabel()}</button>
          )}
        </div>
      )}

      {status === "error" && (
        <div>
          <div style={{ fontSize: 12.5, color: C.red, marginBottom: 8 }}>{t.failed}</div>
          <button style={btn(true)} onClick={confirm}>{t.confirm}</button>
        </div>
      )}

      {status === "canceled" && (
        <div style={{ fontSize: 12.5, color: C.textMuted }}>{t.canceled}</div>
      )}
    </div>
  );
}
