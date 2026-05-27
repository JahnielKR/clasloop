import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTeacherClasses, useTeacherClassesCache } from "../hooks/useClasses";
import { CIcon, SchoolIcon } from "../components/Icons";
import { useIsMobile } from "../components/MobileMenuButton";
import CreateClassModal from "../components/CreateClassModal";
import ImportClassModal from "../components/ImportClassModal";
// PR 22: theme selector modal launched from each class card
import LobbyThemeSelector from "../components/LobbyThemeSelector";
import { C, R, MONO } from "../components/tokens";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import { ROUTES, QUERY, buildPathWithOpts, buildRoute } from "../routes";
import { resolveClassAccent } from "../lib/class-hierarchy";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// PR 77: i18n centralizado
import { useT } from "../i18n";
import TwoColPage from "../components/TwoColPage";
import MyClassesRail from "./MyClasses.rail";
import { countPendingReviewsForTeacher } from "../lib/notifications";
import CleoTour from "../onboarding/CleoTour";
import { useJourney } from "../onboarding/useJourney";
import { setJourneyLeg, isJourneyActive, finishJourney } from "../onboarding/journey";
import { useTourLaunch } from "../onboarding/useTourLaunch";

// ─── i18n ────────────────────────────────────────────────────────────────
// PR 77: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "myClassesTeacher".

