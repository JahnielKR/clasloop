// ─── ClassPage — teacher's view of a single class ──────────────────────
// Punto 4 refactor (Phases 1 + 3). Organizes class content by section:
//   - Warmups (start of class)
//   - Exit tickets (end of class)
//   - General review (everything else / spaced repetition pool)
//
// Phase 3 adds Units — an optional layer between section and decks. Within
// each section the teacher can group decks into named units (e.g. inside
// Warmups: "Unit 1", "Unit 2"). Decks with unit_id=null show under an
// "Unsorted" bucket. Drag-reorder, inline rename, and unit deletion are
// deferred to a follow-up turn — this iteration covers create + assign +
// listing, which is enough to validate the model.

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useClassPage, useClassPageCache, useTeacherClassesCache } from "../hooks/useClasses";
import { formatSupabaseError } from "../lib/supabase-errors";
import { CIcon } from "../components/Icons";
import { DeckCover, resolveColor as resolveDeckColor } from "../lib/deck-cover";
import { useIsMobile } from "../components/MobileMenuButton";
import EditClassModal from "../components/EditClassModal";
import StudentsModal from "../components/StudentsModal";
import SectionBadge, { sectionAccent } from "../components/SectionBadge";
import PlanView from "../components/PlanView";
import { CloseUnitConfirmModal, CloseUnitSummary, ReopenUnitModal } from "../components/CloseUnitFlow";
import { C, MONO } from "../components/tokens";
import CleoTour from "../onboarding/CleoTour";
import Cleo from "../components/Cleo";
import Confetti from "../components/Confetti";
import { useReplayTour } from "../onboarding/TourContext";
import { ROUTES, QUERY, buildRoute } from "../routes";
import {
  SECTIONS,
  DEFAULT_SECTION,
  isValidSection,
  sectionLabels,
  CLASS_COLORS,
  resolveClassAccent,
  pickActiveUnit,
  unitStatusLabel,
} from "../lib/class-hierarchy";
// dnd-kit drives the drag-reorder UX. Replaces the previous HTML5 D&D
// implementation, which suffered from the browser-generated translucent
// "ghost" thumbnail (the teacher described it as cutre — fair). With
// dnd-kit we render a custom DragOverlay that matches the real card and
// the surrounding cards animate aside (FLIP under the hood).
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// PR 78: i18n centralizado
import { useT } from "../i18n";

// ─── i18n ────────────────────────────────────────────────────────────────
// PR 78: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "classPage".

