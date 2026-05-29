// ─── CleoActionCard ──────────────────────────────────────────────────────────
// Inline confirmation card for a SINGLE action Cleo proposed (create / rename /
// move / delete a class, unit, or deck; schedule). The teacher confirms here
// BEFORE anything is written — Cleo never acts on her own. Read-only `navigate`
// actions don't use this card, and multi-step plans (or a bulk create_units)
// use CleoPlanCard instead.
//
// create_deck shows the shared DeckOptionsForm. Destructive actions (delete_*)
// render a red "Delete" with an "undo isn't possible" note; delete_class also
// makes the teacher TYPE the class name to confirm. Everything else is a plain
// details + Confirm.
//
// Lifecycle (idle → running → done | error | canceled) + result are CONTROLLED
// by the parent (CleoChat stores them on the chat message), so closing/reopening
// the panel never re-runs a finished action.
import { useState } from "react";
import { C, withAlpha } from "./tokens";
import { buildRoute } from "../routes";
import DeckOptionsForm from "./DeckOptionsForm";

// True when the typed value confirms a class delete: it must equal the class
// name OR the localized "delete" keyword (case-insensitive).
export function confirmMatches(typed, confirmName, keyword) {
  const v = (typed || "").trim().toLowerCase();
  if (!v) return false;
  return v === (confirmName || "").trim().toLowerCase() || v === (keyword || "").trim().toLowerCase();
}

// Read-only detail rows shown at the top of the card. Each is [label, value].
const DETAIL_ROWS = {
  create_class: (a, t) => [[t.fieldName, a.name], [t.fieldGrade, a.grade], [t.fieldSubject, a.subject]],
  create_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldName, a.name]],
  generate_review_deck: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName]],
  create_deck: (a, t, fileName) => [
    [t.fieldClass, a.className],
    [t.fieldSource, a.source === "document" ? (fileName || t.sourceDocument) : (a.topic || t.sourceTopic)],
  ],
  schedule_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName]],
  rename_class: (a, t) => [[t.fieldClass, a.className], [t.fieldNewName, a.newName]],
  rename_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName], [t.fieldNewName, a.newName]],
  rename_deck: (a, t) => [[t.fieldDeck, a.deckTitle], [t.fieldNewName, a.newName]],
  move_deck: (a, t) => [[t.fieldDeck, a.deckTitle], [t.fieldTo, a.toUnitName || t.classLevel]],
  delete_deck: (a, t) => [[t.fieldDeck, a.deckTitle]],
  delete_unit: (a, t) => [[t.fieldClass, a.className], [t.fieldUnit, a.unitName]],
  delete_class: (a, t) => [[t.fieldClass, a.className]],
};

const TITLE = {
  create_class: (t) => t.createClassTitle,
  create_unit: (t) => t.createUnitTitle,
  generate_review_deck: (t) => t.reviewDeckTitle,
  create_deck: (t) => t.createDeckTitle,
  schedule_unit: (t) => t.scheduleTitle,
  rename_class: (t) => t.renameClassTitle,
  rename_unit: (t) => t.renameUnitTitle,
  rename_deck: (t) => t.renameDeckTitle,
  move_deck: (t) => t.moveDeckTitle,
  delete_deck: (t) => t.deleteDeckTitle,
  delete_unit: (t) => t.deleteUnitTitle,
  delete_class: (t) => t.deleteClassTitle,
};

