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

import { useState, useEffect } from "react";
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
    prevUnit: "Previous unit",
    nextUnit: "Next unit",
    closeUnit: "Close unit",
    reopen: "Reopen",
    // Phase 6: general reviews live aside the unit plan
    generalReviewsTitle: "General reviews",
    generalReviewsHint: "Standalone content outside the daily plan — pre-exam recaps, monthly reviews.",
    generalReviewsEmpty: "No general reviews yet. Use these for content that doesn't fit a warmup or exit ticket.",
    addReview: "+ Add review",
    // Phase 6: class-wide search
    searchPlaceholder: "Search this class — warmups, exits, reviews…",
    searchEmpty: "No matches in this class.",
    searchOneResult: "1 match",
    searchResults: "{n} matches",
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
    prevUnit: "Unidad anterior",
    nextUnit: "Siguiente unidad",
    closeUnit: "Cerrar unidad",
    reopen: "Reabrir",
    generalReviewsTitle: "Repasos generales",
    generalReviewsHint: "Contenido aparte del plan diario — repasos previos a examen, repasos mensuales.",
    generalReviewsEmpty: "Aún no hay repasos. Úsalos para contenido que no encaja como warmup o exit ticket.",
    addReview: "+ Añadir repaso",
    searchPlaceholder: "Buscar en esta clase — warmups, exits, repasos…",
    searchEmpty: "Sin resultados en esta clase.",
    searchOneResult: "1 resultado",
    searchResults: "{n} resultados",
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
    prevUnit: "이전 단원",
    nextUnit: "다음 단원",
    closeUnit: "단원 종료",
    reopen: "다시 열기",
    generalReviewsTitle: "일반 복습",
    generalReviewsHint: "일일 계획과 별도의 자료 — 시험 전 정리, 월간 복습 등.",
    generalReviewsEmpty: "아직 일반 복습이 없습니다. 워밍업이나 종료 티켓에 맞지 않는 자료에 사용하세요.",
    addReview: "+ 복습 추가",
    searchPlaceholder: "이 수업 검색 — 워밍업, 종료, 복습…",
    searchEmpty: "이 수업에서 일치 항목 없음.",
    searchOneResult: "1개 일치",
    searchResults: "{n}개 일치",
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


