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

import { useNavigate } from "react-router-dom";
import SectionBadge, { sectionAccent } from "./SectionBadge";
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
function Slot({ deck, slotKind, t, lang, onLaunch, onCreate }) {
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
      onClick={() => onCreate(slotKind)}
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
function DayBlock({ row, t, lang, onLaunch, onCreate }) {
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
          onCreate={onCreate}
        />
        <Slot
          deck={row.exit}
          slotKind="exit"
          t={t} lang={lang}
          onLaunch={onLaunch}
          onCreate={onCreate}
        />
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────
export default function PlanView({
  classId,
  decks,
  activeUnit,
  lang = "en",
}) {
  const t = i18n[lang] || i18n.en;
  const navigate = useNavigate();

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
  const handleCreate = (slotKind) => {
    // Route to the new-deck editor with section pre-filled.
    // The editor reads `?class=<id>&section=<section>` to know where
    // to place the new deck. unit_id pre-fill happens via class context.
    const section = slotKind === "warmup" ? "warmup" : "exit_ticket";
    navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classId)}&section=${section}&unit=${encodeURIComponent(activeUnit.id)}`);
  };
  const handleAddNewDay = () => {
    // "Add Day N+1" — same as adding a warmup at the next position.
    // The editor will assign the next position automatically.
    handleCreate("warmup");
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
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17, fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.01em",
            marginBottom: 4,
          }}>
            {activeUnit.name}
          </div>
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
              onClick={() => handleCreate("warmup")}
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
              onClick={() => handleCreate("exit")}
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
              onCreate={handleCreate}
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
    </div>
  );
}