export default function CleoActionCard({
  action, t, onRun, onCancel, onNavigate,
  lang = "en", fileName = "",
  status = "idle", result = null,
}) {
  const isDeck = action.type === "create_deck";
  const isSchedule = action.type === "schedule_unit";
  const isClassDelete = action.type === "delete_class";
  const isDestructive = !!action.destructive;

  const scheduleTo = isSchedule
    ? buildRoute.classDetail(action.classId) + (action.unitId ? `?unit=${encodeURIComponent(action.unitId)}` : "")
    : null;

  // create_deck: the shared form reports its (edited) payload here.
  const [deckPayload, setDeckPayload] = useState(null);
  const runDeck = () => onRun(deckPayload || action);

  // delete_class: the teacher must type the class name (or the delete keyword).
  const [typed, setTyped] = useState("");
  const typedOk = !isClassDelete || confirmMatches(typed, action.confirmName, t.deleteKeyword);

  const rows = (DETAIL_ROWS[action.type] || (() => []))(action, t, fileName);
  const heading = (TITLE[action.type] || (() => ""))(t);
  const isSlow = action.type === "generate_review_deck" || isDeck;

  const doneMsg = () => {
    const k = result?.result?.kind;
    const name = result?.result?.name || "";
    switch (k) {
      case "class": return t.doneClass.replace("{name}", name);
      case "unit": return t.doneUnit.replace("{name}", name);
      case "review_deck": return t.doneReview;
      case "deck": return t.doneDeck.replace("{name}", name).replace("{count}", String(result?.result?.count ?? ""));
      case "class_renamed":
      case "unit_renamed":
      case "deck_renamed": return t.doneRenamed.replace("{name}", name);
      case "deck_moved":
        return (result?.result?.unitName ? t.doneMoved : t.doneMovedToClass)
          .replace("{name}", name).replace("{unit}", result?.result?.unitName || "");
      case "deck_deleted":
      case "unit_deleted":
      case "class_deleted": return t.doneDeleted.replace("{name}", name);
      default: return "";
    }
  };
  const viewLabel = () => {
    const k = result?.result?.kind;
    if (k === "class" || k === "class_renamed") return t.viewClass;
    if (k === "unit" || k === "unit_renamed" || k === "unit_deleted") return t.viewUnit;
    if (k === "review_deck") return t.viewReview;
    if (k === "deck" || k === "deck_renamed" || k === "deck_moved") return t.viewDeck;
    if (k === "class_deleted") return t.viewClasses;
    return t.viewClass;
  };

  const btn = (primary, danger) => ({
    flex: primary ? 1 : "0 0 auto",
    padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: "pointer",
    border: primary ? "none" : `1px solid ${C.border}`,
    background: primary ? (danger ? C.red : C.accent) : "transparent",
    color: primary ? "#fff" : C.textMuted,
    opacity: primary && danger && !typedOk ? 0.5 : 1,
  });

  // The destructive warning line (delete_class spells out what it takes).
  const warnText = isClassDelete
    ? t.deleteClassWarn
        .replace("{students}", String(action.studentCount ?? 0))
        .replace("{decks}", String(action.deckCount ?? 0))
    : t.deleteWarn;

  return (
    <div style={{
      border: `1px solid ${isDestructive ? withAlpha(C.red, "55") : C.border}`, borderRadius: 12, background: C.bg,
      padding: 12, marginTop: 8, maxWidth: "92%",
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: isDestructive ? C.red : C.text, marginBottom: 8 }}>{heading}</div>

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

      {/* schedule_unit: a "go to the planner" CTA (no write) */}
      {status === "idle" && isSchedule && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
          <button style={btn(true)} onClick={() => onNavigate(scheduleTo)}>{t.goToPlanner}</button>
        </div>
      )}

      {/* destructive: a warning + red Delete; delete_class also types-to-confirm */}
      {status === "idle" && isDestructive && (
        <div>
          <p style={{ fontSize: 12, color: C.red, margin: "0 0 10px", lineHeight: 1.45 }}>{warnText}</p>
          {isClassDelete && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, margin: "0 0 5px" }}>
                {t.typeToConfirm.replace("{name}", action.confirmName || "")}
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={action.confirmName || ""}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box",
                  border: `1px solid ${typedOk ? C.red : C.border}`, background: C.bg, color: C.text,
                  fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none",
                }}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
            <button style={btn(true, true)} disabled={!typedOk} onClick={() => typedOk && onRun(action)}>{t.deleteCta}</button>
          </div>
        </div>
      )}

      {/* everything else (create_class/unit, rename_*, move_deck, review): plain confirm */}
      {status === "idle" && !isDeck && !isSchedule && !isDestructive && (
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
          <button
            style={btn(true, isDestructive)}
            disabled={!typedOk}
            onClick={() => { if (isDeck) runDeck(); else if (typedOk) onRun(action); }}
          >{isDeck ? t.createCta : isDestructive ? t.deleteCta : t.confirm}</button>
        </div>
      )}

      {status === "canceled" && (
        <div style={{ fontSize: 12.5, color: C.textMuted }}>{t.canceled}</div>
      )}
    </div>
  );
}