// ─── UnitSwitcher — dropdown para cambiar/crear unidades ────────────────
//
// Sits next to the unit header in PlanView. Click → dropdown listing all
// units of the class with their status, click one → it becomes the
// active unit. Bottom of the dropdown has a "+ New unit" affordance
// that opens an inline name input.
//
// Status switching contract:
//   When the teacher picks a different unit, the picked one becomes
//   active. The previously-active one becomes 'planned' (not 'closed' —
//   "closed" is a deliberate teacher action, not a side-effect of
//   switching). This means:
//     - Old active unit is still listed (with 'planned' chip)
//     - Teacher can switch back any time
//     - Closing a unit remains a separate, intentional action (PR 6)
//
// New unit creation:
//   Inserts with status='active' and bumps any other 'active' unit in
//   the same class to 'planned'. This keeps the Plan-view invariant that
//   exactly one unit is the protagonist at a time.
//   Section: copied from the currently-active unit, since Plan view
//   treats units as section-agnostic but the schema requires the column.
//
// This component does NOT close units — closing belongs to PR 6, where
// it gets its own dedicated flow with the "narrative" summary.
function UnitSwitcher({ allUnits, activeUnit, classId, lang = "en", onSwitched }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // i18n inline since this component is small and self-contained
  const labels = {
    en: { switchUnit: "Switch unit", newUnit: "+ New unit",
          createPlaceholder: "Unit name…", create: "Create",
          cancel: "Cancel", emptyName: "Name required",
          tooLong: "Name too long (max 60)" },
    es: { switchUnit: "Cambiar unidad", newUnit: "+ Nueva unidad",
          createPlaceholder: "Nombre de unidad…", create: "Crear",
          cancel: "Cancelar", emptyName: "El nombre es requerido",
          tooLong: "Nombre muy largo (máx 60)" },
    ko: { switchUnit: "단원 전환", newUnit: "+ 새 단원",
          createPlaceholder: "단원 이름…", create: "만들기",
          cancel: "취소", emptyName: "이름이 필요합니다",
          tooLong: "이름이 너무 깁니다 (최대 60)" },
  };
  const L = labels[lang] || labels.en;

  // Sort units: active first, then by position
  const sortedUnits = [...(allUnits || [])].sort((a, b) => {
    if (a.id === activeUnit.id) return -1;
    if (b.id === activeUnit.id) return 1;
    if (a.status !== b.status) {
      const rank = { active: 0, planned: 1, closed: 2 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    }
    return (a.position || 0) - (b.position || 0);
  });

  const handlePick = async (unit) => {
    if (busy || unit.id === activeUnit.id) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setErr("");
    // Two updates in parallel:
    //   1. Demote the current active unit to 'planned'
    //   2. Promote the picked unit to 'active'
    // We don't try to make this a transaction — the worst-case race
    // (both end up active for a moment) is harmless because pickActiveUnit
    // resolves multi-active gracefully on next load.
    const [r1, r2] = await Promise.all([
      supabase.from("units").update({ status: "planned" }).eq("id", activeUnit.id),
      supabase.from("units").update({ status: "active" }).eq("id", unit.id),
    ]);
    setBusy(false);
    setOpen(false);
    if (r1.error || r2.error) {
      setErr(r1.error?.message || r2.error?.message || "Switch failed");
      return;
    }
    onSwitched && onSwitched();
  };

  const handleCreate = async () => {
    if (busy) return;
    const trimmed = newName.trim();
    if (!trimmed) { setErr(L.emptyName); return; }
    if (trimmed.length > 60) { setErr(L.tooLong); return; }
    setErr("");
    setBusy(true);
    // Position = max within this class + 1, so the new unit lands at
    // the end ordering-wise. We use ALL units (across sections) since
    // Plan view treats units as section-agnostic.
    const nextPos = sortedUnits.length === 0
      ? 0
      : Math.max(...sortedUnits.map(u => u.position || 0)) + 1;
    // Phase 6: units no longer have a section — they're themes that
    // contain warmups + exit tickets together. Insert with section=null.
    // Demote current active in parallel with creating the new one,
    // also marked active. Same race-tolerance as handlePick above.
    const [r1, r2] = await Promise.all([
      supabase.from("units").update({ status: "planned" }).eq("id", activeUnit.id),
      supabase.from("units").insert({
        class_id: classId,
        section: null,
        name: trimmed,
        position: nextPos,
        status: "active",
      }).select().single(),
    ]);
    setBusy(false);
    if (r1.error || r2.error) {
      setErr(r1.error?.message || r2.error?.message || "Create failed");
      return;
    }
    setNewName("");
    setCreating(false);
    setOpen(false);
    onSwitched && onSwitched();
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 12px",
          borderRadius: 7,
          background: open ? C.bgSoft : C.bg,
          color: C.text,
          border: `1px solid ${C.border}`,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 12.5, fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
          transition: "background .12s ease",
        }}
      >
        ▾ {L.switchUnit}
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            onClick={() => { setOpen(false); setCreating(false); setErr(""); }}
            style={{ position: "fixed", inset: 0, zIndex: 50 }}
          />
          {/* Dropdown panel */}
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 240,
            maxWidth: 320,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
            zIndex: 51,
            overflow: "hidden",
          }}>
            {sortedUnits.map(u => {
              const isActive = u.id === activeUnit.id;
              const statusColor = u.status === "active" ? C.green
                : u.status === "closed" ? C.textMuted
                : C.textSecondary;
              return (
                <button
                  key={u.id}
                  onClick={() => handlePick(u)}
                  disabled={busy}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: isActive ? C.accentSoft : "transparent",
                    border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    cursor: busy ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    textAlign: "left",
                    fontFamily: "'Outfit', sans-serif",
                    transition: "background .1s ease",
                  }}
                  onMouseEnter={e => { if (!isActive && !busy) e.currentTarget.style.background = C.bgSoft; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: isActive ? 600 : 500,
                      color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {u.name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9.5, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    padding: "2px 6px", borderRadius: 3,
                    background: statusColor + "1A",
                    color: statusColor,
                    flexShrink: 0,
                  }}>
                    {unitStatusLabel(u.status, lang)}
                  </span>
                </button>
              );
            })}

            {/* Create-new section */}
            {creating ? (
              <div style={{ padding: 12, background: C.bgSoft }}>
                <input
                  type="text"
                  value={newName}
                  autoFocus
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !busy) { e.preventDefault(); handleCreate(); }
                    else if (e.key === "Escape") { setCreating(false); setNewName(""); setErr(""); }
                  }}
                  placeholder={L.createPlaceholder}
                  maxLength={60}
                  disabled={busy}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: `1px solid ${err ? C.red : C.border}`,
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    color: C.text,
                    background: C.bg,
                    outline: "none",
                    marginBottom: err ? 4 : 8,
                  }}
                />
                {err && (
                  <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>{err}</div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => { setCreating(false); setNewName(""); setErr(""); }}
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "transparent",
                      color: C.textSecondary,
                      border: `1px solid ${C.border}`,
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12, fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >{L.cancel}</button>
                  <button
                    onClick={handleCreate}
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: C.accent,
                      color: "#fff",
                      border: "none",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12, fontWeight: 600,
                      cursor: busy ? "wait" : "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >{L.create}</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setCreating(true); setErr(""); }}
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13, fontWeight: 600,
                  color: C.accent,
                  textAlign: "left",
                  transition: "background .1s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.accentSoft; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {L.newUnit}
              </button>
            )}
          </div>
        </>
      )}
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

