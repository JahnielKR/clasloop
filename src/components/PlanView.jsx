// ─── PlanView ──────────────────────────────────────────────────────────
//
// The unit-as-protagonist view of a class. Renders the active unit as
// vertical stack of days; each day has a warmup slot (top) and an exit
// ticket slot (bottom). Section colors carry the role identity, the
// teacher's eye scans top-to-bottom-by-day rather than tab-by-section.
//
// Slot semantics:
//   "Day N" labels are RELATIVE to the unit. Day 1 is the first session
//   the teacher will run for this unit, Day 2 is the second, etc. There
//   are no calendar dates because real classroom days drift (holidays,
//   sick days, fire drills) — relative day numbers stay correct through
//   any disruption. The teacher who lost a Tuesday to a strike still
//   teaches "Day 3" next, regardless of date.
//
// Where Day N comes from in the data model:
//   - decks have `position` (integer) within their (class_id, section,
//     unit_id) bucket, set by drag-reorder.
//   - We pair the warmup at position N with the exit_ticket at position
//     N to form Day N. So "Day 1" = (warmup pos=1) + (exit_ticket pos=1).
//   - Either slot can be empty. A day with only an exit ticket is fine
//     ("oh I just want a closing question today"), same with only a warmup.
//   - General-review decks are NOT slotted into days — they live in the
//     side panel ("Review pool" — TODO future iteration). For now they
//     don't appear in PlanView at all; teachers can still see them in
//     the All-decks view.
//
// What this component does NOT do:
//   - Drag-reorder of slots (deferred — for now teachers reorder in
//     All-decks view, which has full dnd-kit setup; the Plan view here
//     respects whatever order they set there)
//   - Day-add / day-delete buttons (deferred — adding a deck to a unit
//     happens in the deck editor; this view just SHOWS the resulting
//     plan)
//   - Empty unit state (when the unit exists but has zero decks)
//   - Inline deck creation (teachers go through the existing flow:
//     "+ New deck" → role chooser → editor)
// What it DOES do:
//   - Show the unit header with name + status chip + day-progress
//   - Show all "occupied" days (any day where at least one slot has a deck)
//   - Show one trailing empty day at the end as "+ Add Day N+1" affordance
//   - Each occupied slot: section badge, deck title, meta, Launch button
//   - Each empty slot inside an occupied day: "+ Add warmup" / "+ Add exit"
//   - Both slots empty → a single "+ Add Day N" call-to-action

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SectionBadge, { sectionAccent } from "./SectionBadge";
import AddToSlotModal from "./AddToSlotModal";
import { unitStatusLabel } from "../lib/class-hierarchy";
import { C, MONO } from "./tokens";
import { buildRoute, ROUTES, QUERY } from "../routes";

// ─── i18n ──────────────────────────────────────────────────────────────
const i18n = {
  en: {
    dayLabel: "Day {n}",
    addWarmup: "+ Add warmup",
    addExit: "+ Add exit ticket",
    addDay: "+ Add Day {n}",
    launch: "Launch",
    questions: "questions",
    statusActive: "Active",
    statusPlanned: "Planned",
    statusClosed: "Closed",
    daysCount: "{n} days planned",
    daysCountOne: "1 day planned",
    daysCountZero: "No days planned yet",
    emptyTitle: "This unit has no decks yet",
    emptyHint: "Add a warmup or exit ticket to start building Day 1.",
  },
  es: {
    dayLabel: "Día {n}",
    addWarmup: "+ Añadir warmup",
    addExit: "+ Añadir exit ticket",
    addDay: "+ Añadir Día {n}",
    launch: "Lanzar",
    questions: "preguntas",
    daysCount: "{n} días planeados",
    daysCountOne: "1 día planeado",
    daysCountZero: "Aún no hay días planeados",
    emptyTitle: "Esta unidad aún no tiene decks",
    emptyHint: "Añade un warmup o exit ticket para empezar el Día 1.",
  },
  ko: {
    dayLabel: "{n}일차",
    addWarmup: "+ 워밍업 추가",
    addExit: "+ 종료 티켓 추가",
    addDay: "+ {n}일차 추가",
    launch: "시작",
    questions: "문제",
    daysCount: "{n}일 계획됨",
    daysCountOne: "1일 계획됨",
    daysCountZero: "아직 계획된 날 없음",
    emptyTitle: "이 단원에는 아직 덱이 없습니다",
    emptyHint: "워밍업이나 종료 티켓을 추가하여 1일차를 시작하세요.",
  },
};

