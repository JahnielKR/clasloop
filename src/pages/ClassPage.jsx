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
import EditClassModal from "../components/EditClassModal";
import SectionBadge from "../components/SectionBadge";
import PlanView from "../components/PlanView";
import { C, MONO } from "../components/tokens";
import { ROUTES, QUERY, buildRoute } from "../routes";
import {
  SECTIONS,
  DEFAULT_SECTION,
  isValidSection,
  sectionLabels,
  CLASS_COLORS,
  resolveClassAccent,
  pickActiveUnit,
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
    insights: "Insights",
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
    // Edit class modal
    edit_title: "Edit class",
    edit_save: "Save",
    edit_saving: "Saving...",
    edit_saved: "Saved",
    edit_close: "Close",
    edit_cancel: "Cancel",
    edit_className: "Class name",
    edit_classNamePlaceholder: "e.g. Math 6th Grade",
    edit_classSubject: "Subject",
    edit_classGrade: "Grade",
    edit_classGradePlaceholder: "e.g. 6th, 7th–9th, Mixed",
    edit_exportTitle: "Export",
    edit_exportHelp: "Download a JSON backup of this class — its units and decks. Useful before deleting, or to move content elsewhere.",
    edit_exportButton: "Download as JSON",
    edit_exporting: "Preparing...",
    edit_exportFailed: "Export failed",
    edit_dangerTitle: "Danger zone",
    edit_deleteButton: "Delete class",
    edit_deleteWarningTitle: "This is permanent",
    edit_deleteWarningBody: "This will delete the class, its {units} units, and its {decks} decks. Students will lose access immediately. Download a JSON backup first if you might want this content later.",
    edit_deleteConfirmLabel: "Type the class name to confirm",
    edit_deleteConfirm: "Delete forever",
    edit_deleting: "Deleting...",
    edit_deleteCancel: "Cancel",
    edit_errorEmptyName: "Class name can't be empty.",
    edit_errorSaveFailed: "Could not save changes",
    edit_errorDeleteFailed: "Could not delete class",
    edit_errorTypeMismatch: "Class name doesn't match.",
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
    insights: "Insights",
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
    // Edit class modal
    edit_title: "Editar clase",
    edit_save: "Guardar",
    edit_saving: "Guardando...",
    edit_saved: "Guardado",
    edit_close: "Cerrar",
    edit_cancel: "Cancelar",
    edit_className: "Nombre de la clase",
    edit_classNamePlaceholder: "ej. Matemáticas 6to",
    edit_classSubject: "Materia",
    edit_classGrade: "Grado",
    edit_classGradePlaceholder: "ej. 6to, 7mo–9no, Mixto",
    edit_exportTitle: "Exportar",
    edit_exportHelp: "Descarga un backup JSON de esta clase — sus unidades y decks. Útil antes de eliminar, o para mover el contenido a otro lugar.",
    edit_exportButton: "Descargar como JSON",
    edit_exporting: "Preparando...",
    edit_exportFailed: "Error al exportar",
    edit_dangerTitle: "Zona de peligro",
    edit_deleteButton: "Eliminar clase",
    edit_deleteWarningTitle: "Esto es permanente",
    edit_deleteWarningBody: "Esto eliminará la clase, sus {units} unidades y sus {decks} decks. Los estudiantes perderán acceso de inmediato. Descarga un backup JSON antes si pudieras necesitar este contenido más adelante.",
    edit_deleteConfirmLabel: "Escribe el nombre de la clase para confirmar",
    edit_deleteConfirm: "Eliminar para siempre",
    edit_deleting: "Eliminando...",
    edit_deleteCancel: "Cancelar",
    edit_errorEmptyName: "El nombre no puede estar vacío.",
    edit_errorSaveFailed: "No se pudieron guardar los cambios",
    edit_errorDeleteFailed: "No se pudo eliminar la clase",
    edit_errorTypeMismatch: "El nombre no coincide.",
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
    insights: "인사이트",
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
    // Edit class modal
    edit_title: "수업 편집",
    edit_save: "저장",
    edit_saving: "저장 중...",
    edit_saved: "저장됨",
    edit_close: "닫기",
    edit_cancel: "취소",
    edit_className: "수업 이름",
    edit_classNamePlaceholder: "예: 수학 6학년",
    edit_classSubject: "과목",
    edit_classGrade: "학년",
    edit_classGradePlaceholder: "예: 6학년, 7~9학년, 혼합",
    edit_exportTitle: "내보내기",
    edit_exportHelp: "이 수업의 단원과 덱을 JSON 백업으로 다운로드합니다. 삭제 전이나 다른 곳으로 이동할 때 유용합니다.",
    edit_exportButton: "JSON으로 다운로드",
    edit_exporting: "준비 중...",
    edit_exportFailed: "내보내기 실패",
    edit_dangerTitle: "위험 영역",
    edit_deleteButton: "수업 삭제",
    edit_deleteWarningTitle: "이 작업은 되돌릴 수 없습니다",
    edit_deleteWarningBody: "수업, 단원 {units}개, 덱 {decks}개가 모두 삭제됩니다. 학생들은 즉시 접근을 잃습니다. 나중에 이 콘텐츠가 필요할 수 있다면 먼저 JSON 백업을 다운로드하세요.",
    edit_deleteConfirmLabel: "확인하려면 수업 이름을 입력하세요",
    edit_deleteConfirm: "영구 삭제",
    edit_deleting: "삭제 중...",
    edit_deleteCancel: "취소",
    edit_errorEmptyName: "수업 이름을 입력하세요.",
    edit_errorSaveFailed: "변경 사항을 저장할 수 없습니다",
    edit_errorDeleteFailed: "수업을 삭제할 수 없습니다",
    edit_errorTypeMismatch: "수업 이름이 일치하지 않습니다.",
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
  const t = i18n[lang] || i18n.en;
  const sLabels = sectionLabels(lang);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [classObj, setClassObj] = useState(null);
  const [decks, setDecks] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
  // PR4: view toggle. "plan" → unit-as-protagonist (PlanView), "all" → the
  // existing 3-tabs-by-section grid. Default is decided after data loads:
  // if there's an active unit, default to "plan"; otherwise "all". The
  // teacher can flip with the tabs at the top of the page. We start at
  // null and the data-loaded effect sets the initial value once it knows
  // whether an active unit exists — this avoids a flash of the wrong view.
  const [viewMode, setViewMode] = useState(null);

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
        supabase.from("decks").select("*").eq("class_id", classId).order("position", { ascending: true }).order("created_at", { ascending: false }),
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
      // PR4: pick initial view mode based on whether there's an active
      // unit. We only set viewMode here on the first load (when it's
      // still null) so subsequent re-fetches don't override the
      // teacher's manual choice. If they explicitly switched to "all
      // decks" we respect that.
      if (viewMode === null) {
        const initialActiveUnit = pickActiveUnit(unitsRes.data || []);
        setViewMode(initialActiveUnit ? "plan" : "all");
      }
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

  // ── Edit class modal handlers ─────────────────────────────────────────
  // Saved: merge updated fields into local classObj so the header reflects
  // changes immediately (no refetch needed). The modal stays open with
  // a brief "✓ Saved" flash; the teacher closes manually.
  const handleClassSaved = (updated) => {
    setClassObj(prev => ({ ...prev, ...updated }));
  };

  // Deleted: navigate away. The class row is gone and the cascade has
  // already removed decks/units/members. Going back to /classes lands the
  // teacher on the list, which will refetch on mount.
  const handleClassDeleted = () => {
    setShowEditModal(false);
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
    setDecks(prev => prev.map(d => {
      const u = updates.find(x => x.id === d.id);
      return u ? { ...d, position: u.position } : d;
    }));

    // Persist. Refetch on any error rather than rolling back per-row.
    const results = await Promise.all(
      updates.map(u => supabase.from("decks").update({ position: u.position }).eq("id", u.id))
    );
    const anyError = results.find(r => r.error);
    if (anyError) {
      const { data: fresh } = await supabase
        .from("decks").select("*")
        .eq("class_id", classObj.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      setDecks(fresh || []);
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

      {/* PR4: View toggle — Plan vs All decks. Only shown if the class has
          at least one unit (otherwise "Plan" has nothing to show, and the
          class falls into the legacy 3-tabs-by-section view exclusively).
          The toggle sits ABOVE the section tabs because it's the higher-
          level decision: "am I planning or am I browsing my whole library?"
          Each view has its own internal navigation. */}
      {units.length > 0 && (
        <div style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          background: C.bgSoft,
          padding: 3,
          borderRadius: 8,
          width: "fit-content",
        }}>
          <button
            onClick={() => setViewMode("plan")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
              background: viewMode === "plan" ? C.bg : "transparent",
              color: viewMode === "plan" ? C.text : C.textSecondary,
              border: "none",
              cursor: "pointer",
              boxShadow: viewMode === "plan" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
              transition: "background .12s ease, color .12s ease",
            }}
          >
            ▦ Plan
          </button>
          <button
            onClick={() => setViewMode("all")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
              background: viewMode === "all" ? C.bg : "transparent",
              color: viewMode === "all" ? C.text : C.textSecondary,
              border: "none",
              cursor: "pointer",
              boxShadow: viewMode === "all" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
              transition: "background .12s ease, color .12s ease",
            }}
          >
            ▥ All decks
          </button>
        </div>
      )}

      {/* Plan view path: render PlanView and skip the section tabs / dnd
          grid below. PlanView is its own self-contained component. */}
      {viewMode === "plan" && units.length > 0 && (() => {
        const activeUnit = pickActiveUnit(units);
        if (!activeUnit) return null;
        return (
          <PlanView
            classId={classId}
            decks={decks}
            activeUnit={activeUnit}
            lang={lang}
          />
        );
      })()}

      {/* All-decks view path: the existing 3-tabs-by-section grid with
          dnd-kit reorder. Kept exactly as it was — the Plan view is purely
          additive. Wrapped in a conditional so when viewMode==='plan' the
          tabs and grid disappear. */}
      {viewMode !== "plan" && (
      <>
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

      {/* DndContext wraps the entire listing zone (header + chips + groups
          OR flat grid). Sensors include PointerSensor with a 6px activation
          distance so plain clicks don't accidentally start a drag, plus
          KeyboardSensor for full a11y. closestCenter is the standard
          collision strategy for grid-shaped sortables. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >

      {/* Section header: count + new button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
        <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: "'Outfit',sans-serif" }}>
          {t.countWithSection.replace("{count}", String(activeDecks.length)).replace("{label}", activeLabel.toLowerCase())}
        </span>
        <button
          onClick={() => navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(classObj.id)}&section=${encodeURIComponent(activeSection)}`)}
          className="clp-lift"
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
          {groupedByUnit.map(({ unit, decks: groupDecks }) => {
            // Key for the collapse state — real id for units, sentinel for unsorted.
            const groupKey = unit ? unit.id : "__unsorted__";
            const isCollapsed = collapsedUnits.has(groupKey);
            return (
              <div key={groupKey}>
                {/* Group header is now a button so the whole row is clickable
                    (chevron + name + count). Caret rotates 90° to signal
                    state. Headers default to expanded — collapse is opt-in. */}
                <button
                  onClick={() => toggleUnitCollapsed(groupKey)}
                  aria-expanded={!isCollapsed}
                  className="cl-unit-group-toggle"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "4px 2px",
                    margin: "0 0 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    textAlign: "left",
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: unit ? C.text : C.textMuted,
                    fontStyle: unit ? "normal" : "italic",
                    borderRadius: 6,
                    transition: "background .12s ease",
                  }}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    style={{
                      transition: "transform .15s ease",
                      transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                      flexShrink: 0,
                      color: C.textMuted,
                    }}
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{unit ? unit.name : t.unitsUnsorted}</span>
                  <span style={{ fontWeight: 500, color: C.textMuted, marginLeft: 2 }}>· {groupDecks.length}</span>
                </button>
                {!isCollapsed && (
                  <SortableContext items={groupDecks.map(d => d.id)} strategy={rectSortingStrategy}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 12,
                    }}>
                      {groupDecks.map(deck => (
                        <SortableDeckCard
                          key={deck.id}
                          deck={deck}
                          accent={accent}
                          t={t}
                          lang={lang}
                          units={unitsForSection}
                          onChangeUnit={handleChangeDeckUnit}
                          onOpen={() => navigate(buildRoute.sessionsOptions(deck.id))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            );
          })}
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
        <SortableContext items={filteredDecks.map(d => d.id)} strategy={rectSortingStrategy}>
          <div
            className="ns-fade"
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {filteredDecks.map(deck => (
              <SortableDeckCard
                key={deck.id}
                deck={deck}
                accent={accent}
                t={t}
                lang={lang}
                units={unitsForSection}
                onChangeUnit={handleChangeDeckUnit}
                onOpen={() => navigate(buildRoute.sessionsOptions(deck.id))}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {/* DragOverlay renders a floating preview of the active card while
          a drag is in flight. We pass isOverlay so the card hides its unit
          dropdown and gets a soft shadow. The original card stays in the
          grid (faded via isDragging) so the layout doesn't reflow until
          the drop happens — that's what gives the "cards animate aside"
          feel. dropAnimation set to a snappy duration so the overlay
          settles into its new slot quickly when released. */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeDragDeckId ? (() => {
          const activeDeck = decks.find(d => d.id === activeDragDeckId);
          if (!activeDeck) return null;
          return (
            <DeckCard
              deck={activeDeck}
              accent={accent}
              t={t}
              lang={lang}
              units={unitsForSection}
              isOverlay
            />
          );
        })() : null}
      </DragOverlay>

      </DndContext>
      </>
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