// ─── GeneralReviewCard — compact row for a general_review deck ──────────
//
// Visually mirrors a filled Slot but slightly more compact since these
// decks live "outside" the day plan. No "Day N" label, no slotted
// position — just the deck info and a Launch button.
function GeneralReviewCard({ deck, t, lang, onLaunch }) {
  const stripe = sectionAccent("general_review");
  const qs = deck.questions || [];
  return (
    <div
      onClick={() => onLaunch(deck)}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${stripe}`,
        borderRadius: 10,
        padding: "10px 14px",
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
      <SectionBadge section="general_review" lang={lang} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14, fontWeight: 600, color: C.text,
          lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {deck.title}
        </div>
        <div style={{
          fontSize: 11.5, color: C.textSecondary,
          marginTop: 2,
        }}>
          {qs.length} {t.questions}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onLaunch(deck); }}
        style={{
          padding: "6px 12px",
          borderRadius: 7,
          background: C.accent,
          color: "#fff",
          border: "none",
          fontFamily: "'Outfit', sans-serif",
          fontSize: 12.5, fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {t.launch} →
      </button>
    </div>
  );
}

// ─── GeneralReviewsBlock — separate section below the day stack ─────────
//
// General reviews live OUTSIDE the unit-day plan (per Jota's feedback:
// "general no, ellos si deben estar aparte"). This block renders all
// general_review decks of the class with a header + a small "+ Create
// review" affordance. They don't compete visually with the day plan
// because the day plan is the protagonist; this block is supporting
// material the teacher reaches for occasionally (15-min mid-quarter
// review, pre-exam recap, etc.).
function GeneralReviewsBlock({ decks, t, lang, onLaunch, onCreate }) {
  const reviews = decks.filter(d => d.section === "general_review");
  return (
    <div style={{ marginTop: 32, marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "baseline",
        justifyContent: "space-between", gap: 10,
        marginBottom: 12,
      }}>
        <div>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 15, fontWeight: 700, color: C.text,
            letterSpacing: "-0.01em",
            marginBottom: 2,
          }}>
            {t.generalReviewsTitle}
          </h3>
          <p style={{ fontSize: 12, color: C.textMuted }}>
            {t.generalReviewsHint}
          </p>
        </div>
        <button
          onClick={onCreate}
          style={{
            padding: "6px 12px",
            borderRadius: 7,
            background: C.bg,
            color: C.textSecondary,
            border: `1px dashed ${C.border}`,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 12.5, fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
            transition: "border-color .12s ease, color .12s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = C.accent;
            e.currentTarget.style.color = C.accent;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.textSecondary;
          }}
        >
          {t.addReview}
        </button>
      </div>
      {reviews.length === 0 ? (
        <div style={{
          padding: "20px 16px",
          background: C.bgSoft,
          border: `1px dashed ${C.border}`,
          borderRadius: 10,
          textAlign: "center",
          fontSize: 12.5,
          color: C.textMuted,
          lineHeight: 1.5,
        }}>
          {t.generalReviewsEmpty}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {reviews.map(deck => (
            <GeneralReviewCard
              key={deck.id}
              deck={deck}
              t={t} lang={lang}
              onLaunch={onLaunch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ClassSearch — global search across all decks of the class ──────────
//
// Searches warmups, exit tickets, and general reviews — anything in this
// class. Results show with section badge so the teacher knows what kind
// of deck each match is. Click a result → Launch (same as elsewhere).
//
// Why a search and not a filter: the teacher already sees their content
// organized by day in Plan view. Search is for "where the heck did I put
// the verb-irregular deck" cases — find by title/content, not browse.
function ClassSearch({ decks, t, lang, onLaunch }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  // Don't show anything until the teacher actually types — we don't want
  // a giant unfiltered list of all decks taking up the page by default.
  // The search is a tool, not a primary view.
  if (!trimmed) {
    return (
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            color: C.text,
            outline: "none",
            transition: "border-color .12s ease",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
        />
      </div>
    );
  }

  const matches = decks.filter(d => {
    const title = (d.title || "").toLowerCase();
    const tags = (d.tags || []).join(" ").toLowerCase();
    const subject = (d.subject || "").toLowerCase();
    return title.includes(trimmed) || tags.includes(trimmed) || subject.includes(trimmed);
  });

  return (
    <div style={{ marginTop: 24, marginBottom: 20 }}>
      <input
        type="text"
        value={query}
        autoFocus
        onChange={e => setQuery(e.target.value)}
        placeholder={t.searchPlaceholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: `1px solid ${C.accent}`,
          background: C.bg,
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
          color: C.text,
          outline: "none",
          marginBottom: 12,
        }}
      />
      <div style={{
        fontSize: 11, color: C.textMuted, marginBottom: 8,
        fontFamily: MONO,
      }}>
        {matches.length === 0
          ? t.searchEmpty
          : matches.length === 1
            ? t.searchOneResult
            : t.searchResults.replace("{n}", matches.length)
        }
      </div>
      {matches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {matches.map(deck => {
            const stripe = sectionAccent(deck.section);
            const qs = deck.questions || [];
            return (
              <div
                key={deck.id}
                onClick={() => onLaunch(deck)}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${stripe}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  transition: "background .1s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.bg; }}
              >
                <SectionBadge section={deck.section} lang={lang} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13.5, fontWeight: 600, color: C.text,
                    lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {deck.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {qs.length} {t.questions}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────
export default function PlanView({
  classId,
  classes = [],
  decks,
  units = [],          // all units of the class
  activeUnit,
  userId,
  lang = "en",
  onRefresh,           // called after the modal attaches a deck to a slot
  onUnitChanged,       // called after the unit name is renamed inline
  // PR5.1: arrow navigation between units. ClassPage decides what
  // "previous" and "next" mean (by position within current/active group)
  // and passes null when there's nothing to navigate to.
  onPrevUnit,
  onNextUnit,
  // PR6: close/reopen unit. ClassPage opens the modal/summary flow.
  onCloseUnit,         // called when the teacher clicks "Close unit"
  onReopenUnit,        // called when the teacher clicks "Reopen" on a closed unit
}) {
  const t = i18n[lang] || i18n.en;
  const navigate = useNavigate();

  // Modal state — what slot the teacher is filling, if any
  const [modalSlot, setModalSlot] = useState(null);
  // modalSlot shape: { dayNumber: number, slotKind: "warmup"|"exit" } | null

  // PR6 follow-up: animate unit transitions. When activeUnit.id changes
  // (the teacher hit prev/next or jumped from Past/Upcoming/Search),
  // we slide the content out in one direction and the new content in
  // from the opposite. The direction is inferred from a tiny handshake:
  // when the teacher clicks an arrow, we set `pendingDir` BEFORE
  // ClassPage updates the index, so we know which way the content
  // should fly. For "external" jumps (Past tab click, Search result,
  // initial load) we fall back to no-direction slide-in (just fade).
  const [slideDir, setSlideDir] = useState(null);  // "left" | "right" | null
  // Track which unit we're currently rendering. When activeUnit.id
  // changes, we briefly hold onto the old unit, run the slide-out
  // animation, then swap to the new unit.
  const [renderUnit, setRenderUnit] = useState(activeUnit);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Same unit, nothing to do
    if (!activeUnit || activeUnit.id === renderUnit?.id) {
      // Keep renderUnit fresh on shallow updates (e.g. rename) without
      // re-triggering animation
      if (activeUnit && activeUnit !== renderUnit) setRenderUnit(activeUnit);
      return;
    }
    // Different unit. Animate.
    setAnimating(true);
    // After the slide-out (200ms), swap to the new unit and slide in
    const swapTimer = setTimeout(() => {
      setRenderUnit(activeUnit);
      // Let the slide-in animation complete before allowing new transitions
      const inTimer = setTimeout(() => {
        setAnimating(false);
        setSlideDir(null);
      }, 240);
      return () => clearTimeout(inTimer);
    }, 200);
    return () => clearTimeout(swapTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnit?.id]);

  // Wrap the prev/next handlers so they capture direction BEFORE the
  // index actually moves. This way the effect above already knows
  // which way to slide when activeUnit.id flips.
  const handlePrev = onPrevUnit ? () => { setSlideDir("right"); onPrevUnit(); } : null;
  const handleNext = onNextUnit ? () => { setSlideDir("left"); onNextUnit(); } : null;

  if (!activeUnit) {
    // Should not happen — ClassPage decides whether to render PlanView
    // based on whether an active unit exists. But defensive return.
    return null;
  }

  const dayRows = buildDayRows(decks, renderUnit.id);
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
    navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classId)}&section=${section}&unit=${encodeURIComponent(renderUnit.id)}`);
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
  // "+ Add review" in the General Reviews block — bypasses the modal
  // (general reviews aren't slotted into a day, so the "pick from
  // library" framing doesn't apply). Goes straight to the editor with
  // section=general_review pre-filled. Note: NO unit_id — Phase 6
  // detached general reviews from units permanently.
  const handleCreateReview = () => {
    navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classId)}&section=general_review`);
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* PR6 follow-up: keyframes for unit transition animations.
          Slide-out: current unit content slides toward one edge and fades.
          Slide-in: new unit content enters from the OPPOSITE edge.
          Direction handshake: next-arrow → outgoing slides LEFT, incoming
          enters from right; prev-arrow → outgoing slides RIGHT, incoming
          enters from left. The 200ms out + 240ms in window matches the
          setTimeout chain in the unit-change useEffect above. */}
      <style>{`
        @keyframes cl-slide-out-left {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(-32px); opacity: 0; }
        }
        @keyframes cl-slide-out-right {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(32px); opacity: 0; }
        }
        @keyframes cl-slide-in-from-right {
          from { transform: translateX(32px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes cl-slide-in-from-left {
          from { transform: translateX(-32px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes cl-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      <div
        // The wrapper that animates. We pick an animation name based on
        // (a) whether we're animating, (b) what phase we're in (out vs in,
        // determined by whether activeUnit.id matches renderUnit.id), and
        // (c) which direction.
        // - animating + activeUnit !== renderUnit → still showing OLD,
        //   playing slide-out
        // - animating + activeUnit === renderUnit → showing NEW, playing
        //   slide-in (this branch isn't actually hit because the swap
        //   happens at the boundary and `animating` stays true through
        //   slide-in too — see useEffect)
        // - !animating → no animation
        // We use the renderUnit.id as a key so React fully remounts the
        // children on swap, restarting any internal animation/state.
        key={renderUnit.id}
        style={{
          animation: !animating
            ? "none"
            : (activeUnit && activeUnit.id !== renderUnit.id)
              // In OUT phase: still showing the OLD unit, slide it away
              ? `${slideDir === "left" ? "cl-slide-out-left" : slideDir === "right" ? "cl-slide-out-right" : "cl-fade-in"} 200ms ease forwards`
              // In IN phase: showing the NEW unit, slide it in
              : `${slideDir === "left" ? "cl-slide-in-from-right" : slideDir === "right" ? "cl-slide-in-from-left" : "cl-fade-in"} 240ms ease forwards`,
        }}
      >

      {/* Unit header — flex row with three groups:
          [← prev] [editable name + meta]                  [next →] [close unit]
          Arrows let the teacher flip between units like pages. The
          activeUnit's name is editable inline (click to rename). The
          "Close unit" action lives at the far right — irreversible
          enough to warrant the visual distance from primary actions.
          When there's no prev/next, the arrow renders disabled. */}
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}>
        {/* Prev arrow */}
        <button
          onClick={handlePrev || undefined}
          disabled={!handlePrev || animating}
          aria-label={t.prevUnit}
          style={{
            width: 32, height: 32,
            borderRadius: 7,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: handlePrev ? C.text : C.textMuted,
            cursor: handlePrev && !animating ? "pointer" : "default",
            opacity: handlePrev ? (animating ? 0.6 : 1) : 0.4,
            fontSize: 14,
            fontFamily: "'Outfit', sans-serif",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background .12s ease, border-color .12s ease, opacity .12s ease",
          }}
          onMouseEnter={e => { if (handlePrev && !animating) e.currentTarget.style.background = C.bgSoft; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          ←
        </button>

        {/* Name + meta. PR6 follow-up: the close/reopen button moved
            to live INSIDE this block, on the same row as the unit name,
            instead of at the right edge of the header — putting it next
            to the next-arrow made the flow visually cluttered. Now the
            primary unit identity (name + action) reads as one unit, and
            the arrows stay clean as nav-only. */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            flexWrap: "wrap",
          }}>
            <EditableUnitName
              unit={renderUnit}
              lang={lang}
              onChanged={() => onUnitChanged && onUnitChanged()}
            />
            {/* Close / Reopen — sized down a hair so it doesn't compete
                with the name itself; the name stays the visual anchor. */}
            {renderUnit.status === "closed" ? (
              <button
                onClick={onReopenUnit}
                style={{
                  padding: "5px 11px",
                  borderRadius: 6,
                  background: "transparent",
                  color: C.textSecondary,
                  border: `1px solid ${C.border}`,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                  flexShrink: 0,
                  // marginBottom matches the EditableUnitName's marginBottom
                  // (4px) so the baseline aligns visually
                  marginBottom: 4,
                  transition: "border-color .12s ease, color .12s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
              >
                ↺ {t.reopen}
              </button>
            ) : (
              <button
                onClick={onCloseUnit}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                  marginBottom: 4,
                  transition: "background .12s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1A1A1A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#000"; }}
              >
                {t.closeUnit}
              </button>
            )}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 12, color: C.textMuted,
          }}>
            <span style={{
              fontSize: 10.5, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "2px 8px", borderRadius: 4,
              background: renderUnit.status === "closed" ? C.bgSoft : C.greenSoft,
              color: renderUnit.status === "closed" ? C.textSecondary : C.green,
            }}>
              {unitStatusLabel(renderUnit.status, lang)}
            </span>
            <span style={{ fontFamily: MONO }}>
              {dayCount === 0 ? t.daysCountZero
                : dayCount === 1 ? t.daysCountOne
                : t.daysCount.replace("{n}", dayCount)}
            </span>
            {/* PR6: when the unit is closed, show the closed_at date
                inline so the teacher remembers when it ended. */}
            {renderUnit.status === "closed" && renderUnit.closed_at && (
              <span style={{ fontFamily: MONO, color: C.textMuted }}>
                · {new Date(renderUnit.closed_at).toLocaleDateString(lang)}
              </span>
            )}
          </div>
        </div>

        {/* Next arrow */}
        <button
          onClick={handleNext || undefined}
          disabled={!handleNext || animating}
          aria-label={t.nextUnit}
          style={{
            width: 32, height: 32,
            borderRadius: 7,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: handleNext ? C.text : C.textMuted,
            cursor: handleNext && !animating ? "pointer" : "default",
            opacity: handleNext ? (animating ? 0.6 : 1) : 0.4,
            fontSize: 14,
            fontFamily: "'Outfit', sans-serif",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background .12s ease, border-color .12s ease, opacity .12s ease",
          }}
          onMouseEnter={e => { if (handleNext && !animating) e.currentTarget.style.background = C.bgSoft; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          →
        </button>
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
              // Restored to the original PR4 style after the user said
              // the PR4.2 version (accent background) didn't work as
              // well visually. Original: transparent bg + muted dashed
              // border + muted text. Hover lifts to accent. Reads as
              // "available action" without being loud.
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

      </div>{/* end animation wrapper */}

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