// ─── Build the day-rows from a flat deck list ──────────────────────────
//
// Input: { decks: [...], activeUnitId: uuid }
// Output: [{ dayNumber: 1, warmup: deck|null, exit: deck|null }, ...]
//
// Pairing rule: deck.position determines its slot. position=1 in section
// 'warmup' = Day 1 warmup; position=1 in 'exit_ticket' = Day 1 exit ticket.
// We don't care if positions skip numbers (1, 3, 5) — we collapse the gaps
// and number consecutively starting at Day 1. The teacher reads "I have
// 3 days set up" not "I have days 1, 3, and 5".
function buildDayRows(decks, activeUnitId) {
  if (!activeUnitId) return [];
  const inUnit = decks.filter(d => d.unit_id === activeUnitId);

  // Separate warmups and exit tickets, sort each by position
  const warmups = inUnit
    .filter(d => d.section === "warmup")
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const exits = inUnit
    .filter(d => d.section === "exit_ticket")
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  // Pair them by index: warmups[0] with exits[0], warmups[1] with exits[1]…
  // Whichever array is longer determines the day count.
  const dayCount = Math.max(warmups.length, exits.length);
  const rows = [];
  for (let i = 0; i < dayCount; i++) {
    rows.push({
      dayNumber: i + 1,
      warmup: warmups[i] || null,
      exit: exits[i] || null,
    });
  }
  return rows;
}

// ─── Slot — one cell in a day row ──────────────────────────────────────
// ─── EditableUnitName — click-to-rename inline ──────────────────────────
//
// Click on the unit name → it turns into an input. Enter saves, Escape
// cancels, blur saves. Notion-style. Solves the "Unit 5 stuck with a
// default name" problem without needing a separate rename modal.
//
// Validation matches the regular create-unit handler:
//   - Required (rejects empty / whitespace-only by reverting)
//   - Max 60 chars
// Edge cases handled:
//   - Saving the SAME name doesn't fire a DB update (small win)
//   - DB error reverts to the previous name
function EditableUnitName({ unit, lang = "en", onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(unit.name);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(unit.name);
    setEditing(true);
  };

  const commit = async () => {
    if (saving) return;
    const trimmed = draft.trim();
    // Empty or unchanged → just close, no DB call
    if (!trimmed || trimmed === unit.name) {
      setEditing(false);
      setDraft(unit.name);
      return;
    }
    // Length cap matches handleCreateUnit in ClassPage. The DB doesn't
    // enforce it; this is the only client-side guard.
    const safe = trimmed.slice(0, 60);
    setSaving(true);
    const { error } = await supabase
      .from("units")
      .update({ name: safe })
      .eq("id", unit.id);
    setSaving(false);
    setEditing(false);
    if (error) {
      // Revert silently — the parent will re-render with the stale
      // name from props. Could add a toast here later.
      setDraft(unit.name);
      return;
    }
    onChanged && onChanged(safe);
  };

  const cancel = () => {
    setDraft(unit.name);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        onBlur={commit}
        disabled={saving}
        maxLength={60}
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17, fontWeight: 700,
          color: C.text,
          letterSpacing: "-0.01em",
          marginBottom: 4,
          width: "100%",
          padding: "2px 6px",
          margin: "-2px -6px 4px",
          border: `1px solid ${C.accent}`,
          borderRadius: 5,
          background: C.bg,
          outline: "none",
          opacity: saving ? 0.6 : 1,
        }}
      />
    );
  }

  // Resting state — looks like the static heading, but hover hints at
  // editability with a subtle background. The pencil glyph is intentional
  // so teachers know it's editable; without it some users won't realize.
  return (
    <div
      onClick={startEdit}
      title={lang === "es" ? "Click para renombrar" : lang === "ko" ? "클릭하여 이름 변경" : "Click to rename"}
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 17, fontWeight: 700,
        color: C.text,
        letterSpacing: "-0.01em",
        marginBottom: 4,
        cursor: "pointer",
        padding: "2px 6px",
        margin: "-2px -6px 4px",
        borderRadius: 5,
        transition: "background .12s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {unit.name}
      <span style={{
        fontSize: 11,
        color: C.textMuted,
        opacity: 0.6,
        fontWeight: 400,
      }}>✎</span>
    </div>
  );
}