// ─── Color picker popover ────────────────────────────────────────────────
function ColorPickerPopover({ classObj, onPick, onClose, t, accent }) {
  const ref = useRef(null);
  // Click-outside dismiss. We don't need a backdrop — popover is small and
  // unobtrusive enough that an outside click closing it is the right model.
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // Defer so the click that opened the popover doesn't immediately close it.
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const currentId = classObj.color_id || "auto";

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 12,
        width: 200,
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        zIndex: 50,
        fontFamily: "'Outfit',sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
        {t.classColor}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {CLASS_COLORS.map(c => {
          const isCurrent = c.id === currentId;
          if (c.id === "auto") {
            return (
              <button
                key={c.id}
                onClick={() => onPick("auto")}
                aria-label={t.autoColor}
                title={t.autoColor}
                className="cl-color-swatch cl-color-swatch-auto"
                style={{
                  height: 28,
                  borderRadius: 7,
                  background: C.bgSoft,
                  border: isCurrent ? `2px solid ${accent}` : `1px dashed ${C.border}`,
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 600,
                  color: isCurrent ? accent : C.textMuted,
                  fontFamily: "'Outfit',sans-serif",
                  padding: 0,
                }}
              >
                {t.auto}
              </button>
            );
          }
          return (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              aria-label={c.id}
              title={c.id}
              className="cl-color-swatch"
              style={{
                height: 28,
                borderRadius: 7,
                background: c.hex,
                border: isCurrent ? `2px solid ${c.hex}` : `1px solid ${c.hex}33`,
                outline: isCurrent ? `2px solid ${C.bg}` : "none",
                outlineOffset: isCurrent ? -4 : 0,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isCurrent && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section tab ─────────────────────────────────────────────────────────
function SectionTab({ section, label, count, active, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? accent : C.textSecondary,
        borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
        marginBottom: -1,
        cursor: "pointer",
        fontFamily: "'Outfit',sans-serif",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "color .15s ease",
        whiteSpace: "nowrap",
      }}
    >
      <CIcon name={section.icon} size={14} inline />
      {label}
      <span style={{
        fontSize: 11,
        marginLeft: 2,
        padding: "1px 6px",
        borderRadius: 8,
        background: active ? accent + "1A" : C.bgSoft,
        color: active ? accent : C.textMuted,
        fontWeight: 600,
      }}>{count}</span>
    </button>
  );
}

// ─── Activity type label resolver ───────────────────────────────────────
function activityLabel(deck, t) {
  const qs = deck.questions || [];
  if (qs.length === 0) return "—";
  const types = new Set(qs.map(q => q.type || q.activity_type).filter(Boolean));
  if (types.size > 1) return t.mixed;
  const only = [...types][0];
  return t[only] || only || "—";
}

// ─── Deck card (presentation only) ──────────────────────────────────────
// Pure visual component — knows nothing about dnd-kit. Used both by the
// SortableDeckCard wrapper (the cards in the grid) and by the DragOverlay
// (the floating card that follows the cursor while dragging).
//
// `units` powers the Move-to dropdown for cross-unit reassignment;
// `onChangeUnit(deck, newUnitId)` persists the change.
//
// Drag visuals are driven by props so the wrapper can configure them:
//   - isDragging: true on the source card while a drag is in flight (we
//     fade it so the cursor's overlay is the focal point)
//   - isOverlay: true when this is the floating preview, NOT a card in
//     the grid (we add a soft shadow to feel "lifted")
function DeckCard({
  deck,
  accent,
  t,
  lang = "en",
  units = [],
  onChangeUnit,
  onOpen,
  isDragging = false,
  isOverlay = false,
  dragAttributes,
  dragListeners,
  setNodeRef,
  style,
}) {
  const qs = deck.questions || [];
  const deckAccent = resolveDeckColor(deck) || accent;
  const handleUnitChange = (e) => {
    e.stopPropagation();
    const newId = e.target.value || null;
    if (newId === (deck.unit_id || null)) return;
    onChangeUnit && onChangeUnit(deck, newId);
  };

  // Trello-style placeholder while this card is the drag source. We hide
  // the actual content and render an empty rectangle that occupies the
  // same slot — that way the surrounding grid doesn't reflow, the drop
  // target is visually obvious (it's the gap), and the cursor's overlay
  // is the only focal point. setNodeRef + listeners stay attached so
  // dnd-kit can still detect collisions on this slot.
  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        {...(dragAttributes || {})}
        {...(dragListeners || {})}
        style={{
          // Same shape as the real card so the grid stays calm. We can't
          // know the rendered card's exact height (the title clamps at 2
          // lines), but reserving min-height of a typical card is close
          // enough for this transient state.
          minHeight: 88,
          borderRadius: 10,
          background: C.bgSoft,
          border: `1.5px dashed ${C.border}`,
          fontFamily: "'Outfit',sans-serif",
          ...(style || {}),
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      // Drag attributes / listeners come from useSortable on the wrapper.
      // We attach them to the outer card so the whole card is the drag
      // surface, EXCEPT for the inner select — that one stops propagation
      // so the dropdown still works without triggering a drag.
      {...(dragAttributes || {})}
      {...(dragListeners || {})}
      onClick={isOverlay ? undefined : onOpen}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${deckAccent}`,
        borderRadius: 10,
        padding: 12,
        cursor: isOverlay ? "grabbing" : (dragListeners ? "grab" : "pointer"),
        boxShadow: isOverlay
          ? "0 12px 28px rgba(0,0,0,.18), 0 4px 10px rgba(0,0,0,.10)"
          : undefined,
        transition: "opacity .12s ease",
        fontFamily: "'Outfit',sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        // dnd-kit's transform/transition come from the sortable wrapper.
        // We merge them into our own style so cards animate aside.
        ...(style || {}),
      }}
      className="cl-deck-row"
    >
      {/* Section badge — visible identity for warmup vs exit ticket vs
          general review. Sits at the top of the card so a teacher scanning
          the grid can tell them apart at a glance, even before reading the
          title. The badge is non-clickable; the surrounding card click
          still opens the deck. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <SectionBadge section={deck.section} lang={lang} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <DeckCover deck={deck} size={36} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {deck.title}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ flexShrink: 0 }}>{qs.length} {t.questions} · {activityLabel(deck, t)}</span>
        {/* Move-to-unit selector — only renders if there's at least one unit
            in this section. Stops propagation aggressively so neither the
            dropdown click nor the pointer-down (which dnd-kit uses for
            drag activation) triggers a drag. */}
        {units.length > 0 && !isOverlay && (
          <select
            value={deck.unit_id || ""}
            onChange={handleUnitChange}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title={t.unitMoveTo}
            style={{
              fontSize: 10,
              fontFamily: "'Outfit',sans-serif",
              padding: "2px 18px 2px 6px",
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              background: C.bg,
              color: C.textSecondary,
              cursor: "pointer",
              maxWidth: 130,
              minWidth: 0,
              textOverflow: "ellipsis",
              flexShrink: 1,
            }}
          >
            <option value="">{t.unitsUnsorted}</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── Sortable wrapper ───────────────────────────────────────────────────
// Calls useSortable to register the card with the surrounding
// SortableContext. The hook gives us a setNodeRef + listeners to attach
// to the draggable element, plus a transform/transition pair we apply
// inline so cards animate aside while a drag is in progress.
//
// We pass everything down to DeckCard so the actual visuals stay in one
// place.
function SortableDeckCard({ deck, accent, t, lang, units, onChangeUnit, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deck.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <DeckCard
      deck={deck}
      accent={accent}
      t={t}
      lang={lang}
      units={units}
      onChangeUnit={onChangeUnit}
      onOpen={onOpen}
      isDragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
      setNodeRef={setNodeRef}
      style={style}
    />
  );
}

// ─── Main export ────────────────────────────────────────────────────────
export default function ClassPage({ lang = "en", profile, classId, onLaunchPractice, onOpenMobileMenu }) {
  const t = useT("classPage", lang);
  const tours = useT("tours", lang);
  const replayTour = useReplayTour();
  const [searchParams, setSearchParams] = useSearchParams();
  // ?celebrate=1 — the "fiesta" after a teacher saves their first warmup (the
  // deck editor returns here). One-shot confetti, then we clear the param.
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (searchParams.get("celebrate") !== "1") return undefined;
    setCelebrate(true);
    const next = new URLSearchParams(searchParams);
    next.delete("celebrate");
    setSearchParams(next, { replace: true });
    const timer = setTimeout(() => setCelebrate(false), 5000);
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);
  const sLabels = sectionLabels(lang);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // PR 170b (M1): class + decks + units + used-deck-ids now come from one cached
  // React Query (src/hooks/useClasses.js). Mutations patch the cache; the old
  // refreshTick refetch counter is now invalidateClassPage().
  const userId = profile?.id;
  const { data: cp, isPending: loading } = useClassPage(classId, userId);
  const classObj = cp?.classObj ?? null;
  const decks = useMemo(() => cp?.decks ?? [], [cp]);
  const units = useMemo(() => cp?.units ?? [], [cp]);
  const usedDeckIds = useMemo(() => cp?.usedDeckIds ?? new Set(), [cp]);
  const notFound = cp?.notFound ?? false;
  const { patchClassObj, patchDecks, patchUnits, invalidate: invalidateClassPage } =
    useClassPageCache(classId);
  // Keep the teacher's Classes-list cache (a separate query) in sync when we
  // mutate the class row here — otherwise the list shows stale color/name until
  // its staleTime expires or a hard refresh. See useClasses.js (patchClasses).
  const { patchClasses } = useTeacherClassesCache(userId);
  // Which tab to open first when a teacher lands on the class. Warmups —
  // it's the most-used section in real classroom rhythm (start of every
  // class), so it's the right thing to surface. NOT to be confused with
  // DEFAULT_SECTION (which is the schema-level fallback bucket for any
  // deck that somehow lands without a valid section — that stays as
  // general_review because it's the most conservative landing spot).
  const [activeSection, setActiveSection] = useState("warmup");
  // Per-section unit filter. null = "All units" (show every deck in the
  // section, grouped by unit, with an "Unsorted" group at the end for decks
  // without a unit). A specific unit id = show only that unit. The legacy
  // "__unsorted__" filter was removed — its info is already visible in the
  // "All" grouped view, and a duplicate chip just added noise. Resets when
  // the active section changes.
  const [unitFilter, setUnitFilter] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // PR 27: students list modal (avatar + name + remove)
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitError, setNewUnitError] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  // Which unit groups are currently collapsed in the "All" view. Set of unit
  // ids (string for a real unit, "__unsorted__" for the unsorted bucket).
  // Stored in component state — persists while the page is open but resets
  // on full reload, which is the right tradeoff for a UI affordance like
  // this (no need to remember collapse state across sessions).
  const [collapsedUnits, setCollapsedUnits] = useState(() => new Set());

  // Drag-and-drop state for reordering decks within their bucket. dnd-kit
  // exposes the active drag id via DragOverlay; we track it ourselves so
  // the overlay can render the right card. Touch is supported by default
  // (PointerSensor + KeyboardSensor below) — works on mobile, no special
  // codepath like the old HTML5 D&D needed.
  const [activeDragDeckId, setActiveDragDeckId] = useState(null);
  // PR 170b: the old refreshTick refetch counter is gone — actions that need a
  // refresh call invalidateClassPage() (React Query refetch) instead.
  // PR5.1: top tab in ClassPage. One of:
  //   "current"  → the active unit, with prev/next arrows in PlanView
  //   "past"     → list of closed units (read mode)
  //   "upcoming" → list of planned units
  //   "general"  → general_review decks of the class
  //   "search"   → search input with results below
  // Default is "current"; switching is instant (no fetch — same data).
  const [topTab, setTopTab] = useState("current");
  // PR5.1: which unit the teacher is viewing inside "current". Lets the
  // arrows in PlanView page through ALL active+planned+closed units in
  // the class (in order) rather than only through "active" ones. We seed
  // it from pickActiveUnit on first load.
  const [currentUnitIdx, setCurrentUnitIdx] = useState(0);
  // PR5.1: search query (used by the "search" tab)
  const [searchQuery, setSearchQuery] = useState("");
  // PR6: close-unit flow has 3 possible states for a given unit:
  //   null            → not in flow
  //   { unit, step:1} → confirmation modal showing
  //   { unit, step:2} → full-page summary showing
  // The unit reference is captured so even if the carousel index moves,
  // we close the right unit.
  const [closeUnitFlow, setCloseUnitFlow] = useState(null);
  // Reopen flow is single-step (just a confirmation modal)
  const [reopenUnit, setReopenUnit] = useState(null);

  // Sensors. PointerSensor with a small activationConstraint distance
  // ensures plain clicks (open the deck) and short clicks on the unit
  // dropdown don't accidentally start a drag. KeyboardSensor gives full
  // keyboard a11y: tab to a card, Space/Enter to grab, arrows to move,
  // Space/Enter to drop, Esc to cancel.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleUnitCollapsed = (key) => {
    setCollapsedUnits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // PR 24.9 / 170b: `usedDeckIds` (decks with a non-cancelled session — locked
  // in place because they have student responses) now comes from the
  // useClassPage query above. See src/hooks/useClasses.js.

  // PR 170b: class data loads via useClassPage() above (one cached query).
  // currentUnitIdx side-effect: when units (re)load, land on the active unit on
  // FIRST load; on later refetches only correct it if it now points out of
  // bounds (otherwise preserve the page the teacher was on). The old code keyed
  // "first load" off refreshTick === 0; a ref does the same now.
  const firstUnitLoadRef = useRef(true);
  useEffect(() => {
    if (notFound || units.length === 0) return;
    const activeOne = pickActiveUnit(units);
    if (activeOne) {
      const idx = units.findIndex(u => u.id === activeOne.id);
      if (idx >= 0 && idx !== currentUnitIdx) {
        if (firstUnitLoadRef.current || currentUnitIdx >= units.length) {
          setCurrentUnitIdx(idx);
        }
      }
    }
    firstUnitLoadRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads currentUnitIdx to preserve selection but must not re-run on it (would loop)
  }, [units, notFound]);

  // When the section changes, reset the unit filter — filters are scoped
  // to one section at a time. Also close any open unit-creation form so
  // we don't leave half-typed input lying around when switching tabs.
  useEffect(() => {
    setUnitFilter(null);
    setShowNewUnit(false);
    setNewUnitName("");
    setNewUnitError("");
  }, [activeSection]);

  const accent = classObj ? resolveClassAccent(classObj) : C.accent;

  // ── Color picker handler ──────────────────────────────────────────────
  const handlePickColor = async (newColorId) => {
    if (!classObj) return;
    setShowColorPicker(false);
    // Optimistic update — flip the color immediately, roll back if Supabase
    // rejects. Network round-trip would otherwise make the picker feel
    // sluggish, especially over slow connections.
    const previous = classObj.color_id;
    patchClassObj({ ...classObj, color_id: newColorId });
    patchClasses(prev => prev.map(c => c.id === classObj.id ? { ...c, color_id: newColorId } : c));
    const { error } = await supabase
      .from("classes")
      .update({ color_id: newColorId })
      .eq("id", classObj.id);
    if (error) {
      patchClassObj({ ...classObj, color_id: previous });
      patchClasses(prev => prev.map(c => c.id === classObj.id ? { ...c, color_id: previous } : c));
    }
  };

  // ── Copy code ─────────────────────────────────────────────────────────
  const handleCopyCode = async () => {
    if (!classObj) return;
    try {
      await navigator.clipboard.writeText(classObj.class_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // Same fallback as MyClassesTeacher.
      const ta = document.createElement("textarea");
      ta.value = classObj.class_code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      catch (_) { /* clipboard API + execCommand both unavailable; nothing to do */ }
      document.body.removeChild(ta);
    }
  };

  // ── Edit class modal handlers ─────────────────────────────────────────
  // Saved: merge updated fields into local classObj so the header reflects
  // changes immediately (no refetch needed). PR 14: close the modal
  // automatically — the previous behavior left it open with a "✓ Saved"
  // flash that required the teacher to click X. Real-use feedback: that
  // felt broken, not intentional.
  const handleClassSaved = (updated) => {
    patchClassObj(prev => ({ ...prev, ...updated }));
    patchClasses(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setShowEditModal(false);
  };

  // Deleted: navigate away. The class row is gone and the cascade has
  // already removed decks/units/members. Going back to /classes lands the
  // teacher on the list, which will refetch on mount.
  const handleClassDeleted = () => {
    setShowEditModal(false);
    patchClasses(prev => prev.filter(c => c.id !== classObj.id));
    navigate(ROUTES.CLASSES);
  };

  // Build the i18n dict the modal expects (it uses unprefixed keys; ours
  // are namespaced as edit_*). One pass at render — cheap.
  const editModalT = {
    title: t.edit_title,
    save: t.edit_save,
    saving: t.edit_saving,
    saved: t.edit_saved,
    close: t.edit_close,
    cancel: t.edit_cancel,
    className: t.edit_className,
    classNamePlaceholder: t.edit_classNamePlaceholder,
    classSubject: t.edit_classSubject,
    classGrade: t.edit_classGrade,
    classGradePlaceholder: t.edit_classGradePlaceholder,
    exportTitle: t.edit_exportTitle,
    exportHelp: t.edit_exportHelp,
    exportButton: t.edit_exportButton,
    exporting: t.edit_exporting,
    exportFailed: t.edit_exportFailed,
    dangerTitle: t.edit_dangerTitle,
    deleteButton: t.edit_deleteButton,
    deleteWarningTitle: t.edit_deleteWarningTitle,
    deleteWarningBody: t.edit_deleteWarningBody,
    deleteConfirmLabel: t.edit_deleteConfirmLabel,
    deleteConfirm: t.edit_deleteConfirm,
    deleting: t.edit_deleting,
    deleteCancel: t.edit_deleteCancel,
    errorEmptyName: t.edit_errorEmptyName,
    errorSaveFailed: t.edit_errorSaveFailed,
    errorDeleteFailed: t.edit_errorDeleteFailed,
    errorTypeMismatch: t.edit_errorTypeMismatch,
  };

  // ── Unit handlers ─────────────────────────────────────────────────────
  // Create a unit in the active section. Optimistic insert: we add a temp
  // record to state so the UI feels instant, then reconcile with the
  // server's row (which has the real id + position) when it returns.
  const handleCreateUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) { setNewUnitError(t.unitErrorEmpty); return; }
    if (trimmed.length > 60) { setNewUnitError(t.unitErrorTooLong); return; }
    setNewUnitError("");
    setCreatingUnit(true);
    // Phase 6: units no longer belong to a section — they're themes.
    // Position is across ALL units in the class (not per-section).
    const nextPos = units.length === 0
      ? 0
      : Math.max(...units.map(u => u.position || 0)) + 1;
    // First unit in a class becomes 'active' so PlanView has something
    // to show. If the class already had units (shouldn't happen here
    // since this handler runs from the empty-state, but defensive),
    // any subsequent one goes 'planned' to preserve the existing active.
    const newStatus = units.length === 0 ? "active" : "planned";
    const { data, error } = await supabase
      .from("units")
      .insert({
        class_id: classObj.id,
        section: null,
        name: trimmed,
        position: nextPos,
        status: newStatus,
      })
      .select()
      .single();
    setCreatingUnit(false);
    if (error || !data) {
      setNewUnitError(formatSupabaseError(error, lang));
      return;
    }
    patchUnits(prev => [...prev, data]);
    setNewUnitName("");
    setShowNewUnit(false);
    // Auto-focus the freshly-created unit so the teacher can immediately see
    // its bucket (empty, but ready to receive decks via the Move-to picker).
    setUnitFilter(data.id);
  };

  // Reassign a deck to a different unit (or to no unit at all when newUnitId
  // is null). Optimistic UI: flip locally first, roll back on error so the
  // dropdown doesn't feel laggy. Server responds with no payload (just status).
  const handleChangeDeckUnit = async (deck, newUnitId) => {
    const previous = deck.unit_id;
    patchDecks(prev => prev.map(d => d.id === deck.id ? { ...d, unit_id: newUnitId } : d));
    const { error } = await supabase
      .from("decks")
      .update({ unit_id: newUnitId })
      .eq("id", deck.id);
    if (error) {
      // Rollback so the picker goes back to where the deck actually lives.
      patchDecks(prev => prev.map(d => d.id === deck.id ? { ...d, unit_id: previous } : d));
    }
  };

  // ── Drag-reorder handlers ─────────────────────────────────────────────
  // Reorder is intra-bucket only (same section + same unit_id). Cross-bucket
  // moves go through the Move-to dropdown (changes unit_id) or the section
  // selector in the deck editor — keeps drag's mental model simple.
  //
  // Strategy: on drop, splice the dragged deck out of its current position
  // and insert at the target's index. Then re-number positions 1..N for the
  // affected bucket and persist. Optimistic local update first; on error
  // we re-fetch (rare path, simpler than rolling back N rows individually).
  // dnd-kit handlers. handleDragStart records the active deck so the
  // DragOverlay can render its preview. handleDragEnd is where we do the
  // actual reorder + persist.
  //
  // Same-bucket policy as before: drag-reorder is only allowed within
  // (section, unit_id). Cross-bucket moves stay on the Move-to dropdown
  // (changes unit_id) or the section selector in the deck editor.
  const handleDragStart = (event) => {
    setActiveDragDeckId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragDeckId(null);
    if (!over || active.id === over.id) return;

    const draggedId = active.id;
    const targetId = over.id;
    const dragging = decks.find(d => d.id === draggedId);
    const target = decks.find(d => d.id === targetId);
    if (!dragging || !target) return;

    // Same-bucket guard. dnd-kit's collision detection won't normally let
    // you drop on a card outside the SortableContext, but we ALSO check
    // here in case multiple SortableContexts share an outer DndContext
    // (e.g. when grouped by unit and the user accidentally drags between
    // groups — the drop would be cross-bucket which we don't support yet).
    if (dragging.section !== target.section) return;
    if ((dragging.unit_id || null) !== (target.unit_id || null)) return;

    // Build the bucket sorted by position, splice via arrayMove, then
    // re-number 1..N. Same persistence strategy as before — bulk updates
    // via Promise.all, refetch on error.
    const bucket = decks
      .filter(d => d.section === dragging.section && (d.unit_id || null) === (dragging.unit_id || null))
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0) || (b.created_at > a.created_at ? 1 : -1));
    const fromIdx = bucket.findIndex(d => d.id === draggedId);
    const toIdx = bucket.findIndex(d => d.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = arrayMove(bucket, fromIdx, toIdx);
    const updates = reordered.map((d, i) => ({ id: d.id, position: i + 1 }));

    // Optimistic local update.
    patchDecks(prev => prev.map(d => {
      const u = updates.find(x => x.id === d.id);
      return u ? { ...d, position: u.position } : d;
    }));

    // Persist. Refetch on any error rather than rolling back per-row.
    const results = await Promise.all(
      updates.map(u => supabase.from("decks").update({ position: u.position }).eq("id", u.id))
    );
    const anyError = results.find(r => r.error);
    if (anyError) {
      // Rare path — a position write failed. Refetch the whole page rather than
      // rolling back N rows individually.
      invalidateClassPage();
    }
  };

  const handleDragCancel = () => {
    setActiveDragDeckId(null);
  };

  // ── Group decks by section ────────────────────────────────────────────
  // Validates against the schema — anything stored with a stray section
  // (shouldn't happen, but defensive) drops to general_review.
  // Sorted by position (asc) within each section, ties by created_at desc.
  // The DB query already orders by these fields, but groupBy can shuffle
  // when decks have different sections, so we re-sort after bucketing.
  const decksBySection = SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: [] }), {});
  decks.forEach(d => {
    const sec = isValidSection(d.section) ? d.section : DEFAULT_SECTION;
    decksBySection[sec].push(d);
  });
  Object.keys(decksBySection).forEach(secId => {
    decksBySection[secId].sort((a, b) => {
      const posDiff = (a.position || 0) - (b.position || 0);
      if (posDiff !== 0) return posDiff;
      return (b.created_at || "") > (a.created_at || "") ? 1 : -1;
    });
  });

  // ── Not found / loading states ────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ padding: isMobile ? "16px 14px 32px" : "20px 28px 40px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{
          background: C.bg,
          border: `1px dashed ${C.border}`,
          borderRadius: 14,
          padding: "60px 24px",
          textAlign: "center",
          marginTop: 40,
        }}>
          <CIcon name="warning" size={32} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "12px 0 6px", fontFamily: "'Outfit',sans-serif" }}>
            {t.classNotFound}
          </h3>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 auto 22px", maxWidth: 360, lineHeight: 1.5 }}>
            {t.classNotFoundSub}
          </p>
          <button
            onClick={() => navigate(ROUTES.CLASSES)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              background: C.accent,
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.goBack}</button>
        </div>
      </div>
    );
  }

  if (loading || !classObj) {
    return (
      <div style={{ padding: isMobile ? "16px 14px 32px" : "20px 28px 40px", maxWidth: 760, margin: "0 auto" }}>
        <p style={{ textAlign: "center", color: C.textMuted, padding: 60, fontSize: 14 }}>{t.loading}</p>
      </div>
    );
  }

  const activeDecks = decksBySection[activeSection] || [];
  const activeLabel = sLabels[activeSection]?.name || activeSection;
  const activeNewLabel = sLabels[activeSection]?.newOne || "New";
  const activeEmptyLabel = sLabels[activeSection]?.empty || "Nothing yet.";

  // Units that belong to the active section. Pre-sorted by position from
  // the fetch query, so chip order is stable.
  const unitsForSection = units.filter(u => u.section === activeSection);

  // Decks visible in the active tab, after applying the unit filter.
  // unitFilter === null      → show everything in the section
  // unitFilter === <uuid>    → show only decks with that unit_id
  const filteredDecks = unitFilter === null
    ? activeDecks
    : activeDecks.filter(d => d.unit_id === unitFilter);

  // For the "All" view (unitFilter null) we group decks visually by unit
  // so the teacher sees the structure even without filtering. When a
  // specific unit is selected we render a flat grid (no extra grouping
  // headers — only one group is visible by definition).
  const groupedByUnit = (() => {
    if (unitFilter !== null) return null;
    if (unitsForSection.length === 0) return null; // no units → flat grid
    const groups = unitsForSection.map(u => ({
      unit: u,
      decks: activeDecks.filter(d => d.unit_id === u.id),
    }));
    const unsorted = activeDecks.filter(d => !d.unit_id);
    if (unsorted.length > 0) {
      groups.push({ unit: null, decks: unsorted });
    }
    return groups;
  })();

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? "16px 14px 32px" : "20px 28px 40px", maxWidth: 760, margin: "0 auto" }}>
      {/* "Fiesta" after the first warmup (one-shot, honors reduced-motion). */}
      {celebrate && <Confetti zIndex={60} />}

      {/* Back link + replay-tour button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <button
        onClick={() => navigate(ROUTES.CLASSES)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          marginLeft: -8,
          marginBottom: 8,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'Outfit',sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: C.textSecondary,
          transition: "color .15s ease, background .15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = accent; e.currentTarget.style.background = accent + "10"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t.backToMyClasses}
      </button>
      {replayTour && (
        <button
          type="button"
          onClick={() => replayTour("classDetail")}
          title={tours.replay}
          aria-label={tours.replay}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
            padding: "6px 10px", borderRadius: 8, marginBottom: 8,
            background: "transparent", color: C.textSecondary,
            border: `1px solid ${C.border}`, cursor: "pointer",
            fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600,
          }}
        >
          <Cleo size={16} animate={false} /> {tours.replay}
        </button>
      )}
      </div>

      {/* Header card */}
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: isMobile ? 14 : 18,
        marginBottom: 20,
        fontFamily: "'Outfit',sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: accent,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 1px 3px ${accent}33`,
            }}>
              <CIcon name="school" size={22} inline />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight: 700,
                color: C.text,
                margin: 0,
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}>{classObj.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  {classObj.subject} · {classObj.grade}
                </span>
                <button
                  onClick={handleCopyCode}
                  title={t.copyCode}
                  aria-label={t.copyCode}
                  data-tour="class-code"
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    color: copied ? "#fff" : accent,
                    background: copied ? C.green : accent + "12",
                    border: `1px solid ${copied ? "transparent" : accent + "44"}`,
                    borderRadius: 6,
                    padding: "2px 8px",
                    cursor: "pointer",
                    letterSpacing: ".03em",
                    transition: "background .15s ease, color .15s ease",
                  }}
                >
                  {copied ? t.copied : classObj.class_code}
                </button>
              </div>
            </div>
          </div>
          {/* PR 27: "View students" button — blue, prominent.
              Sits between the class title block and the small action
              icons (Insights / Theme / Edit). Opens StudentsModal
              with the list of students who joined this class. */}
          <button
            onClick={() => setShowStudentsModal(true)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: C.accent,
              color: "#FFFFFF",
              border: "none",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              transition: "background .15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1A6FCE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.accent; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {t.viewStudents}
          </button>
          {/* Action icons */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0, position: "relative" }}>
            {/* Insights — per-deck aggregate stats for this class. Shown
                on mobile too (unlike Edit class) because checking class
                progress is something a teacher does often, on any device. */}
            <button
              onClick={() => navigate(buildRoute.classInsights(classObj.id))}
              aria-label={t.insights}
              title={t.insights}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "transparent",
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: C.textSecondary,
                transition: "background .15s ease, color .15s ease, border-color .15s ease",
              }}
            >
              {/* Bar chart icon — inline SVG, matches the visual weight
                  of the palette/edit icons in this header. */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 21V9M9 21V3M15 21v-8M21 21v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPicker(v => !v); }}
              aria-label={t.classColor}
              title={t.classColor}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: showColorPicker ? accent + "1A" : "transparent",
                border: `1px solid ${showColorPicker ? accent + "55" : C.border}`,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: showColorPicker ? accent : C.textSecondary,
              }}
            >
              {/* Palette icon — inline SVG */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2-1 2-2 0-.8-.5-1.3-.5-2 0-1.1.9-2 2-2H17c2.8 0 5-2.2 5-5 0-5-4.5-9-10-9z" stroke="currentColor" strokeWidth="1.7" fill="none"/>
                <circle cx="6.5" cy="11" r="1.3" fill="currentColor"/>
                <circle cx="9.5" cy="7" r="1.3" fill="currentColor"/>
                <circle cx="14.5" cy="7" r="1.3" fill="currentColor"/>
                <circle cx="17.5" cy="11" r="1.3" fill="currentColor"/>
              </svg>
            </button>
            {showColorPicker && (
              <ColorPickerPopover
                classObj={classObj}
                accent={accent}
                onPick={handlePickColor}
                onClose={() => setShowColorPicker(false)}
                t={t}
              />
            )}
            {/* Edit class — opens the full edit modal (name, subject, grade,
                export, delete). Hidden on mobile to keep the header tight;
                mobile teachers reach edit by long-pressing the class card on
                MyClasses (TODO if needed). */}
            {!isMobile && (
              <button
                onClick={() => setShowEditModal(true)}
                aria-label={t.editClass}
                title={t.editClass}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: showEditModal ? accent + "1A" : "transparent",
                  border: `1px solid ${showEditModal ? accent + "55" : C.border}`,
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: showEditModal ? accent : C.textSecondary,
                  transition: "background .15s ease, color .15s ease, border-color .15s ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4v16h16v-7M18 2l4 4-11 11H7v-4L18 2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PR6: Close-unit summary page. When the teacher confirms step 1
          and we move to step 2, the summary REPLACES the entire tabs
          UI — it's a full-page experience, not a modal. The teacher
          can Back out (returns to topTab=current) or confirm the close
          (which fires the schema update + auto-promote, then closes
          the flow + refetches via invalidateClassPage). */}
      {closeUnitFlow && closeUnitFlow.step === 2 && (
        <CloseUnitSummary
          unit={closeUnitFlow.unit}
          classObj={classObj}
          userId={profile?.id}
          lang={lang}
          onBack={() => setCloseUnitFlow(null)}
          onConfirm={({ promotedId }) => {
            setCloseUnitFlow(null);
            // After closing, jump the carousel index to the promoted
            // unit if there is one (so the teacher lands on what's
            // active now). If no promotion happened, stay where we are
            // — the closed unit will still be browsable via Past tab.
            if (promotedId) {
              invalidateClassPage();
              // Defer setting the index until after the data refetch —
              // we need the new units array. We'll handle it in the
              // useEffect that loads data. For now, just bump.
            } else {
              invalidateClassPage();
            }
          }}
        />
      )}

      {/* Topbar + content tabs — hidden when the summary page is active */}
      {!(closeUnitFlow && closeUnitFlow.step === 2) && (
      <>

      {/* PR5.1 — Top tabs bar. Five tabs:
          [Current unit] [Past] [Upcoming] | [General review] [Search]
          The vertical bar ('|') visually separates "unit-related navigation"
          from "stuff that lives outside units" (general reviews + search).
          Tabs only appear when classObj is loaded; for empty-class state
          the page falls into a different empty UX below. */}
      {classObj && !loading && (() => {
        // Compute counts for badge display in tabs
        const pastUnits = units.filter(u => u.status === "closed");
        const upcomingUnits = units.filter(u => u.status === "planned");
        const reviewDecks = decks.filter(d => d.section === "general_review");

        // Tab pill style — accent-soft when active, transparent when not
        const tabStyle = (active) => ({
          padding: "7px 13px",
          borderRadius: 7,
          background: active ? C.bg : "transparent",
          color: active ? C.text : C.textSecondary,
          border: "none",
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13, fontWeight: active ? 600 : 500,
          cursor: "pointer",
          boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
          display: "inline-flex", alignItems: "center", gap: 5,
          transition: "background .12s ease, color .12s ease",
        });
        const countBadge = (n) => n > 0 ? (
          <span style={{
            fontSize: 10.5, fontFamily: MONO,
            padding: "1px 6px", borderRadius: 9,
            background: topTab === "current" ? C.bgSoft : "transparent",
            color: C.textMuted,
            fontWeight: 600,
          }}>{n}</span>
        ) : null;

        return (
          <div data-tour="section-tabs" style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            background: C.bgSoft,
            padding: 4,
            borderRadius: 9,
            flexWrap: "wrap",
          }}>
            <button onClick={() => setTopTab("current")}  style={tabStyle(topTab === "current")}>
              {lang === "es" ? "Unidad actual" : lang === "ko" ? "현재 단원" : "Current unit"}
            </button>
            <button onClick={() => setTopTab("past")}     style={tabStyle(topTab === "past")}>
              {lang === "es" ? "Pasadas" : lang === "ko" ? "지난" : "Past"}
              {countBadge(pastUnits.length)}
            </button>
            <button onClick={() => setTopTab("upcoming")} style={tabStyle(topTab === "upcoming")}>
              {lang === "es" ? "Próximas" : lang === "ko" ? "예정" : "Upcoming"}
              {countBadge(upcomingUnits.length)}
            </button>

            {/* Vertical divider — separates unit-tabs from
                general+search which live outside units */}
            <div style={{
              width: 1, height: 22,
              background: C.border,
              margin: "0 4px",
            }} />

            <button onClick={() => setTopTab("general")}  style={tabStyle(topTab === "general")}>
              {lang === "es" ? "Repaso general" : lang === "ko" ? "일반 복습" : "General review"}
              {countBadge(reviewDecks.length)}
            </button>

            {/* PR 19.2: "+ Nueva unidad" affordance lives in the tab bar
                between "General review" and the search input. Visible
                whenever a class has at least one unit (when there are zero
                units the empty-state CTA below handles "+ Nueva unidad",
                and showing both would share state and look broken).
                When clicked, the inline-create UI pops out absolutely
                below the button so the tab bar doesn't grow / wrap. */}
            {!loading && classObj && units.length > 0 && (
              <div style={{ position: "relative" }}>
                {!showNewUnit ? (
                  <button
                    onClick={() => { setShowNewUnit(true); setNewUnitError(""); }}
                    data-tour="create-unit"
                    style={{
                      padding: "6px 11px",
                      borderRadius: 7,
                      background: "transparent",
                      color: C.textSecondary,
                      border: `1px dashed ${C.border}`,
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12, fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "border-color .12s ease, color .12s ease, background .12s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = C.accent;
                      e.currentTarget.style.color = C.accent;
                      e.currentTarget.style.background = C.accentSoft;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.color = C.textSecondary;
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {lang === "es" ? "+ Nueva unidad"
                      : lang === "ko" ? "+ 새 단원"
                      : "+ New unit"}
                  </button>
                ) : (
                  <>
                    {/* The button placeholder keeps the tab bar's layout
                        stable while the popover is open. */}
                    <button
                      disabled
                      style={{
                        padding: "6px 11px",
                        borderRadius: 7,
                        background: C.accentSoft,
                        color: C.accent,
                        border: `1px dashed ${C.accent}`,
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 12, fontWeight: 500,
                        cursor: "default",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lang === "es" ? "+ Nueva unidad"
                        : lang === "ko" ? "+ 새 단원"
                        : "+ New unit"}
                    </button>
                    {/* Backdrop closes the popover on outside click */}
                    <div
                      onClick={() => { setShowNewUnit(false); setNewUnitName(""); setNewUnitError(""); }}
                      style={{ position: "fixed", inset: 0, zIndex: 49 }}
                    />
                    {/* Popover with input + Create + Cancel */}
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      zIndex: 50,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                      padding: 10,
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      minWidth: 280,
                    }}>
                      <input
                        type="text"
                        value={newUnitName}
                        autoFocus
                        placeholder={lang === "es" ? "Nombre de unidad…"
                          : lang === "ko" ? "단원 이름…"
                          : "Unit name…"}
                        onChange={e => setNewUnitName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !creatingUnit) handleCreateUnit();
                          else if (e.key === "Escape") { setShowNewUnit(false); setNewUnitName(""); setNewUnitError(""); }
                        }}
                        maxLength={60}
                        style={{
                          padding: "7px 11px",
                          borderRadius: 7,
                          border: `1px solid ${newUnitError ? C.red : C.border}`,
                          fontSize: 12.5,
                          fontFamily: "'Inter', sans-serif",
                          background: C.bg,
                          color: C.text,
                          outline: "none",
                          width: 180,
                        }}
                        onFocus={e => { if (!newUnitError) e.currentTarget.style.borderColor = C.accent; }}
                        onBlur={e => { if (!newUnitError && !newUnitName.trim()) e.currentTarget.style.borderColor = C.border; }}
                      />
                      <button
                        onClick={handleCreateUnit}
                        disabled={creatingUnit}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 7,
                          background: C.accent,
                          color: "#fff",
                          border: "none",
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: 12.5, fontWeight: 600,
                          cursor: creatingUnit ? "wait" : "pointer",
                          opacity: creatingUnit ? 0.6 : 1,
                        }}
                      >
                        {lang === "es" ? "Crear" : lang === "ko" ? "만들기" : "Create"}
                      </button>
                      {newUnitError && (
                        <div style={{
                          width: "100%",
                          fontSize: 11,
                          color: C.red,
                          marginTop: 2,
                        }}>
                          {newUnitError}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Search — input that lives in the bar itself, not a button.
                When the teacher types something, results appear below in
                whatever tab they're on (overrides current view). */}
            <div style={{
              flex: 1,
              minWidth: 180,
              maxWidth: 320,
              marginLeft: "auto",
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) setTopTab("search");
                  else if (topTab === "search") setTopTab("current");
                }}
                placeholder={lang === "es" ? "Buscar en esta clase…"
                  : lang === "ko" ? "이 수업 검색…"
                  : "Search this class…"}
                style={{
                  width: "100%",
                  padding: "7px 11px",
                  borderRadius: 7,
                  border: `1px solid ${topTab === "search" ? C.accent : C.border}`,
                  background: C.bg,
                  fontSize: 12.5,
                  fontFamily: "'Inter', sans-serif",
                  color: C.text,
                  outline: "none",
                  transition: "border-color .12s ease",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={e => { if (!searchQuery.trim()) e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
          </div>
        );
      })()}

      {/* ─── TAB: Current unit ─────────────────────────────────────────
          Plan view + arrows to flip between units like pages. The
          `currentUnitIdx` points at the unit being shown (any status).
          Arrows bump the index ±1 within the units array, wrapping
          disabled at the boundaries. */}
      {topTab === "current" && units.length > 0 && (() => {
        const safeIdx = Math.min(Math.max(0, currentUnitIdx), units.length - 1);
        const shownUnit = units[safeIdx];
        if (!shownUnit) return null;
        return (
          <PlanView
            classId={classId}
            classes={classObj ? [classObj] : []}
            decks={decks}
            units={units}
            activeUnit={shownUnit}
            usedDeckIds={usedDeckIds}
            userId={profile?.id}
            lang={lang}
            onRefresh={() => invalidateClassPage()}
            onUnitChanged={() => invalidateClassPage()}
            onPrevUnit={safeIdx > 0 ? () => setCurrentUnitIdx(safeIdx - 1) : null}
            onNextUnit={safeIdx < units.length - 1 ? () => setCurrentUnitIdx(safeIdx + 1) : null}
            // PR6: close/reopen handlers. Active and planned units can
            // be closed; closed units can be reopened. PlanView decides
            // which button to show based on activeUnit.status.
            onCloseUnit={shownUnit.status !== "closed"
              ? () => setCloseUnitFlow({ unit: shownUnit, step: 1 })
              : null}
            onReopenUnit={shownUnit.status === "closed"
              ? () => setReopenUnit(shownUnit)
              : null}
          />
        );
      })()}

      {/* ─── TAB: Past units ───────────────────────────────────────────
          Read-mostly list of closed units. Click on one {"\u2192"} jump to it
          in Current tab (the carrousel) so the teacher can review the
          plan that was. */}
      {topTab === "past" && (() => {
        const past = units.filter(u => u.status === "closed");
        if (past.length === 0) {
          return (
            <div style={{
              padding: "32px 20px",
              background: C.bgSoft,
              border: `1px dashed ${C.border}`,
              borderRadius: 10,
              textAlign: "center",
              color: C.textMuted,
              fontSize: 13,
            }}>
              {lang === "es" ? "No hay unidades cerradas todavía."
                : lang === "ko" ? "닫힌 단원이 없습니다."
                : "No closed units yet."}
            </div>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {past.map(u => {
              const decksInUnit = decks.filter(d => d.unit_id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    const idx = units.findIndex(x => x.id === u.id);
                    if (idx >= 0) {
                      setCurrentUnitIdx(idx);
                      setTopTab("current");
                    }
                  }}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${C.textMuted}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "background .12s ease, transform .12s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.bg; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 14, fontWeight: 600, color: C.text,
                      marginBottom: 2,
                    }}>{u.name}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted }}>
                      {decksInUnit.length} {lang === "es" ? "decks" : lang === "ko" ? "덱" : "decks"}
                      {u.closed_at && (
                        <> · {lang === "es" ? "cerrada" : lang === "ko" ? "종료" : "closed"} {new Date(u.closed_at).toLocaleDateString(lang)}</>
                      )}
                    </div>
                  </div>
                  <span style={{ color: C.textMuted, fontSize: 14 }}>{"\u2192"}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ─── TAB: Upcoming units ───────────────────────────────────────
          Planned units that haven't been activated yet. Click → jump to
          that unit in Current. */}
      {topTab === "upcoming" && (() => {
        const upcoming = units.filter(u => u.status === "planned");
        if (upcoming.length === 0) {
          return (
            <div style={{
              padding: "32px 20px",
              background: C.bgSoft,
              border: `1px dashed ${C.border}`,
              borderRadius: 10,
              textAlign: "center",
              color: C.textMuted,
              fontSize: 13,
            }}>
              {lang === "es" ? "No hay unidades planeadas."
                : lang === "ko" ? "예정된 단원이 없습니다."
                : "No upcoming units."}
            </div>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map(u => {
              const decksInUnit = decks.filter(d => d.unit_id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    const idx = units.findIndex(x => x.id === u.id);
                    if (idx >= 0) {
                      setCurrentUnitIdx(idx);
                      setTopTab("current");
                    }
                  }}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${C.textSecondary}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "background .12s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.bg; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 14, fontWeight: 600, color: C.text,
                      marginBottom: 2,
                    }}>{u.name}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted }}>
                      {decksInUnit.length} {lang === "es" ? "decks" : lang === "ko" ? "덱" : "decks"}
                    </div>
                  </div>
                  <span style={{ color: C.textMuted, fontSize: 14 }}>{"\u2192"}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ─── TAB: General review ───────────────────────────────────────
          Standalone decks that don't belong to any unit. The teacher's
          place for "extra" content (pre-exam recap, monthly review,
          15-min wrap). */}
      {topTab === "general" && (() => {
        const reviews = decks.filter(d => d.section === "general_review");
        return (
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 12,
            }}>
              <div>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15, fontWeight: 700, color: C.text,
                  marginBottom: 2,
                }}>
                  {lang === "es" ? "Repasos generales"
                    : lang === "ko" ? "일반 복습"
                    : "General reviews"}
                </h3>
                <p style={{ fontSize: 12, color: C.textMuted }}>
                  {lang === "es" ? "Contenido aparte del plan diario."
                    : lang === "ko" ? "일일 계획과 별도의 자료."
                    : "Standalone content outside the daily plan."}
                </p>
              </div>
              <button
                onClick={() => navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classId)}&section=general_review`)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 7,
                  background: C.bg,
                  color: C.textSecondary,
                  border: `1px dashed ${C.border}`,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
              >
                {lang === "es" ? "+ Añadir repaso" : lang === "ko" ? "+ 복습 추가" : "+ Add review"}
              </button>
            </div>
            {reviews.length === 0 ? (
              <div style={{
                padding: "32px 20px",
                background: C.bgSoft,
                border: `1px dashed ${C.border}`,
                borderRadius: 10,
                textAlign: "center",
                color: C.textMuted,
                fontSize: 13,
              }}>
                {lang === "es" ? "No hay repasos generales todavía."
                  : lang === "ko" ? "아직 일반 복습이 없습니다."
                  : "No general reviews yet."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reviews.map(deck => {
                  const qs = deck.questions || [];
                  return (
                    <div
                      key={deck.id}
                      onClick={() => navigate(buildRoute.sessionsOptions(deck.id))}
                      style={{
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${C.textMuted}`,
                        borderRadius: 10,
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        transition: "background .12s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.bg; }}
                    >
                      <SectionBadge section="general_review" lang={lang} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: 14, fontWeight: 600, color: C.text,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{deck.title}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>
                          {qs.length} {lang === "es" ? "preguntas" : lang === "ko" ? "문제" : "questions"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── TAB: Search ───────────────────────────────────────────────
          Active when the teacher typed something. Searches:
          - Unit names (matched units {"\u2192"} cards showing all their decks)
          - Deck titles, tags, subject
          Results are grouped: matched units first, then individual decks. */}
      {topTab === "search" && (() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
          return (
            <div style={{
              padding: "32px 20px", textAlign: "center",
              color: C.textMuted, fontSize: 13,
            }}>
              {lang === "es" ? "Empieza a escribir para buscar."
                : lang === "ko" ? "검색하려면 입력하세요."
                : "Start typing to search."}
            </div>
          );
        }
        const matchedUnits = units.filter(u => (u.name || "").toLowerCase().includes(q));
        const matchedDecks = decks.filter(d => {
          const title = (d.title || "").toLowerCase();
          const tags = (d.tags || []).join(" ").toLowerCase();
          const subject = (d.subject || "").toLowerCase();
          return title.includes(q) || tags.includes(q) || subject.includes(q);
        });
        const totalMatches = matchedUnits.length + matchedDecks.length;
        if (totalMatches === 0) {
          return (
            <div style={{
              padding: "32px 20px", textAlign: "center",
              color: C.textMuted, fontSize: 13,
            }}>
              {lang === "es" ? "Sin resultados en esta clase."
                : lang === "ko" ? "이 수업에서 결과 없음."
                : "No matches in this class."}
            </div>
          );
        }
        return (
          <div>
            {matchedUnits.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h4 style={{
                  fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  color: C.textMuted, marginBottom: 8,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {lang === "es" ? "Unidades" : lang === "ko" ? "단원" : "Units"} ({matchedUnits.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {matchedUnits.map(u => {
                    const unitDecks = decks.filter(d => d.unit_id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          const idx = units.findIndex(x => x.id === u.id);
                          if (idx >= 0) {
                            setCurrentUnitIdx(idx);
                            setSearchQuery("");
                            setTopTab("current");
                          }
                        }}
                        style={{
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderLeft: `3px solid ${C.accent}`,
                          borderRadius: 10,
                          padding: "12px 16px",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "background .12s ease",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.bg; }}
                      >
                        <div style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: 14, fontWeight: 600, color: C.text,
                        }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>
                          {unitStatusLabel(u.status, lang)} · {unitDecks.length} {lang === "es" ? "decks" : lang === "ko" ? "덱" : "decks"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {matchedDecks.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  color: C.textMuted, marginBottom: 8,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {lang === "es" ? "Decks" : lang === "ko" ? "덱" : "Decks"} ({matchedDecks.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {matchedDecks.map(deck => {
                    const qs = deck.questions || [];
                    return (
                      <div
                        key={deck.id}
                        onClick={() => navigate(buildRoute.sessionsOptions(deck.id))}
                        style={{
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderLeft: `3px solid ${sectionAccent(deck.section)}`,
                          borderRadius: 8,
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
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
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{deck.title}</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                            {qs.length} {lang === "es" ? "preguntas" : lang === "ko" ? "문제" : "questions"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Empty state — class has no units yet. Phase 6: with All-decks
          view removed, this is the entry point for new teachers. We show
          a simple call to action that creates the first unit.
          Inline-create UI: input + button. State for this lives in
          ClassPage already (newUnitName, handleCreateUnit etc.) since
          the All-decks view used it; with All-decks gone we still keep
          the handler and just trigger it from this empty state instead. */}
      {units.length === 0 && !loading && classObj && (
        <div style={{
          padding: "48px 24px",
          background: C.bg,
          border: `1px dashed ${C.border}`,
          borderRadius: 12,
          textAlign: "center",
          maxWidth: 480,
          margin: "0 auto",
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16, fontWeight: 700,
            color: C.text,
            marginBottom: 6,
          }}>
            {lang === "es" ? "Crea tu primera unidad"
              : lang === "ko" ? "첫 단원 만들기"
              : "Create your first unit"}
          </div>
          <div style={{
            fontSize: 13, color: C.textSecondary,
            marginBottom: 18, lineHeight: 1.5,
          }}>
            {lang === "es"
              ? "Una unidad es un tema — \"La Revolución Francesa\", \"Ecuaciones cuadráticas\", \"Fotosíntesis\". Los warmups y exit tickets de cada día viven dentro de la unidad."
              : lang === "ko"
              ? "단원은 주제입니다 — \"프랑스 혁명\", \"이차방정식\", \"광합성\". 매일의 워밍업과 종료 티켓이 단원 안에 들어갑니다."
              : "A unit is a theme — \"The French Revolution\", \"Quadratic Equations\", \"Photosynthesis\". The warmups and exit tickets of each day live inside it."
            }
          </div>
          {!showNewUnit ? (
            <button
              onClick={() => { setShowNewUnit(true); setNewUnitError(""); }}
              data-tour="create-unit"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: C.accent,
                color: "#fff",
                border: "none",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13.5, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {lang === "es" ? "+ Nueva unidad"
                : lang === "ko" ? "+ 새 단원"
                : "+ New unit"}
            </button>
          ) : (
            <div style={{
              display: "flex", gap: 6, justifyContent: "center",
              alignItems: "flex-start", flexWrap: "wrap",
            }}>
              <input
                type="text"
                value={newUnitName}
                autoFocus
                placeholder={lang === "es" ? "Nombre de unidad…"
                  : lang === "ko" ? "단원 이름…"
                  : "Unit name…"}
                onChange={e => setNewUnitName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !creatingUnit) handleCreateUnit();
                  else if (e.key === "Escape") { setShowNewUnit(false); setNewUnitName(""); }
                }}
                maxLength={60}
                style={{
                  padding: "9px 12px",
                  borderRadius: 7,
                  border: `1px solid ${newUnitError ? C.red : C.border}`,
                  fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                  background: C.bg,
                  outline: "none",
                  width: 220,
                }}
              />
              <button
                onClick={handleCreateUnit}
                disabled={creatingUnit}
                style={{
                  padding: "9px 16px",
                  borderRadius: 7,
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13, fontWeight: 600,
                  cursor: creatingUnit ? "wait" : "pointer",
                  opacity: creatingUnit ? 0.6 : 1,
                }}
              >
                {lang === "es" ? "Crear" : lang === "ko" ? "만들기" : "Create"}
              </button>
              {newUnitError && (
                <div style={{
                  width: "100%",
                  fontSize: 11,
                  color: C.red,
                  marginTop: 4,
                }}>
                  {newUnitError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      </>
      )}

      {/* PR6: Close unit confirmation modal (step 1 of close flow) */}
      {closeUnitFlow && closeUnitFlow.step === 1 && (
        <CloseUnitConfirmModal
          open={true}
          unit={closeUnitFlow.unit}
          lang={lang}
          onCancel={() => setCloseUnitFlow(null)}
          onContinue={() => setCloseUnitFlow({ ...closeUnitFlow, step: 2 })}
        />
      )}

      {/* PR6: Reopen unit modal (single step) */}
      {reopenUnit && (
        <ReopenUnitModal
          open={true}
          unit={reopenUnit}
          lang={lang}
          onCancel={() => setReopenUnit(null)}
          onConfirm={() => {
            setReopenUnit(null);
            invalidateClassPage();
          }}
        />
      )}

      {/* Edit class modal */}
      {showEditModal && classObj && (
        <EditClassModal
          classObj={classObj}
          unitsCount={units.length}
          decksCount={decks.length}
          t={editModalT}
          onClose={() => setShowEditModal(false)}
          onSaved={handleClassSaved}
          onDeleted={handleClassDeleted}
        />
      )}

      {/* PR 27: students modal — list of all students who joined this
          class, with avatars, names, joined dates, and Remove buttons. */}
      {classObj && (
        <StudentsModal
          open={showStudentsModal}
          classId={classObj.id}
          className={classObj.name}
          lang={lang}
          onClose={() => setShowStudentsModal(false)}
        />
      )}

      {/* First-visit guided tour — units (the gap) + sharing the code with students. */}
      {classObj && !loading && (
        <CleoTour tourId="classDetail" lang={lang} userId={profile?.id} enabled={profile?.role === "teacher"} />
      )}

      <style>{`
        .cl-deck-row:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(0,0,0,.05);
        }
        /* Color picker swatches: subtle lift on hover so it's clear which one
           the cursor is over. The ring expands to a soft shadow so it works
           on both colored swatches and the dashed "auto" tile. */
        .cl-color-swatch {
          transition: transform .12s ease, box-shadow .15s ease, filter .15s ease;
        }
        .cl-color-swatch:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,.18);
          filter: brightness(1.08);
        }
        .cl-color-swatch:active {
          transform: translateY(0);
        }
        .cl-color-swatch-auto:hover {
          filter: none;
          box-shadow: 0 2px 6px rgba(0,0,0,.08);
        }
        /* Unit chips: soft hover so the click target feels alive without
           changing the active state visually. */
        .cl-unit-chip {
          transition: filter .12s ease, transform .12s ease, box-shadow .12s ease;
        }
        .cl-unit-chip:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }
        .cl-unit-chip:active {
          transform: translateY(0);
        }
        /* Group toggle button: subtle background tint on hover so the
           whole header row feels clickable, not just the chevron. */
        .cl-unit-group-toggle:hover {
          background: rgba(0,0,0,.03) !important;
        }
        @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .ns-fade { animation: ns-fadeIn .25s ease; }
      `}</style>
    </div>
  );
}
