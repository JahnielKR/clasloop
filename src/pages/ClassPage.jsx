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

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { DeckCover, resolveColor as resolveDeckColor } from "../lib/deck-cover";
import { useIsMobile } from "../components/MobileMenuButton";
import { C, MONO } from "../components/tokens";
import { ROUTES, QUERY, buildRoute } from "../routes";
import {
  SECTIONS,
  DEFAULT_SECTION,
  isValidSection,
  sectionLabels,
  CLASS_COLORS,
  resolveClassAccent,
} from "../lib/class-hierarchy";

// ─── i18n ────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    backToMyClasses: "Back to My Classes",
    code: "Code",
    copyCode: "Copy code",
    copied: "Copied!",
    classColor: "Class color",
    autoColor: "Auto",
    auto: "auto",
    editClass: "Edit class",
    classNotFound: "Class not found",
    classNotFoundSub: "It might have been deleted, or the link is wrong.",
    goBack: "Back to My Classes",
    loading: "Loading...",
    countWithSection: "{count} {label} in this class",
    questions: "questions",
    mixed: "Mixed",
    mcq: "MCQ",
    tf: "True/False",
    fill: "Fill in",
    order: "Ordering",
    match: "Matching",
    open: "Open response",
    completion: "Sentence",
    poll: "Poll",
    slider: "Slider",
    edit: "Edit",
    practice: "Practice",
    // Units (Phase 3)
    unitsAll: "All",
    unitsUnsorted: "Unsorted",
    unitNew: "+ Unit",
    unitNamePlaceholder: "Unit name (e.g. Unit 1, Mitosis)",
    unitCreate: "Create",
    unitCancel: "Cancel",
    unitMoveTo: "Move to…",
    unitNoUnitsHint: "Group decks into units (Unit 1, Unit 2…) to keep them organized as you build up.",
    unitErrorEmpty: "Give the unit a name first.",
    unitErrorTooLong: "Keep the name under 60 characters.",
  },
  es: {
    backToMyClasses: "Volver a Mis clases",
    code: "Código",
    copyCode: "Copiar código",
    copied: "¡Copiado!",
    classColor: "Color de la clase",
    autoColor: "Auto",
    auto: "auto",
    editClass: "Editar clase",
    classNotFound: "Clase no encontrada",
    classNotFoundSub: "Puede que haya sido eliminada, o el enlace está mal.",
    goBack: "Volver a Mis clases",
    loading: "Cargando...",
    countWithSection: "{count} {label} en esta clase",
    questions: "preguntas",
    mixed: "Mixto",
    mcq: "MCQ",
    tf: "Verdadero/Falso",
    fill: "Completar",
    order: "Ordenar",
    match: "Emparejar",
    open: "Respuesta abierta",
    completion: "Oración",
    poll: "Encuesta",
    slider: "Slider",
    edit: "Editar",
    practice: "Practicar",
    unitsAll: "Todas",
    unitsUnsorted: "Sin unidad",
    unitNew: "+ Unidad",
    unitNamePlaceholder: "Nombre de unidad (ej. Unidad 1, Mitosis)",
    unitCreate: "Crear",
    unitCancel: "Cancelar",
    unitMoveTo: "Mover a…",
    unitNoUnitsHint: "Agrupa decks en unidades (Unidad 1, Unidad 2…) para mantenerlos organizados a medida que crece la clase.",
    unitErrorEmpty: "Ponle un nombre a la unidad.",
    unitErrorTooLong: "Mantén el nombre bajo 60 caracteres.",
  },
  ko: {
    backToMyClasses: "내 수업으로 돌아가기",
    code: "코드",
    copyCode: "코드 복사",
    copied: "복사됨!",
    classColor: "수업 색상",
    autoColor: "자동",
    auto: "자동",
    editClass: "수업 편집",
    classNotFound: "수업을 찾을 수 없음",
    classNotFoundSub: "삭제되었거나 링크가 잘못되었습니다.",
    goBack: "내 수업으로 돌아가기",
    loading: "로딩 중...",
    countWithSection: "이 수업에 {count}개 {label}",
    questions: "문제",
    mixed: "혼합",
    mcq: "객관식",
    tf: "참/거짓",
    fill: "빈칸 채우기",
    order: "순서",
    match: "짝짓기",
    open: "주관식",
    completion: "문장",
    poll: "투표",
    slider: "슬라이더",
    edit: "편집",
    practice: "연습",
    unitsAll: "전체",
    unitsUnsorted: "미분류",
    unitNew: "+ 단원",
    unitNamePlaceholder: "단원 이름 (예: 1단원, 세포분열)",
    unitCreate: "만들기",
    unitCancel: "취소",
    unitMoveTo: "이동…",
    unitNoUnitsHint: "덱을 단원(1단원, 2단원...)으로 묶으면 정리하기 좋습니다.",
    unitErrorEmpty: "단원 이름을 입력하세요.",
    unitErrorTooLong: "이름은 60자 이내로 작성하세요.",
  },
};

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

