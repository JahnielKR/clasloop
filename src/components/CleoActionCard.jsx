// ─── CleoActionCard ──────────────────────────────────────────────────────────
// Inline confirmation card for an action Cleo proposed (create class / unit /
// deck / review quiz). The teacher confirms here BEFORE anything is written —
// Cleo never acts on her own. Read-only `navigate` actions don't use this card.
//
// create_deck is special: instead of just a confirm button, it shows a tiny
// FORM (name + language + count + images) so the teacher sets the deck up by
// tapping options — Cleo proposes sensible defaults, she never silently assumes
// the language/length/name. Other actions stay a simple details + Confirm.
//
// The action's lifecycle (idle → running → done | error | canceled) and its
// result are CONTROLLED by the parent (CleoChat stores them on the chat
// message). That's deliberate: the chat panel unmounts when closed, so keeping
// status here would reset to "idle" on reopen and let the teacher run a
// finished action again (e.g. create a second deck). Only the create_deck form
// fields are local — they only matter before the first run.
import { useState } from "react";
import { C } from "./tokens";

const sectionLabel = (s, t) =>
  s === "warmup" ? t.sectionWarmup : s === "exit_ticket" ? t.sectionExit : t.sectionGeneral;

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

const SECTION_CODES = ["warmup", "exit_ticket", "general_review"];
const TITLE = {
  create_class: (t) => t.createClassTitle,
  create_unit: (t) => t.createUnitTitle,
  generate_review_deck: (t) => t.reviewDeckTitle,
  create_deck: (t) => t.createDeckTitle,
  schedule_unit: (t) => t.scheduleTitle,
};

// Local YYYY-MM-DD (not UTC) so "today" matches the teacher's calendar day.
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const LANGS = [["en", "EN"], ["es", "ES"], ["ko", "KO"]];
const COUNTS = [3, 5, 10, 15, 20];

export default function CleoActionCard({
  action, t, onRun, onCancel, onNavigate,
  lang = "en", fileName = "",
  status = "idle", result = null,
}) {
  const isDeck = action.type === "create_deck";
  const isSchedule = action.type === "schedule_unit";
  const isPptx = /\.pptx$/i.test(fileName || "");

  // schedule_unit form state: which date to put the unit on (defaults today).
  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 86400000));
  const [date, setDate] = useState(today);

  // create_deck form state — seeded from Cleo's proposal + the UI language, so
  // the teacher just tweaks instead of typing everything.
  const [title, setTitle] = useState(
    action.title || action.topic || (fileName ? fileName.replace(/\.[^.]+$/, "") : "")
  );
  const [section, setSection] = useState(
    SECTION_CODES.includes(action.section) ? action.section : "general_review"
  );
  const [dLang, setDLang] = useState(action.language || lang || "en");
  const [count, setCount] = useState(COUNTS.includes(action.numQuestions) ? action.numQuestions : 5);
  // Default to reusing a PPTX's own images; off otherwise (AI images are opt-in).
  const [images, setImages] = useState(action.source === "document" && isPptx);

  const rows = (DETAIL_ROWS[action.type] || (() => []))(action, t, fileName);
  const heading = (TITLE[action.type] || (() => ""))(t);
  // These run an AI generation step, so they take a while.
  const isSlow = action.type === "generate_review_deck" || isDeck;

  // Hand the (possibly form-edited) action up; the parent runs it and flips the
  // message's status, so this card just reflects the `status` prop.
  const confirm = () => {
    const payload = isDeck
      ? {
          ...action,
          section,
          title: title.trim() || action.title || action.topic || "",
          language: dLang,
          numQuestions: count,
          images: images ? "on" : "off",
        }
      : isSchedule
      ? { ...action, date }
      : action;
    onRun(payload);
  };

  const doneMsg = () => {
    const k = result?.result?.kind;
    const name = result?.result?.name || "";
    if (k === "class") return t.doneClass.replace("{name}", name);
    if (k === "unit") return t.doneUnit.replace("{name}", name);
    if (k === "review_deck") return t.doneReview;
    if (k === "deck") return t.doneDeck.replace("{name}", name).replace("{count}", String(result?.result?.count ?? ""));
    if (k === "scheduled_unit") return t.doneSchedule.replace("{name}", name);
    return "";
  };
  const viewLabel = () => {
    const k = result?.result?.kind;
    if (k === "class") return t.viewClass;
    if (k === "unit") return t.viewUnit;
    if (k === "review_deck") return t.viewReview;
    if (k === "deck") return t.viewDeck;
    if (k === "scheduled_unit") return t.viewClass;
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

  const pill = (active) => ({
    padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: "pointer", lineHeight: 1.3,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentSoft : "transparent",
    color: active ? C.accent : C.textMuted,
  });
  const fieldLabel = { fontSize: 11, fontWeight: 600, color: C.textMuted, margin: "0 0 5px" };
  const pillRow = { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 };

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
          <p style={fieldLabel}>{t.fieldName}</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            maxLength={120}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, marginBottom: 12,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text,
              fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />

          <p style={fieldLabel}>{t.fieldSection}</p>
          <div style={pillRow}>
            {SECTION_CODES.map((code) => (
              <button key={code} style={pill(section === code)} onClick={() => setSection(code)}>{sectionLabel(code, t)}</button>
            ))}
          </div>

          <p style={fieldLabel}>{t.fieldLanguage}</p>
          <div style={pillRow}>
            {LANGS.map(([code, lbl]) => (
              <button key={code} style={pill(dLang === code)} onClick={() => setDLang(code)}>{lbl}</button>
            ))}
          </div>

          <p style={fieldLabel}>{t.fieldCount}</p>
          <div style={pillRow}>
            {COUNTS.map((n) => (
              <button key={n} style={pill(count === n)} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>

          <p style={fieldLabel}>{t.fieldImages}</p>
          <div style={{ ...pillRow, marginBottom: images && !isPptx ? 6 : 12 }}>
            <button style={pill(images)} onClick={() => setImages(true)}>{t.optYes}</button>
            <button style={pill(!images)} onClick={() => setImages(false)}>{t.optNo}</button>
          </div>
          {images && !isPptx && (
            <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 12px", lineHeight: 1.4 }}>{t.aiImagesNote}</p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
            <button style={btn(true)} onClick={confirm}>{t.createCta}</button>
          </div>
        </div>
      )}

      {/* schedule_unit: pick the date (defaults to today) */}
      {status === "idle" && isSchedule && (
        <div>
          <p style={fieldLabel}>{t.fieldDate}</p>
          <div style={pillRow}>
            <button style={pill(date === today)} onClick={() => setDate(today)}>{t.dateToday}</button>
            <button style={pill(date === tomorrow)} onClick={() => setDate(tomorrow)}>{t.dateTomorrow}</button>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, marginBottom: 12,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text,
              fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
            <button style={btn(true)} onClick={confirm}>{t.confirm}</button>
          </div>
        </div>
      )}

      {/* other actions: a plain confirm */}
      {status === "idle" && !isDeck && !isSchedule && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(false)} onClick={onCancel}>{t.cancel}</button>
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
          <button style={btn(true)} onClick={confirm}>{isDeck ? t.createCta : t.confirm}</button>
        </div>
      )}

      {status === "canceled" && (
        <div style={{ fontSize: 12.5, color: C.textMuted }}>{t.canceled}</div>
      )}
    </div>
  );
}