// ─── Class Card ─────────────────────────────────────────────────────────
function ClassCard({ cls, t, lang, onOpen, onOpenThemeSelector, deckCount = 0, studentCount = 0, highlight = false }) {
  const [copied, setCopied] = useState(false);
  const accent = resolveClassAccent(cls);

  const handleCopy = async (e) => {
    e.stopPropagation(); // don't trigger card open
    try {
      await navigator.clipboard.writeText(cls.class_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // Fallback: select text in a temp input
      const ta = document.createElement("textarea");
      ta.value = cls.class_code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      catch (_) { /* clipboard API + execCommand both unavailable; nothing to do */ }
      document.body.removeChild(ta);
    }
  };

  return (
    <Card
      as="div"
      hover
      accent={accent}
      padding={18}
      onClick={onOpen}
      className={highlight ? "cl-class-card-new cl-class-card-glow" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: "'Outfit',sans-serif",
      }}
    >
      {/* Header: icon + name + meta */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 1px 3px ${accent}33`,
        }}>
          <CIcon name="school" size={20} inline color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.25, wordBreak: "break-word" }}>
            {cls.name}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
            {cls.subject} · {cls.grade}
          </div>
        </div>
      </div>

      {/* Class code pill — the centerpiece */}
      <div
        style={{
          background: accent + "10",
          border: `1px dashed ${accent}55`,
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {t.code}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 700,
              color: accent,
              letterSpacing: ".03em",
              lineHeight: 1.1,
              marginTop: 2,
              userSelect: "all",
            }}
          >
            {cls.class_code}
          </div>
        </div>
        <button
          onClick={handleCopy}
          aria-label={t.copyCode}
          title={copied ? t.copied : t.copyCode}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: copied ? C.green : C.bg,
            color: copied ? "#fff" : accent,
            border: copied ? "none" : `1px solid ${accent}55`,
            cursor: "pointer",
            transition: "background .15s ease, color .15s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {copied ? (
            <CIcon name="check" size={14} inline />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
              <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Footer: deck/student counts + theme button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        paddingTop: 4,
        fontSize: 12,
        color: C.textSecondary,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <CIcon name="book" size={12} inline /> {deckCount} {deckCount === 1 ? t.deck : t.decks}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          {/* Inline 'users' SVG — no equivalent in CIcon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
            <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
            <path d="M14 18c0-2.5 1.7-4.5 4-4.5s4 2 4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          </svg>
          {studentCount} {studentCount === 1 ? t.student : t.students}
        </span>

        {/* PR 22: Theme button. stopPropagation so clicking it doesn't
            also trigger onOpen (which navigates into the class). */}
        {onOpenThemeSelector && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenThemeSelector(); }}
            title={t.themeButton || "Theme"}
            style={{
              marginLeft: "auto",
              padding: "3px 9px",
              borderRadius: 6,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              transition: "border-color .15s ease, color .15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.color = accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <circle cx="13.5" cy="6.5" r="2.5" fill="currentColor"/>
              <circle cx="19" cy="13" r="2.5" fill="currentColor"/>
              <circle cx="6" cy="12" r="2.5" fill="currentColor"/>
              <circle cx="10" cy="20" r="2.5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2.5-1.1 2.5-2.5 0-.7-.3-1.3-.7-1.8-.4-.4-.6-1-.6-1.6 0-1.4 1.1-2.5 2.5-2.5h2.4c2.5 0 4.5-2 4.5-4.5C22 6.5 17.5 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            {t.themeButton || "Theme"}
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Sortable wrapper ───────────────────────────────────────────────────
// PR 18: thin wrapper that adds drag-to-reorder. We keep ClassCard
// untouched (same props, same render) and just give the outer div the
// transform/transition styles needed by @dnd-kit/sortable.
//
// The whole card is the drag handle — the teacher just grabs the card.
// PointerSensor's 8px activation distance prevents accidental drags
// from a click that opens the class.
function SortableClassCard(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.cls.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    // Lift the dragged card above siblings during the drag animation
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ClassCard {...props} />
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────
export default function MyClassesTeacher({ lang = "en", profile, onNavigateToSessions, onOpenMobileMenu }) {
  const t = useT("myClassesTeacher", lang);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  // PR 170b (M1): classes + per-class deck/student counts now come from one
  // cached React Query (src/hooks/useClasses.js). Mutations below patch the
  // cache via patchClasses, preserving the previous optimistic list updates.
  const userId = profile?.id;
  const { data: classesData, isPending: loading } = useTeacherClasses(userId);
  const classes = classesData?.classes ?? [];
  const deckCounts = classesData?.deckCounts ?? {};
  const studentCounts = classesData?.studentCounts ?? {};
  const { patchClasses } = useTeacherClassesCache(userId);
  // Pending free-text reviews across the teacher's classes — surfaced in the
  // rail with a shortcut to /review. Reuses the same lib helper as the sidebar
  // badge (cheap head-count, RLS-scoped).
  const [pendingReviews, setPendingReviews] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    countPendingReviewsForTeacher(userId)
      .then((n) => { if (!cancelled) setPendingReviews(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Guided journey (leg 1): jHome spotlights "create a class" and opens the
  // modal; creating the class advances the journey to the unit leg.
  const { leg: journeyLegId } = useJourney(profile?.id);
  const homeLaunch = useTourLaunch("home"); // chat: "show me how to create a class"
  const [showImportModal, setShowImportModal] = useState(false);
  // PR 22: when non-null, the LobbyThemeSelector modal is open for this class
  const [themeSelectorClass, setThemeSelectorClass] = useState(null);
  // Highlight + toast for the freshly-created class so the teacher's eye lands
  // on it immediately (the new card animates in at the top of the grid, but
  // a quick visual cue makes "I just made this" obvious).
  const [justCreatedId, setJustCreatedId] = useState(null);
  const [toast, setToast] = useState(null); // { message, code? } | null

  // PR 18: DnD sensors for drag-to-reorder. PointerSensor needs a small
  // activation distance so a click on the card (to open the class) doesn't
  // accidentally trigger a drag. 8px is a comfortable threshold.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // PR 18: Handle drag end — reorder local state optimistically, then
  // persist the new positions to the DB. Failures don't roll back the UI
  // (last-write-wins is acceptable for ordering).
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = classes.findIndex(c => c.id === active.id);
    const newIndex = classes.findIndex(c => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(classes, oldIndex, newIndex);
    // Reassign positions to match new index. Simpler than trying to
    // only update affected rows — the array is small (1-15 classes).
    const withPositions = reordered.map((c, i) => ({ ...c, position: i }));
    patchClasses(withPositions);

    // Persist in parallel. We update only the rows whose position changed
    // to minimize DB writes.
    const updates = withPositions
      .map((c, i) => {
        const oldC = classes.find(o => o.id === c.id);
        if (!oldC || oldC.position === i) return null;
        return supabase
          .from("classes")
          .update({ position: i })
          .eq("id", c.id);
      })
      .filter(Boolean);

    try {
      await Promise.all(updates);
    } catch (_) {
      // Soft fail — the optimistic UI already shows the new order. On
      // next reload the DB state is authoritative.
    }
  };

  // Auto-dismiss toast (5s when it carries a class code, 3s otherwise so the
  // teacher has time to read the code before it disappears).
  useEffect(() => {
    if (!toast) return;
    const ms = toast.code ? 5000 : 3000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  // PR 170b: classes + counts now load via useTeacherClasses() (src/hooks/
  // useClasses.js); React Query owns loading + caching. Mutations patch the cache.

  // ?createClass=1 — open the modal directly. Comes from the legacy
  // /sessions?createClass=1 redirect (and any old links/bookmarks that still
  // point there). Consumed once and cleared from the URL.
  useEffect(() => {
    if (searchParams.get(QUERY.CREATE_CLASS) === "1") {
      setShowCreateModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete(QUERY.CREATE_CLASS);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleNewClass = () => {
    setShowCreateModal(true);
  };

  const handleClassCreated = async (newClass) => {
    // First-ever class? Flow straight into building its first warmup — the deck
    // editor's guided tour takes over from there. This restores the "create my
    // first warmup" momentum the welcome used to kick off. Only fires for the
    // very first class; later ones stay on this list.
    const isFirstClass = classes.length === 0;
    // PR 18: new classes go at the END (max position + 1) so they don't
    // disturb the teacher's existing drag-ordered arrangement.
    patchClasses(prev => {
      const maxPos = prev.reduce((m, c) => Math.max(m, c.position || 0), -1);
      const nextPos = maxPos + 1;
      // Patch the new class with its position locally so the optimistic
      // render shows it at the end too.
      const patched = { ...newClass, position: nextPos };
      // Persist position to the DB asynchronously (don't block UI).
      supabase.from("classes")
        .update({ position: nextPos })
        .eq("id", newClass.id)
        .then(() => {});
      return [...prev, patched];
    });
    setShowCreateModal(false);
    if (isFirstClass) {
      // First class → open it. During the guided journey, advance to the unit
      // leg so jUnit arms on the class page (clase → unidad → warmup → …).
      if (isJourneyActive(profile?.id)) {
        setJourneyLeg(profile?.id, "unit", { classId: newClass.id });
      }
      navigate(buildRoute.classDetail(newClass.id));
      return;
    }
    setJustCreatedId(newClass.id);
    setToast({
      message: `${t.classCreated} ${newClass.class_code}`,
      code: newClass.class_code,
    });
    // Drop the highlight after a few seconds so it doesn't linger.
    setTimeout(() => setJustCreatedId(null), 4500);
  };

  const handleOpenClass = (cls) => {
    // Phase 1: open the dedicated class page with section tabs (warmups /
    // exit tickets / general review). The old behavior of jumping to
    // /decks?class=<id> is kept reachable from a "All decks" link in the
    // class page if needed later — for now the class page is the home for
    // anything inside a class.
    navigate(buildRoute.classDetail(cls.id));
  };

  // ─── Empty state ────────────────────────────────────────────────────
  const renderEmpty = () => (
    <div className="ns-fade" style={{ maxWidth: 520, margin: "40px auto" }}>
      <EmptyState
        icon={<SchoolIcon size={40} active={true} />}
        title={t.noClassesYet}
        body={t.noClassesSub}
        actionLabel={t.createFirst}
        onAction={handleNewClass}
        actionVariant="gradient"
      />
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────
  // Uses the shared PageHeader (subtitle + actions slot) at 1100px so it lines
  // up with the cards grid below. On wide screens TwoColPage adds an overview
  // rail in the right gutter — the cards stay capped at 1100, unchanged.
  const studentTotal = Object.values(studentCounts).reduce((a, b) => a + b, 0);
  const deckTotal = Object.values(deckCounts).reduce((a, b) => a + b, 0);
  // Classes missing material (no decks) or members (no students) feed the rail's
  // "needs attention" list. Decks-empty takes priority when both are empty.
  const needsAttention = classes
    .filter((c) => (deckCounts[c.id] || 0) === 0 || (studentCounts[c.id] || 0) === 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      reasonText: (deckCounts[c.id] || 0) === 0 ? t.railNoDecks : t.railNoStudents,
    }));

  return (
    <div style={{ padding: isMobile ? "16px 14px 32px" : "20px 28px 40px" }}>
      <TwoColPage
        mainMax={1100}
        railWidth={320}
        maxWidth={1448}
        collapseAt={1660}
        rail={!loading && classes.length > 0 ? (
          <MyClassesRail
            t={t}
            classCount={classes.length}
            studentTotal={studentTotal}
            deckTotal={deckTotal}
            pendingReviews={pendingReviews}
            onOpenReview={() => navigate(ROUTES.REVIEW)}
            needsAttention={needsAttention}
            onOpenClass={(id) => navigate(buildRoute.classDetail(id))}
          />
        ) : null}
      >
      <PageHeader
        title={t.pageTitle}
        subtitle={t.subtitle}
        maxWidth={1100}
        lang={lang}
        onOpenMobileMenu={onOpenMobileMenu}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              title={t.schoolAnalytics}
              onClick={() => navigate(ROUTES.SCHOOL)}
              leftIcon={<CIcon name="chart" size={13} inline />}
            >
              {isMobile ? null : t.schoolAnalytics}
            </Button>
            {/* Import — opens the real import modal (file picker → preview →
                confirm). The flow lives in ImportClassModal + lib/class-import.js. */}
            <Button
              variant="secondary"
              size="sm"
              title={t.importClass}
              onClick={() => setShowImportModal(true)}
              leftIcon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            >
              {isMobile ? null : t.importClass}
            </Button>
            {/* Brand signature CTA — the one gradient on this screen. */}
            <Button variant="gradient" size="sm" onClick={handleNewClass} data-tour="new-class">
              {t.newClass}
            </Button>
          </>
        }
      />

      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={150} radius={14} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        renderEmpty()
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={classes.map(c => c.id)} strategy={rectSortingStrategy}>
            <div
              className="ns-fade"
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
                marginTop: 12,
              }}
            >
              {classes.map(cls => (
                <SortableClassCard
                  key={cls.id}
                  cls={cls}
                  t={t}
                  lang={lang}
                  deckCount={deckCounts[cls.id] || 0}
                  studentCount={studentCounts[cls.id] || 0}
                  onOpen={() => handleOpenClass(cls)}
                  onOpenThemeSelector={() => setThemeSelectorClass(cls)}
                  highlight={cls.id === justCreatedId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      </TwoColPage>

      {/* Create class modal — lives here so the create flow stays in the
          teacher's home (no detour to Sessions). */}
      {showCreateModal && (
        <CreateClassModal
          userId={userId}
          t={t}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleClassCreated}
        />
      )}

      {/* Import class modal — file picker → preview → confirm. The flow
          and DB calls live inside ImportClassModal + lib/class-import.js;
          we just hand it the i18n it needs and a callback to navigate
          when the new class is ready. */}
      {showImportModal && (
        <ImportClassModal
          userId={userId}
          t={{
            title: t.import_title,
            description: t.import_description,
            pickFile: t.import_pickFile,
            changeFile: t.import_changeFile,
            cancel: t.import_cancel,
            close: t.import_close,
            previewTitle: t.import_previewTitle,
            className: t.import_className,
            classNamePlaceholder: t.import_classNamePlaceholder,
            willImport: t.import_willImport,
            unitsCount: t.import_unitsCount,
            decksCount: t.import_decksCount,
            fromOriginal: t.import_fromOriginal,
            importButton: t.import_importButton,
            importing: t.import_importing,
            errorReadFile: t.import_errorReadFile,
            errorParseJson: t.import_errorParseJson,
            errorEmptyName: t.import_errorEmptyName,
            errorImportFailed: t.import_errorImportFailed,
            errorWrongSchema: t.import_errorWrongSchema,
            errorNoClass: t.import_errorNoClass,
            errorTooManyUnits: t.import_errorTooManyUnits,
            errorTooManyDecks: t.import_errorTooManyDecks,
            errorInvalidGeneric: t.import_errorInvalidGeneric,
          }}
          onClose={() => setShowImportModal(false)}
          onImported={(insertedClass) => {
            // PR 18: same as handleClassCreated — imported classes get
            // the next available position so they don't disturb the
            // teacher's existing drag order.
            patchClasses(prev => {
              const maxPos = prev.reduce((m, c) => Math.max(m, c.position || 0), -1);
              const nextPos = maxPos + 1;
              const patched = { ...insertedClass, position: nextPos };
              supabase.from("classes")
                .update({ position: nextPos })
                .eq("id", insertedClass.id)
                .then(() => {});
              return [...prev, patched];
            });
            setJustCreatedId(insertedClass.id);
            setShowImportModal(false);
            setToast({
              message: (t.importedToast || "Imported \"{name}\" — code {code}")
                .replace("{name}", insertedClass.name)
                .replace("{code}", insertedClass.class_code),
              code: insertedClass.class_code,
            });
            setTimeout(() => setJustCreatedId(null), 4500);
          }}
        />
      )}

      {/* Toast — bottom-right. Carries the new class code for ~5s after
          creation so the teacher can dictate it before the visual settles. */}
      {toast && (
        <div
          className="ns-fade"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            background: C.green, color: "#fff",
            padding: "10px 16px", borderRadius: 10,
            fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", gap: 8,
            maxWidth: "calc(100vw - 48px)",
          }}
        >
          <CIcon name="check" size={14} inline />
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes cl-class-pop {
          0%   { transform: scale(.96); opacity: 0; }
          60%  { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); }
        }
        .cl-class-card-new { animation: cl-class-pop .35s cubic-bezier(.4,1.6,.5,1) both; }
        @keyframes cl-class-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(35,131,226,0); }
          50%      { box-shadow: 0 0 0 4px rgba(35,131,226,.18); }
        }
        .cl-class-card-glow { animation: cl-class-glow 1.6s ease-in-out 2; }
        @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .ns-fade { animation: ns-fadeIn .25s ease; }
        @keyframes cl-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .cl-class-card-new, .cl-class-card-glow, .ns-fade { animation: none; }
        }
      `}</style>

      {/* PR 22: Theme selector modal. Opens when the teacher clicks the
          Theme button on any class card. On save, updates the class's
          lobby_theme locally so the change is immediate. */}
      {themeSelectorClass && (
        <LobbyThemeSelector
          classId={themeSelectorClass.id}
          currentTheme={themeSelectorClass.lobby_theme || "calm"}
          className={themeSelectorClass.name}
          lang={lang}
          onClose={() => setThemeSelectorClass(null)}
          onSaved={(newTheme) => {
            patchClasses(prev => prev.map(c =>
              c.id === themeSelectorClass.id
                ? { ...c, lobby_theme: newTheme }
                : c
            ));
          }}
        />
      )}

      {/* Guided journey, leg 1: spotlight "create a class", then open the modal.
          Armed only while the journey sits on the "home" leg. */}
      <CleoTour
        tourId="jHome"
        lang={lang}
        userId={profile?.id}
        enabled={profile?.role === "teacher" && journeyLegId === "home"}
        autoStart={journeyLegId === "home"}
        force
        onComplete={() => setShowCreateModal(true)}
        onSkip={() => finishJourney(profile?.id)}
      />
      {/* Standalone first-visit tour (non-journey teachers + chat replay).
          Suppressed while the journey is running so the two don't compete. */}
      <CleoTour
        tourId="home"
        lang={lang}
        userId={profile?.id}
        enabled={profile?.role === "teacher" && !isJourneyActive(profile?.id)}
        autoStart={homeLaunch.autoStart}
        force={homeLaunch.force}
      />
    </div>
  );
}