function Slot({ deck, slotKind, t, lang, onLaunch, onSlotClick }) {
  // slotKind: "warmup" | "exit" — used for the empty-slot label and
  // for routing the new-deck flow (so the deck editor pre-fills the
  // section).

  if (deck) {
    // Filled slot: matches the YourPlanCard look from Today
    const stripe = sectionAccent(deck.section);
    const qs = deck.questions || [];
    return (
      <div
        onClick={() => onLaunch(deck)}
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${stripe}`,
          borderRadius: 10,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          transition: "transform .12s ease, box-shadow .12s ease",
          boxShadow: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <SectionBadge section={deck.section} lang={lang} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14.5, fontWeight: 600, color: C.text,
            lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {deck.title}
          </div>
          <div style={{
            fontSize: 11.5, color: C.textSecondary,
            marginTop: 2,
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          }}>
            <span>{qs.length} {t.questions}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onLaunch(deck); }}
          style={{
            padding: "7px 14px",
            borderRadius: 7,
            background: C.accent,
            color: "#fff",
            border: "none",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
            flexShrink: 0,
          }}
        >
          {t.launch} →
        </button>
      </div>
    );
  }

  // Empty slot: dashed border, "+ Add" affordance
  const label = slotKind === "warmup" ? t.addWarmup : t.addExit;
  return (
    <button
      onClick={() => onSlotClick()}
      style={{
        background: "transparent",
        border: `1.5px dashed ${C.border}`,
        borderRadius: 10,
        padding: "16px",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        cursor: "pointer",
        color: C.textMuted,
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        transition: "border-color .12s ease, color .12s ease, background .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.color = C.accent;
        e.currentTarget.style.background = C.accentSoft;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.color = C.textMuted;
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

// ─── DayBlock — header + warmup slot + exit slot ───────────────────────
function DayBlock({ row, t, lang, onLaunch, onSlotClick }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13, fontWeight: 700,
        color: C.textSecondary,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginBottom: 10,
      }}>
        {t.dayLabel.replace("{n}", row.dayNumber)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Slot
          deck={row.warmup}
          slotKind="warmup"
          t={t} lang={lang}
          onLaunch={onLaunch}
          onSlotClick={() => onSlotClick("warmup", row.dayNumber)}
        />
        <Slot
          deck={row.exit}
          slotKind="exit"
          t={t} lang={lang}
          onLaunch={onLaunch}
          onSlotClick={() => onSlotClick("exit", row.dayNumber)}
        />
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────
export default function PlanView({
  classId,
  classes = [],
  decks,
  activeUnit,
  userId,
  lang = "en",
  onRefresh,           // called after a successful pick-from-library so
                       // ClassPage re-fetches its data
  onUnitChanged,       // called after the unit name is renamed inline
}) {
  const t = i18n[lang] || i18n.en;
  const navigate = useNavigate();

  // Modal state — what slot the teacher is filling, if any
  const [modalSlot, setModalSlot] = useState(null);
  // modalSlot shape: { dayNumber: number, slotKind: "warmup"|"exit" } | null

  if (!activeUnit) {
    // Should not happen — ClassPage decides whether to render PlanView
    // based on whether an active unit exists. But defensive return.
    return null;
  }

  const dayRows = buildDayRows(decks, activeUnit.id);
  const dayCount = dayRows.length;

  // Action handlers
  const handleLaunch = (deck) => {
    navigate(buildRoute.sessionsOptions(deck.id));
  };
  // Click on an empty slot opens the AddToSlotModal — the teacher picks
  // an existing deck from their library OR jumps to the editor.
  const handleSlotClick = (slotKind, dayNumber) => {
    setModalSlot({ slotKind, dayNumber });
  };
  // Modal "Create a new one" path — same as the pre-modal behavior:
  // jump to the editor with section + unit + class pre-filled.
  const handleCreateFromModal = (slotKind) => {
    const section = slotKind === "warmup" ? "warmup" : "exit_ticket";
    navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classId)}&section=${section}&unit=${encodeURIComponent(activeUnit.id)}`);
  };
  // Modal "Pick from library" path — the modal already wrote unit_id
  // and position, so we just close + refresh.
  const handlePickedFromLibrary = (_updatedDeck) => {
    setModalSlot(null);
    onRefresh && onRefresh();
  };
  // "+ Add Day N+1" at end of stack — opens the modal for a warmup at
  // the next day. Adding a warmup is the canonical way to seed a day;
  // the matching exit ticket comes after.
  const handleAddNewDay = () => {
    setModalSlot({ slotKind: "warmup", dayNumber: dayCount + 1 });
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Unit header — name + status + day count */}
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "14px 18px",
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <EditableUnitName
            unit={activeUnit}
            lang={lang}
            onChanged={() => onUnitChanged && onUnitChanged()}
          />
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 12, color: C.textMuted,
          }}>
            <span style={{
              fontSize: 10.5, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "2px 8px", borderRadius: 4,
              background: activeUnit.status === "closed" ? C.bgSoft : C.greenSoft,
              color: activeUnit.status === "closed" ? C.textSecondary : C.green,
            }}>
              {unitStatusLabel(activeUnit.status, lang)}
            </span>
            <span style={{ fontFamily: MONO }}>
              {dayCount === 0 ? t.daysCountZero
                : dayCount === 1 ? t.daysCountOne
                : t.daysCount.replace("{n}", dayCount)}
            </span>
          </div>
        </div>
      </div>

      {/* Empty unit state */}
      {dayCount === 0 ? (
        <div style={{
          padding: "36px 24px",
          background: C.bg,
          border: `1px dashed ${C.border}`,
          borderRadius: 12,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 15, fontWeight: 600, color: C.text,
            marginBottom: 6,
          }}>
            {t.emptyTitle}
          </div>
          <div style={{
            fontSize: 13, color: C.textSecondary,
            marginBottom: 16, lineHeight: 1.5,
            maxWidth: 360, margin: "0 auto 16px",
          }}>
            {t.emptyHint}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => handleSlotClick("warmup", 1)}
              style={{
                padding: "8px 14px",
                borderRadius: 7,
                background: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13, fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t.addWarmup}
            </button>
            <button
              onClick={() => handleSlotClick("exit", 1)}
              style={{
                padding: "8px 14px",
                borderRadius: 7,
                background: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13, fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t.addExit}
            </button>
          </div>
        </div>
      ) : (
        <>
          {dayRows.map(row => (
            <DayBlock
              key={row.dayNumber}
              row={row}
              t={t} lang={lang}
              onLaunch={handleLaunch}
              onSlotClick={handleSlotClick}
            />
          ))}

          {/* Trailing "+ Add Day N+1" affordance — clicking creates a new
              warmup at position dayCount+1, which becomes the seed of
              the new day. The teacher can then add the matching exit
              ticket. */}
          <button
            onClick={handleAddNewDay}
            style={{
              width: "100%",
              padding: "16px",
              background: "transparent",
              border: `1.5px dashed ${C.border}`,
              borderRadius: 10,
              color: C.textMuted,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 500,
              cursor: "pointer",
              transition: "border-color .12s ease, color .12s ease, background .12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.accent;
              e.currentTarget.style.color = C.accent;
              e.currentTarget.style.background = C.accentSoft;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.textMuted;
              e.currentTarget.style.background = "transparent";
            }}
          >
            {t.addDay.replace("{n}", dayCount + 1)}
          </button>
        </>
      )}

      {/* Add-to-slot modal — opens whenever the teacher clicks an empty
          slot. Tabs let them pick from their library OR create a new one.
          Only mounted when modalSlot is not null so its state is fresh
          on every open. */}
      <AddToSlotModal
        open={modalSlot !== null}
        onClose={() => setModalSlot(null)}
        classId={classId}
        classes={classes}
        activeUnit={activeUnit}
        dayNumber={modalSlot?.dayNumber}
        slotKind={modalSlot?.slotKind}
        decks={decks}
        userId={userId}
        lang={lang}
        onPicked={handlePickedFromLibrary}
        onCreate={handleCreateFromModal}
      />
    </div>
  );
}
