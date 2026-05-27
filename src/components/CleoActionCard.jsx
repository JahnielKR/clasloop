// ─── CleoActionCard ──────────────────────────────────────────────────────────
// Inline confirmation card for a SINGLE action Cleo proposed (create class /
// unit / deck / review quiz / schedule). The teacher confirms here BEFORE
// anything is written — Cleo never acts on her own. Read-only `navigate`
// actions don't use this card, and multi-step plans (or a bulk create_units)
// use CleoPlanCard instead.
//
// create_deck is special: instead of just a confirm button it shows the deck
// options form (DeckOptionsForm — shared with CleoPlanCard) so the teacher sets
// the deck up by tapping options. Other actions stay a simple details + Confirm.
//
// The action's lifecycle (idle → running → done | error | canceled) and its
// result are CONTROLLED by the parent (CleoChat stores them on the chat
// message). That's deliberate: the chat panel unmounts when closed, so keeping
// status here would reset to "idle" on reopen and let the teacher run a
// finished action again (e.g. create a second deck).
import { useState } from "react";
import { C } from "./tokens";
import { buildRoute } from "../routes";
import DeckOptionsForm from "./DeckOptionsForm";

// Read-only detail rows shown at the top of the card. Each is [label, value].
const DETAIL_ROWS = {
  create_class: (a, t) => [[t.fieldName, a.name], [t.fieldGrade, a.grade], [t.fieldSubject, a.subject]],
  create_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldName, a.name]],
  generate_review_deck: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName]],
  // create_deck: class + what it's built from. Type/name/language/count/images
  // are all editable in the form below, so they're not repeated here.
  create_deck: (a, t, fileName) => [
    [t.fieldClass, a.className],
    [t.fieldSource, a.source === "document" ? (fileName || t.sourceDocument) : (a.topic || t.sourceTopic)],
  ],
  schedule_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName]],
};

const TITLE = {
  create_class: (t) => t.createClassTitle,
  create_unit: (t) => t.createUnitTitle,
  generate_review_deck: (t) => t.reviewDeckTitle,
  create_deck: (t) => t.createDeckTitle,
  schedule_unit: (t) => t.scheduleTitle,
};

export default function CleoActionCard({
  action, t, onRun, onCancel, onNavigate,
  lang = "en", fileName = "",
  status = "idle", result = null,
}) {
  const isDeck = action.type === "create_deck";
  const isSchedule = action.type === "schedule_unit";

  // schedule_unit doesn't write — it opens the unit's planner where the teacher
  // sets each day's date (dates map to their real class days, so we never pick
  // them). The card just explains + offers this "go" button.
  const scheduleTo = isSchedule
    ? buildRoute.classDetail(action.classId) + (action.unitId ? `?unit=${encodeURIComponent(action.unitId)}` : "")
    : null;

  // For a deck, DeckOptionsForm reports the (edited) payload here; the parent
  // runs whatever's current when the teacher taps Create.
  const [deckPayload, setDeckPayload] = useState(null);
  const runDeck = () => onRun(deckPayload || action);

  const rows = (DETAIL_ROWS[action.type] || (() => []))(action, t, fileName);
  const heading = (TITLE[action.type] || (() => ""))(t);
  // These run an AI generation step, so they take a while.
  const isSlow = action.type === "generate_review_deck" || isDeck;

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
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{heading}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: 8, fontSize: 13 }}>
            <span style={{ color: C.textMuted, minWidth: 64 }}>{label}</span>
            <span style={{ color: C.text, fontWeight: 500, wordBreak: "break-word" }}>{val || "—"}</span>
          </div>
        ))}
      </div>

      {/* create_deck: the editable mini-form */}
      {status === "idle" && isDeck && (
        <div>
          <DeckOptionsForm action={action} t={t} lang={lang} fileName={fileName} onChange={setDeckPayload} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
            <button style={btn(true)} onClick={runDeck}>{t.createCta}</button>
          </div>
        </div>
      )}

      {/* schedule_unit: a "go to the planner" CTA (no write — the teacher sets
          the dates there, since a unit's days map to their real class days) */}
      {status === "idle" && isSchedule && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
          <button style={btn(true)} onClick={() => onNavigate(scheduleTo)}>{t.goToPlanner}</button>
        </div>
      )}

      {/* other actions: a plain confirm */}
      {status === "idle" && !isDeck && !isSchedule && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
          <button style={btn(true)} onClick={() => onRun(action)}>{t.confirm}</button>
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
          <button style={btn(true)} onClick={isDeck ? runDeck : () => onRun(action)}>{isDeck ? t.createCta : t.confirm}</button>
        </div>
      )}

      {status === "canceled" && (
        <div style={{ fontSize: 12.5, color: C.textMuted }}>{t.canceled}</div>
      )}
    </div>
  );
}