// ─── Deck card (within a section) ───────────────────────────────────────
// units: list of {id, name} for the deck's section, used by the Move-to
// dropdown so the teacher can reassign the deck to a different unit
// without leaving the page.
function DeckRow({ deck, accent, t, onOpen, onPractice, units = [], onChangeUnit }) {
  const qs = deck.questions || [];
  const deckAccent = resolveDeckColor(deck) || accent;
  const handleUnitChange = (e) => {
    e.stopPropagation();
    const newId = e.target.value || null;
    if (newId === (deck.unit_id || null)) return;
    onChangeUnit && onChangeUnit(deck, newId);
  };
  return (
    <div
      onClick={onOpen}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${deckAccent}`,
        borderRadius: 10,
        padding: 12,
        cursor: "pointer",
        transition: "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
        fontFamily: "'Outfit',sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      className="cl-deck-row"
    >
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
            in this section. Click events stop-propagation so opening the
            dropdown doesn't trigger the card's onOpen. Native <select> for
            a11y + free mobile picker. */}
        {units.length > 0 && (
          <select
            value={deck.unit_id || ""}
            onChange={handleUnitChange}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
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

// ─── Main export ────────────────────────────────────────────────────────
export default function ClassPage({ lang = "en", profile, classId, onLaunchPractice, onOpenMobileMenu }) {
  const t = i18n[lang] || i18n.en;
  const sLabels = sectionLabels(lang);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [classObj, setClassObj] = useState(null);
  const [decks, setDecks] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);
  // Per-section unit filter. null = "All units" (show every deck in the
  // section, grouped by unit). A specific unit id = show only that unit.
  // "__unsorted__" = show only the decks with unit_id null. Resets when
  // the active section changes (filters from one tab don't bleed into
  // another).
  const [unitFilter, setUnitFilter] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitError, setNewUnitError] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);

  // Hydrate class + its decks + its units. We refetch when classId changes
  // so the page works correctly when a teacher navigates between two classes.
  useEffect(() => {
    if (!classId || !profile?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const [classRes, decksRes, unitsRes] = await Promise.all([
        supabase.from("classes").select("*").eq("id", classId).maybeSingle(),
        supabase.from("decks").select("*").eq("class_id", classId).order("created_at", { ascending: false }),
        supabase.from("units").select("*").eq("class_id", classId).order("position", { ascending: true }),
      ]);
      if (cancelled) return;
      if (!classRes.data) {
        setNotFound(true);
        setClassObj(null);
        setDecks([]);
        setUnits([]);
        setLoading(false);
        return;
      }
      // Defense in depth: a teacher should only be able to land on classes
      // they own. RLS would keep them from mutating, but they could read
      // (anyone-can-read policy) — we still bounce them visually so the URL
      // doesn't act as a peek-into-other-teacher's-class.
      if (classRes.data.teacher_id !== profile.id) {
        setNotFound(true);
        setClassObj(null);
        setDecks([]);
        setUnits([]);
        setLoading(false);
        return;
      }
      setClassObj(classRes.data);
      setDecks(decksRes.data || []);
      setUnits(unitsRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [classId, profile?.id]);

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
    setClassObj({ ...classObj, color_id: newColorId });
    const { error } = await supabase
      .from("classes")
      .update({ color_id: newColorId })
      .eq("id", classObj.id);
    if (error) {
      setClassObj({ ...classObj, color_id: previous });
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
      catch (_) {}
      document.body.removeChild(ta);
    }
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
    // Position = max + 1 within (class, section) so it lands at the end of
    // the chip row. Computing client-side is fine for the small N we expect
    // per section; under serious load we'd switch to a DB trigger.
    const sectionUnits = units.filter(u => u.section === activeSection);
    const nextPos = sectionUnits.length === 0
      ? 0
      : Math.max(...sectionUnits.map(u => u.position || 0)) + 1;
    const { data, error } = await supabase
      .from("units")
      .insert({
        class_id: classObj.id,
        section: activeSection,
        name: trimmed,
        position: nextPos,
      })
      .select()
      .single();
    setCreatingUnit(false);
    if (error || !data) {
      setNewUnitError(error?.message || "Could not create unit");
      return;
    }
    setUnits(prev => [...prev, data]);
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
    setDecks(prev => prev.map(d => d.id === deck.id ? { ...d, unit_id: newUnitId } : d));
    const { error } = await supabase
      .from("decks")
      .update({ unit_id: newUnitId })
      .eq("id", deck.id);
    if (error) {
      // Rollback so the picker goes back to where the deck actually lives.
      setDecks(prev => prev.map(d => d.id === deck.id ? { ...d, unit_id: previous } : d));
    }
  };

  // ── Group decks by section ────────────────────────────────────────────
  // Validates against the schema — anything stored with a stray section
  // (shouldn't happen, but defensive) drops to general_review.
  const decksBySection = SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: [] }), {});
  decks.forEach(d => {
    const sec = isValidSection(d.section) ? d.section : DEFAULT_SECTION;
    decksBySection[sec].push(d);
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
  // unitFilter === null (default)         → show everything in the section
  // unitFilter === "__unsorted__"         → only decks with unit_id null
  // unitFilter === <uuid>                 → only decks with that unit_id
  const filteredDecks = unitFilter === null
    ? activeDecks
    : unitFilter === "__unsorted__"
      ? activeDecks.filter(d => !d.unit_id)
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
      {/* Back link */}
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
          {/* Action icons */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0, position: "relative" }}>
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
            {/* "Edit class" — placeholder for now (full edit modal in Fase 2/4).
                Hidden on mobile to keep the header tight. */}
            {!isMobile && (
              <button
                aria-label={t.editClass}
                title={t.editClass}
                disabled
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  cursor: "not-allowed",
                  opacity: .4,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: C.textMuted,
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

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 16,
        borderBottom: `1px solid ${C.border}`,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {SECTIONS.map(s => (
          <SectionTab
            key={s.id}
            section={s}
            label={sLabels[s.id]?.name || s.id}
            count={(decksBySection[s.id] || []).length}
            active={s.id === activeSection}
            accent={accent}
            onClick={() => setActiveSection(s.id)}
          />
        ))}
      </div>

      {/* Section header: count + new button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
        <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: "'Outfit',sans-serif" }}>
          {t.countWithSection.replace("{count}", String(activeDecks.length)).replace("{label}", activeLabel.toLowerCase())}
        </span>
        <button
          onClick={() => navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classObj.id)}&section=${encodeURIComponent(activeSection)}`)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            background: accent,
            color: "#fff",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            whiteSpace: "nowrap",
            boxShadow: `0 1px 3px ${accent}33`,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 700 }}>+</span>
          {activeNewLabel}
        </button>
      </div>

      {/* Unit filter chips + create-unit button. Shown whenever there's at
          least one unit in the section, OR the teacher hasn't created any
          yet but there are decks (to expose the "+ Unit" affordance). When
          the section is empty AND has no units, hide entirely so the
          empty state of decks is the only message. */}
      {(unitsForSection.length > 0 || activeDecks.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}>
            {/* "All" chip */}
            <button
              onClick={() => setUnitFilter(null)}
              className="cl-unit-chip"
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Outfit',sans-serif",
                background: unitFilter === null ? accent : C.bgSoft,
                color: unitFilter === null ? "#fff" : C.textSecondary,
                border: `1px solid ${unitFilter === null ? accent : C.border}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.unitsAll} <span style={{ opacity: .8, marginLeft: 2 }}>({activeDecks.length})</span>
            </button>
            {/* One chip per unit */}
            {unitsForSection.map(u => {
              const count = activeDecks.filter(d => d.unit_id === u.id).length;
              const isActive = unitFilter === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setUnitFilter(u.id)}
                  className="cl-unit-chip"
                  style={{
                    padding: "5px 11px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'Outfit',sans-serif",
                    background: isActive ? accent : C.bgSoft,
                    color: isActive ? "#fff" : C.textSecondary,
                    border: `1px solid ${isActive ? accent : C.border}`,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={u.name}
                >
                  {u.name} <span style={{ opacity: .8, marginLeft: 2 }}>({count})</span>
                </button>
              );
            })}
            {/* "Unsorted" chip — only show if there are actually unsorted
                decks (otherwise it's just visual noise). */}
            {activeDecks.some(d => !d.unit_id) && unitsForSection.length > 0 && (
              <button
                onClick={() => setUnitFilter("__unsorted__")}
                className="cl-unit-chip"
                style={{
                  padding: "5px 11px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Outfit',sans-serif",
                  background: unitFilter === "__unsorted__" ? C.textSecondary : C.bgSoft,
                  color: unitFilter === "__unsorted__" ? "#fff" : C.textMuted,
                  border: `1px solid ${unitFilter === "__unsorted__" ? C.textSecondary : C.border}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontStyle: "italic",
                }}
              >
                {t.unitsUnsorted} <span style={{ opacity: .8, marginLeft: 2 }}>({activeDecks.filter(d => !d.unit_id).length})</span>
              </button>
            )}
            {/* "+ Unit" button — opens the inline create form. */}
            {!showNewUnit && (
              <button
                onClick={() => { setShowNewUnit(true); setNewUnitError(""); }}
                style={{
                  padding: "5px 11px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Outfit',sans-serif",
                  background: "transparent",
                  color: accent,
                  border: `1px dashed ${accent}66`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.unitNew}
              </button>
            )}
          </div>

          {/* Inline create-unit form. Inputs autofocus so the teacher can
              just type → Enter without grabbing the mouse. */}
          {showNewUnit && (
            <div className="ns-fade" style={{
              marginTop: 8,
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}>
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => { setNewUnitName(e.target.value); if (newUnitError) setNewUnitError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creatingUnit) handleCreateUnit();
                  if (e.key === "Escape") { setShowNewUnit(false); setNewUnitName(""); setNewUnitError(""); }
                }}
                placeholder={t.unitNamePlaceholder}
                autoFocus
                disabled={creatingUnit}
                maxLength={60}
                style={{
                  flex: "1 1 220px",
                  minWidth: 0,
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 13,
                  padding: "7px 11px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background: C.bg,
                  color: C.text,
                  outline: "none",
                }}
              />
              <button
                onClick={handleCreateUnit}
                disabled={creatingUnit || !newUnitName.trim()}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Outfit',sans-serif",
                  background: (creatingUnit || !newUnitName.trim()) ? C.bgSoft : accent,
                  color: (creatingUnit || !newUnitName.trim()) ? C.textMuted : "#fff",
                  border: "none",
                  cursor: (creatingUnit || !newUnitName.trim()) ? "default" : "pointer",
                }}
              >
                {creatingUnit ? "…" : t.unitCreate}
              </button>
              <button
                onClick={() => { setShowNewUnit(false); setNewUnitName(""); setNewUnitError(""); }}
                disabled={creatingUnit}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "'Outfit',sans-serif",
                  background: "transparent",
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  cursor: creatingUnit ? "default" : "pointer",
                }}
              >
                {t.unitCancel}
              </button>
              {newUnitError && (
                <div style={{ flexBasis: "100%", fontSize: 11, color: C.red, fontFamily: "'Outfit',sans-serif" }}>
                  {newUnitError}
                </div>
              )}
            </div>
          )}

          {/* Hint when there are decks but no units yet — soft nudge,
              not a blocker. Disappears as soon as the teacher creates
              their first unit. */}
          {unitsForSection.length === 0 && activeDecks.length > 0 && !showNewUnit && (
            <div style={{
              marginTop: 8,
              fontSize: 11,
              color: C.textMuted,
              fontFamily: "'Outfit',sans-serif",
              fontStyle: "italic",
            }}>
              {t.unitNoUnitsHint}
            </div>
          )}
        </div>
      )}

      {/* Deck list (or empty state) — three modes:
            1. activeDecks empty                      → empty state
            2. unitFilter set or no units exist        → flat grid (filteredDecks)
            3. unitFilter null AND units exist         → grouped by unit */}
      {activeDecks.length === 0 ? (
        <div style={{
          background: C.bg,
          border: `1px dashed ${C.border}`,
          borderRadius: 12,
          padding: "40px 20px",
          textAlign: "center",
          color: C.textMuted,
          fontSize: 13,
          fontFamily: "'Outfit',sans-serif",
        }}>
          {activeEmptyLabel}
        </div>
      ) : groupedByUnit ? (
        <div className="ns-fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {groupedByUnit.map(({ unit, decks: groupDecks }) => (
            <div key={unit ? unit.id : "__unsorted__"}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: unit ? C.text : C.textMuted,
                fontFamily: "'Outfit',sans-serif",
                marginBottom: 8,
                paddingLeft: 2,
                fontStyle: unit ? "normal" : "italic",
              }}>
                {unit ? unit.name : t.unitsUnsorted}
                <span style={{ fontWeight: 500, color: C.textMuted, marginLeft: 6 }}>· {groupDecks.length}</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}>
                {groupDecks.map(deck => (
                  <DeckRow
                    key={deck.id}
                    deck={deck}
                    accent={accent}
                    t={t}
                    units={unitsForSection}
                    onChangeUnit={handleChangeDeckUnit}
                    onOpen={() => navigate(buildRoute.deckEdit(deck.id))}
                    onPractice={() => onLaunchPractice && onLaunchPractice(deck)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredDecks.length === 0 ? (
        <div style={{
          background: C.bg,
          border: `1px dashed ${C.border}`,
          borderRadius: 12,
          padding: "30px 20px",
          textAlign: "center",
          color: C.textMuted,
          fontSize: 12,
          fontFamily: "'Outfit',sans-serif",
        }}>
          —
        </div>
      ) : (
        <div
          className="ns-fade"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {filteredDecks.map(deck => (
            <DeckRow
              key={deck.id}
              deck={deck}
              accent={accent}
              t={t}
              units={unitsForSection}
              onChangeUnit={handleChangeDeckUnit}
              onOpen={() => navigate(buildRoute.deckEdit(deck.id))}
              onPractice={() => onLaunchPractice && onLaunchPractice(deck)}
            />
          ))}
        </div>
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
        @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .ns-fade { animation: ns-fadeIn .25s ease; }
      `}</style>
    </div>
  );
}
