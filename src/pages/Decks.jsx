import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useDecksPage, useDecksCache } from "../hooks/useDecks";
import { useQueryClient } from "@tanstack/react-query";
import { classPageKey, teacherClassesKey } from "../hooks/useClasses";
import { useSearchParams, useNavigate, useMatch } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { DeckCover, SUBJ_ICON, SUBJ_COLOR, resolveColor, colorTint, DECK_COLORS } from "../lib/deck-cover";
import { analyzeDerivation } from "../lib/deck-derivation";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import SectionBadge, { sectionAccent } from "../components/SectionBadge";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import { MONO } from "../components/tokens";
import { C, css } from "./Decks/styles";
import CreateDeckEditor from "./Decks/CreateDeckEditor";
// PR 113: draggable deck-card family extracted to Decks/DeckTiles.jsx.
// Only DeckRow is consumed here (by ClassDecksView).
import { DeckRow } from "./Decks/DeckTiles";
import { ROUTES, QUERY, buildRoute } from "../routes";
// PR 98: lazy-load PDFExportModal. El modal solo se renderiza cuando el
// teacher clickea "Download PDF" en una tarjeta — antes el chunk de
// Decks arrastraba jsPDF + 4 archivos pdf-styles + qrcode + (a través de
// dynamic import interno) la fuente coreana. Ahora el chunk Decks queda
// puro UI + supabase, y el stack PDF se baja on-demand.
//
// Los 3 imports legacy (exportExamPDF, exportAnswerKeyPDF, exportPDF)
// eran dead imports — nunca se llamaron en este archivo. Removidos.
const PDFExportModal = lazy(() => import("../components/PDFExportModal"));
// PR 79: i18n centralizado
import { useT } from "../i18n";
// PR 7: drag-to-reorder decks within a unit. Same dnd-kit setup as the
// old All-decks view in ClassPage (which is still in the file as dead
// code from PR 5). We re-implement here rather than extracting into a
// shared component because the wiring is small and the contexts differ
// (Library reorders within unit-section pairs across multiple classes).
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
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "../lib/toast";

const GRADES = ["6th-7th", "7th-8th", "8th-9th", "9th-10th", "10th-11th", "11th-12th"];

// Input/select styling for the list-view filters. The editor has its own
// copy in CreateDeckEditor.jsx — we don't share to avoid coupling the two
// files through a tiny utility module.
import { inputStyle as inp, selectStyle as sel } from "../components/forms/field-styles";


// PR 79: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "decks".


const LangBadge = ({ lang }) => {
  const l = { en: "EN", es: "ES", ko: "한" };
  const c = { en: C.accent, es: C.orange, ko: C.green };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: (c[lang] || C.accent) + "14", color: c[lang] || C.accent }}>{l[lang] || lang}</span>;
};

// ─── Create Deck Editor ─────────────────────────────
// ─── Live preview of a deck card while editing ──────────────────────────────
export default function Decks({ lang: pageLang = "en", setLang: pageSetLang, onNavigateToSessions, onOpenMobileMenu, profile = null }) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  // Subview is derived from the URL:
  //   /decks                  → view="list"
  //   /decks/new              → view="create" (with optional ?class= for prefilled)
  //   /decks/:deckId/edit     → view="edit"
  // Browser back navigates between these naturally.
  const navigate = useNavigate();
  const editMatch = useMatch("/decks/:deckId/edit");
  const newMatch = useMatch("/decks/new");
  const editingId = editMatch?.params?.deckId || null;
  const view = editingId ? "edit" : (newMatch ? "create" : "list");
  const [tab, setTab] = useState("myDecks"); // myDecks | favorites
  // PR 170a (M1): the Decks page data (classes, decks, units, favorites) is now
  // one cached React Query — see src/hooks/useDecks.js. The four datasets and
  // userId come from `pageData`; mutations patch the cache via patchMyDecks /
  // patchFavorites below, preserving the previous optimistic list updates.
  const { data: pageData, isLoading: loading } = useDecksPage();
  const userId = pageData?.userId ?? null;
  // Memoized so the `?? []` fallback doesn't hand out a fresh array every
  // render (which would thrash effect deps + child re-renders). React Query
  // returns a stable `pageData` ref until the cache changes.
  const userClasses = useMemo(() => pageData?.userClasses ?? [], [pageData]);
  const myDecks = useMemo(() => pageData?.myDecks ?? [], [pageData]);
  const allUnits = useMemo(() => pageData?.allUnits ?? [], [pageData]);
  const favoriteDecks = useMemo(() => pageData?.favoriteDecks ?? [], [pageData]);
  const { patchMyDecks, patchFavorites } = useDecksCache();
  const queryClient = useQueryClient();
  // Creating/editing a deck that belongs to a class makes that class's ClassPage
  // deck list and the Classes-list deck count (separate cached queries) stale.
  // Invalidate both so returning to either view reflects the change instead of
  // serving cache for up to its staleTime (~30s). No-op for class-less decks.
  const invalidateClassCaches = (classId) => {
    if (!classId) return;
    queryClient.invalidateQueries({ queryKey: classPageKey(classId) });
    queryClient.invalidateQueries({ queryKey: teacherClassesKey(userId) });
  };
  // The editing deck object. Derived from editingId + the loaded myDecks list.
  // This used to be standalone state; now it's a function of the URL + data.
  const editing = editingId ? (myDecks.find(d => d.id === editingId) || null) : null;
  // When the teacher clicks "+ Create deck" inside an empty class group, we
  // remember which class so the editor can pre-fill it. Read from ?class=
  // in URL when entering /decks/new (the same param has a different meaning
  // on /decks list — there it's the focus hint consumed by the effect below).
  // Favorite deck currently being customized (= copied to My Decks).
  // When set, we render a class-picker modal to choose the destination class.
  const [customizingFav, setCustomizingFav] = useState(null);
  // Organization controls
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState(""); // "" = all
  const [filterClass, setFilterClass] = useState("");     // "" = all
  const [groupBy, setGroupBy] = useState("class");        // class | subject | none
  const [expandedGroups, setExpandedGroups] = useState({}); // { groupKey: true } — collapsed by default
  // PR 7: active class tab in the new Library layout. null = no class
  // selected yet; once classes load, the first one is auto-selected.
  // Special value "favorites" shows the favorites tab.
  const [activeClassTab, setActiveClassTab] = useState(null);
  // PR 7: search input for the new Library top bar. Filters across all
  // visible decks of the active class (title, tags, subject).
  const [librarySearch, setLibrarySearch] = useState("");
  // PR 7: dragging deck id (for DragOverlay rendering during drag)
  const [activeDragDeckId, setActiveDragDeckId] = useState(null);
  // PR 7.1: which unit groups are collapsed in Library. Default empty
  // (all expanded on entry). Lives in memory only — on next visit to
  // Library everything is expanded again. Per teacher feedback: "when
  // you go to library [units] are open like now, [but] you can hide if
  // you want". The set is keyed by a string: unit.id for normal units,
  // "__general__" for the general-reviews group, "__unassigned__" for
  // the orphan group.
  const [collapsedUnits, setCollapsedUnits] = useState(new Set());
  const toggleCollapsed = (key) => {
    setCollapsedUnits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const t = useT("decks", l);

  // PR 170a: auto-select the first class as the active tab once classes load
  // (was inline in the old loadData). Re-runs harmlessly while data is empty.
  useEffect(() => {
    if (userClasses.length > 0 && activeClassTab === null) {
      setActiveClassTab(userClasses[0].id);
    }
  }, [userClasses, activeClassTab]);

  // Cross-page navigation hint via URL search param: ?class=<id>. When
  // arriving from "Create class" in Sessions we get a focusClassId so we can
  // show the teacher exactly where their new class lives. We switch to
  // grouped-by-class and expand that class's group + scroll to it — but we
  // DON'T set filterClass, so all classes stay visible (otherwise the screen
  // would only show the new class and feel empty). The param is consumed
  // once and removed from the URL with replace=true so refresh / back /
  // forward don't re-trigger the focus.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get(QUERY.CLASS);
    if (!id) return;
    // CRITICAL: this effect is for the LIST view of /decks (focus a class
    // group on arrival from Sessions). It must NOT run when we're on
    // /decks/new — there, ?class= is the prefill the editor reads, and
    // stripping it would silently break "+ New warmup" coming from
    // ClassPage. Same for /decks/:id/edit which doesn't use ?class= at
    // all but we guard anyway. Detection mirrors the `view` derivation
    // below: newMatch / editMatch from useMatch.
    if (newMatch || editMatch) return;
    setTab("myDecks");
    setGroupBy("class");
    setExpandedGroups(prev => ({ ...prev, [id]: true }));
    // Strip the param so it doesn't keep firing this effect.
    const next = new URLSearchParams(searchParams);
    next.delete(QUERY.CLASS);
    setSearchParams(next, { replace: true });
    // Scroll into view shortly after render
    setTimeout(() => {
      const el = document.querySelector(`[data-group-id="${id}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get(QUERY.CLASS), newMatch, editMatch]);

  // PR 170a: the old loadData (classes → decks → units → favorites) now lives
  // in useDecksPage() (src/hooks/useDecks.js) as one cached React Query, so
  // React Query owns loading + caching. Mutations below patch that cache.

  // Toggle favorite (remove). For adding, the action happens in Community.
  const handleRemoveFavorite = async (deckId) => {
    if (!userId) return;
    await supabase.from("saved_decks").delete()
      .eq("student_id", userId).eq("deck_id", deckId);
    patchFavorites(prev => prev.filter(d => d.id !== deckId));
  };

  // "Customize" a favorite — INSERT a personal copy into `decks` with
  // copied_from_id pointing back to the original. The favorite stays in
  // saved_decks so the user can keep it as inspiration if they want.
  // Mirrors the same flow Community uses, but launched from the Favorites tab.
  const handleCustomizeFavorite = async (deck, classId) => {
    if (!userId) return;
    const cls = classId ? userClasses.find(c => c.id === classId) : null;
    const { data: inserted, error } = await supabase.from("decks").insert({
      author_id: userId, class_id: classId || null,
      title: deck.title, description: deck.description,
      subject: cls?.subject || deck.subject, grade: cls?.grade || deck.grade,
      language: deck.language, questions: deck.questions, tags: deck.tags, is_public: false,
      cover_color: deck.cover_color, cover_icon: deck.cover_icon, cover_image_url: deck.cover_image_url,
      copied_from_id: deck.id,
    }).select().single();
    if (error) {
      console.error("customize favorite failed", error);
      return;
    }
    // Bump uses_count on the original (same behavior as Community's save flow)
    await supabase.from("decks").update({ uses_count: (deck.uses_count || 0) + 1 }).eq("id", deck.id);
    // Add the new copy to MyDecks state so the user sees it in My Decks
    // immediately without a refetch.
    patchMyDecks(prev => [inserted, ...prev]);
    invalidateClassCaches(inserted.class_id);
    setCustomizingFav(null);
    setTab("myDecks"); // bounce them into My Decks where their copy lives now
    // Open the editor on the fresh copy so they can immediately personalize it.
    // The view derives from the URL, so navigating is enough — `editing` will
    // be re-derived from myDecks by the find() above.
    navigate(buildRoute.deckEdit(inserted.id));
  };

  // Deck deletion uses a styled ConfirmDialog (not native confirm). handleDelete
  // just opens it; performDelete does the work once the teacher confirms. (The
  // tile/card delete buttons no longer confirm themselves — that double-prompt
  // was the bug; the parent owns the single, styled confirm.)
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const handleDelete = (deckId) => setPendingDeleteId(deckId);
  const performDelete = async () => {
    const deckId = pendingDeleteId;
    if (!deckId) return;
    setDeleting(true);
    await supabase.from("decks").delete().eq("id", deckId);
    patchMyDecks(prev => prev.filter(d => d.id !== deckId));
    setDeleting(false);
    setPendingDeleteId(null);
  };

  const handleTogglePublic = async (deck) => {
    const newPublic = !deck.is_public;

    // Un-publishing is always allowed.
    if (!newPublic) {
      await supabase.from("decks").update({ is_public: false, is_adapted: false }).eq("id", deck.id);
      patchMyDecks(prev => prev.map(d => d.id === deck.id ? { ...d, is_public: false, is_adapted: false } : d));
      return;
    }

    // Publishing — gate it if this is a copy of someone else's deck.
    let isAdapted = false;
    if (deck.copied_from_id) {
      const { data: original, error: origErr } = await supabase
        .from("decks")
        .select("questions")
        .eq("id", deck.copied_from_id)
        .maybeSingle();

      if (origErr) {
        console.error("Failed to load original for derivation check:", origErr);
        toast.error(t.publishBlockedLowEffort, { reportError: origErr, context: { source: "Decks.publish.derivation" } });
        return;
      }

      if (original) {
        const result = analyzeDerivation(original.questions, deck.questions);
        if (!result.canPublish) {
          toast.error(
            result.status === "identical"
              ? t.publishBlockedIdentical
              : t.publishBlockedLowEffort
          );
          return;
        }
        isAdapted = result.showAdaptedBadge;
      } else {
        // We have a copied_from_id but can't read the original (deleted, or
        // RLS blocking). Safe default: assume derivative.
        isAdapted = true;
      }
    }

    await supabase.from("decks").update({ is_public: true, is_adapted: isAdapted }).eq("id", deck.id);
    patchMyDecks(prev => prev.map(d => d.id === deck.id ? { ...d, is_public: true, is_adapted: isAdapted } : d));
  };

  // PR 7: drag-to-reorder within (class, unit, section). The teacher can
  // reshuffle decks in a row to change their order. Updates `position`
  // on each affected deck. Reorder happens optimistically — local state
  // updates instantly, server catches up. If the supabase call fails the
  // local change stands (last-write-wins is acceptable here; a deck's
  // position is a UI hint, not a strong invariant).
  const handleReorderDeck = async (decksInRow, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const reordered = arrayMove(decksInRow, fromIndex, toIndex);
    // Apply new positions: position = index in the reordered list.
    const updates = reordered.map((d, i) => ({ id: d.id, position: i }));
    // Optimistic local update first.
    patchMyDecks(prev => prev.map(d => {
      const u = updates.find(x => x.id === d.id);
      return u ? { ...d, position: u.position } : d;
    }));
    // Server update — one row at a time. For typical row size (5-15
    // decks) this is fast enough and avoids needing a stored procedure.
    for (const u of updates) {
      await supabase.from("decks").update({ position: u.position }).eq("id", u.id);
    }
  };

  // PR 8: PDF download. Two flavors — exam (student-facing, well laid
  // out, with name field, ready to print) and answer-key (teacher-only,
  // bare-bones list of answers). The deck's class is needed for the
  // header ("Spanish 9th"), so we look it up from userClasses.
  // Errors surface via alert; jsPDF doesn't have an in-band failure
  // mode that's easy to recover from, and these failures are rare.
  //
  // PR 29.1: PDF download flow uses a modal selector now (instead of the
  // popover with two buttons). The teacher picks style + variant + sees
  // a preview before committing to the download. Sticky style choice
  // is kept in localStorage by the modal itself.
  //
  // handleDownloadPdf now just opens the modal — the actual export
  // happens inside the modal's "Download" button via exportPDF.
  const [pdfModalState, setPdfModalState] = useState(null);
  const handleDownloadPdf = (deck, kind) => {
    setPdfModalState({ deck, kind });
  };
  const closePdfModal = () => setPdfModalState(null);

  if (view === "create" || view === "edit") {
    // ?class= on /decks/new pre-fills the class in the editor (e.g. clicking
    // "+ Create deck" inside an empty class group). On /decks/:id/edit the
    // existing deck's class wins, so we ignore the param.
    const prefilledClassId = view === "create" ? (searchParams.get(QUERY.CLASS) || null) : null;
    // ?tour=run on /decks/new auto-starts the editor's guided tour (no "want a
    // tour?" prompt). Set by the first-class → first-warmup chain so a brand-new
    // teacher is walked through the deck editor the first real time they see it.
    const autoStartTour = view === "create" && searchParams.get("tour") === "run";
    // ?section= on /decks/new pre-fills the deck's section, used when the
    // teacher clicks "+ New warmup" / "+ New exit ticket" / "+ New review"
    // from inside ClassPage. On edit, existing deck's section wins.
    const prefilledSection = view === "create" ? (searchParams.get("section") || null) : null;
    // PR4: ?unit= on /decks/new pre-fills which unit the deck belongs to.
    // Used when the teacher clicks an empty slot in PlanView — the new
    // deck should land in the active unit at the right (next) position.
    const prefilledUnitId = view === "create" ? (searchParams.get("unit") || null) : null;
    // PR 24.10: ?position= on /decks/new pre-fills which day's slot
    // the new deck is filling. Without this every deck created from
    // PlanView landed at position 0 (Day 1), even if the teacher
    // clicked an empty slot in Day 3.
    const prefilledPositionRaw = view === "create" ? searchParams.get(QUERY.POSITION) : null;
    const prefilledPosition = prefilledPositionRaw && /^\d+$/.test(prefilledPositionRaw)
      ? parseInt(prefilledPositionRaw, 10)
      : null;

    // Edge case: deep-link refresh on /decks/:id/edit before myDecks finished
    // loading. Show the page-level loader and let the next render resolve
    // `editing` from the loaded list.
    if (view === "edit" && loading) {
      return (
        <div style={{ padding: "28px 20px" }}>
          <style>{css}</style>
          <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton height={40} radius={10} />
            <Skeleton height={120} radius={12} />
            <Skeleton height={120} radius={12} />
            <Skeleton height={44} width={160} radius={10} />
          </div>
        </div>
      );
    }
    // Same race-condition guard for create: if we land on /decks/new?class=<id>
    // before userClasses has loaded, the editor would mount with an empty
    // userClasses array and not be able to resolve the class for prefill.
    // Wait for the load to finish before instantiating the editor.
    if (view === "create" && loading && prefilledClassId) {
      return (
        <div style={{ padding: "28px 20px" }}>
          <style>{css}</style>
          <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton height={40} radius={10} />
            <Skeleton height={120} radius={12} />
            <Skeleton height={120} radius={12} />
            <Skeleton height={44} width={160} radius={10} />
          </div>
        </div>
      );
    }
    // Edge case: edit URL points to a deck that doesn't belong to this user
    // or has been deleted. Bounce back to the list.
    if (view === "edit" && !loading && !editing) {
      navigate(ROUTES.DECKS, { replace: true });
      return null;
    }

    // After-create / after-edit destination + back-button destination.
    // PR4.2: when the editor was opened from a class context (the
    // teacher clicked an empty slot in Plan view, or the modal "Create
    // a new one" path), we should return TO THAT CLASS, not to the
    // Library. Library was the editor's only entry point in v1, so a
    // hard-coded ROUTES.DECKS made sense; with Plan view as a primary
    // entry it doesn't anymore.
    //
    // Decision rule: if prefilledClassId is set on a CREATE flow, the
    // teacher came from a class — return there. Otherwise (Library
    // create or any edit flow), return to the Library.
    const returnTo = (view === "create" && prefilledClassId)
      ? buildRoute.classDetail(prefilledClassId)
      : ROUTES.DECKS;

    // Page title — when in the editor, "Library" doesn't make sense
    // (you're not in the library, you're editing a deck). Use a
    // context-appropriate title instead. Falls back to the editor
    // strings already in i18n if defined; else uses sensible defaults.
    const editorTitle = view === "edit"
      ? (t.editDeck || (l === "es" ? "Editar deck" : l === "ko" ? "덱 편집" : "Edit deck"))
      : (t.newDeck  || (l === "es" ? "Nuevo deck"   : l === "ko" ? "새 덱"     : "New deck"));

    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={editorTitle} lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
        <CreateDeckEditor
          t={t} l={l}
          onBack={() => navigate(returnTo)}
          userId={userId}
          userClasses={userClasses}
          existingDeck={editing}
          prefilledClassId={prefilledClassId}
          prefilledSection={prefilledSection}
          prefilledUnitId={prefilledUnitId}
          prefilledPosition={prefilledPosition}
          profile={profile}
          autoStartTour={autoStartTour}
          onNeedClass={() => navigate(ROUTES.CLASSES)}
          onCreated={(d) => {
            if (editing) patchMyDecks(prev => prev.map(dk => dk.id === d.id ? d : dk));
            else patchMyDecks(prev => [d, ...prev]);
            invalidateClassCaches(d?.class_id);
            // First-warmup flow → land on the class page with a celebration so
            // they can see + launch their new warmup. Otherwise normal return.
            if (autoStartTour && d?.class_id) {
              navigate(`${buildRoute.classDetail(d.class_id)}?celebrate=1`);
            } else {
              navigate(returnTo);
            }
          }}
        />
      </div>
    );
  }

  // ── Filtering and grouping logic ─────────────────────────────────────────
  const sourceDecks = tab === "myDecks" ? myDecks : favoriteDecks;

  // Apply search + filters
  const filteredDecks = sourceDecks.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      const hay = [d.title, d.description, ...(d.tags || [])].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterSubject && d.subject !== filterSubject) return false;
    if (filterClass) {
      if (filterClass === "__unassigned__") {
        if (d.class_id) return false;
      } else {
        if (d.class_id !== filterClass) return false;
      }
    }
    return true;
  });

  // Build groups based on groupBy. Returns [{ key, label, decks }, ...]
  const buildGroups = () => {
    if (groupBy === "none") return [{ key: "all", label: null, decks: filteredDecks }];
    if (groupBy === "class") {
      const byClass = new Map();
      filteredDecks.forEach(d => {
        const key = d.class_id || "__unassigned__";
        if (!byClass.has(key)) byClass.set(key, []);
        byClass.get(key).push(d);
      });
      const result = [];
      // For "My Decks" we show every class the teacher owns — even empty ones —
      // so newly-created classes are visible immediately and a + CTA appears
      // inside, telling the teacher exactly where to add their first deck.
      // For "Favorites", only show classes that actually have matching decks
      // (empty placeholder doesn't make sense for borrowed decks).
      const showEmptyClasses = tab === "myDecks";
      userClasses.forEach(c => {
        // Sublabel includes the class code so the teacher can dictate it to
        // students directly from this page (My Classes is the canonical home,
        // but Decks is where the teacher spends most of their time).
        const subl = `${c.subject} · ${c.grade}${c.class_code ? ` · ${c.class_code}` : ""}`;
        if (byClass.has(c.id)) {
          result.push({ key: c.id, label: c.name, sublabel: subl, icon: SUBJ_ICON[c.subject] || "book", decks: byClass.get(c.id), classObj: c });
        } else if (showEmptyClasses) {
          // Skip empty classes if a search/filter narrowed results — would be misleading
          // to show "0 decks" when really the empty state is from filtering.
          const isFiltered = !!search || !!filterSubject || (!!filterClass && filterClass !== c.id);
          if (!isFiltered) {
            result.push({ key: c.id, label: c.name, sublabel: subl, icon: SUBJ_ICON[c.subject] || "book", decks: [], classObj: c, isEmpty: true });
          }
        }
      });
      if (byClass.has("__unassigned__")) {
        result.push({ key: "__unassigned__", label: t.filterUnassigned, sublabel: null, icon: "other", decks: byClass.get("__unassigned__") });
      }
      // Favorites tab: decks belong to OTHER teachers' classes — those won't match userClasses.
      // Push any leftover class_ids as "Other" buckets keyed by class_id.
      byClass.forEach((decks, key) => {
        if (key === "__unassigned__") return;
        if (!userClasses.find(c => c.id === key)) {
          result.push({ key: `other-${key}`, label: null, sublabel: null, icon: "other", decks });
        }
      });
      // Merge any "other" leftovers into a single bucket if multiple
      const others = result.filter(g => g.key.startsWith("other-"));
      if (others.length > 0) {
        const mergedDecks = others.flatMap(g => g.decks);
        const filtered = result.filter(g => !g.key.startsWith("other-"));
        filtered.push({ key: "other", label: t.filterUnassigned, sublabel: null, icon: "other", decks: mergedDecks });
        return filtered;
      }
      return result;
    }
    if (groupBy === "subject") {
      const bySubject = new Map();
      filteredDecks.forEach(d => {
        const key = d.subject || "Other";
        if (!bySubject.has(key)) bySubject.set(key, []);
        bySubject.get(key).push(d);
      });
      return Array.from(bySubject.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([subj, decks]) => ({
        key: subj, label: subj, sublabel: null, icon: SUBJ_ICON[subj] || "book", decks
      }));
    }
    return [];
  };
  const groups = buildGroups();

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Reusable deck row renderer ───────────────────────────────────────────
  // opts: { isFav } — true when rendering a favorite (read-only deck owned by
  // someone else). Copies (decks I made by copying from another teacher) are
  // editable like any other "my deck" — we just show a small "from X" pill.
  const renderDeckRow = (dk, i, opts = {}) => {
    const qs = dk.questions || [];
    const cls = userClasses.find(c => c.id === dk.class_id);
    const accent = resolveColor(dk);
    const isFav = opts.isFav;
    const isCopy = !isFav && !!dk.copied_from_id;
    // Original author name. For copies (deck in MyDecks copied from someone),
    // we joined `originals(profiles(full_name))`. For favorites, the deck row
    // already has profiles(full_name).
    const originalAuthor = isCopy ? dk.originals?.profiles?.full_name : (isFav ? dk.profiles?.full_name : null);
    return (
      <div
        key={dk.id}
        className="dk-card fade-up"
        onClick={isFav ? () => setCustomizingFav(dk) : undefined}
        style={{
          background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${accent}`,
          padding: 14, paddingLeft: 14,
          animationDelay: `${i * .04}s`,
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 10 : 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <DeckCover deck={dk} size={52} radius={10} />
            <div
              style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
              onClick={isFav ? undefined : () => navigate(buildRoute.deckEdit(dk.id))}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dk.title}</span>
                {/* Section badge — visible identity for warmup vs exit ticket
                    vs general review. Sits inline with the title so the role
                    is visible at the same scan as the deck name. The schema
                    guarantees deck.section is always one of the three values,
                    so this always renders something. */}
                <SectionBadge section={dk.section} lang={pageLang} />
                {isCopy && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: C.purpleSoft, color: C.purple, border: `1px solid ${C.purple}` }}>
                    ⧉ {t.badgeCopy}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {dk.subject} · {dk.grade} · {qs.length} {t.questionCount}
                {cls && <> · <strong style={{ color: C.accent }}>{cls.name}</strong></>}
                {originalAuthor && <> · {t.fromTeacher} <strong>{originalAuthor}</strong></>}
                {" · "}<LangBadge lang={dk.language} />
              </div>
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: 6,
            justifyContent: isMobile ? "flex-end" : "flex-start",
            flexShrink: 0,
            flexWrap: "wrap",
          }}>
            {isFav ? (
              <>
                <button
                  className="dk-fav-customize"
                  onClick={(e) => { e.stopPropagation(); setCustomizingFav(dk); }}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: C.accentSoft, color: C.accent,
                    border: `1px solid ${C.accent}33`, cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                  title={t.customizeFavHint}
                >
                  <CIcon name="sparkle" size={12} inline /> {t.customizeFav}
                </button>
                <button
                  className="dk-fav-remove"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(dk.id); }}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: C.bg, color: C.textMuted,
                    border: `1px solid ${C.border}`, cursor: "pointer",
                    fontSize: 14, lineHeight: 1,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                  title={t.favoriteRemove}
                >×</button>
              </>
            ) : (
              <>
                <button className="dk-btn-secondary" onClick={() => handleTogglePublic(dk)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bgSoft, color: dk.is_public ? C.green : C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{dk.is_public ? t.public : t.private}</button>
                {/* Per-deck aggregated stats. We render this even for
                    decks with zero responses — the page itself surfaces
                    "no data yet". The button is always discoverable so
                    teachers learn the affordance exists. */}
                <Button variant="secondary" size="sm" onClick={() => navigate(buildRoute.deckResults(dk.id))} title={t.results || "Results"} leftIcon={<CIcon name="chart" size={11} inline />}>
                  {t.results || "Results"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate(buildRoute.deckEdit(dk.id))}>{t.edit}</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(dk.id)}>{t.delete}</Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Subject options for filter (collected from decks themselves so we don't show empty subjects)
  const allSubjects = Array.from(new Set(sourceDecks.map(d => d.subject).filter(Boolean))).sort();

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={900} onOpenMobileMenu={onOpenMobileMenu} />

      {pendingDeleteId && (
        <ConfirmDialog
          title={t.deleteConfirm}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          variant="danger"
          loading={deleting}
          onConfirm={performDelete}
          onCancel={() => { if (!deleting) setPendingDeleteId(null); }}
        />
      )}

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* PR 7: Library — class tabs + drag-reorder grid by unit
            Top bar mirrors ClassPage's structure (Current/Past/Upcoming)
            but at one level up: it's a tab per class. The teacher picks
            which class they're browsing; the rest of the screen shows
            that class's units with their decks (warmups + exits mixed,
            general reviews kept separate, drag to reorder within a row).

            Top bar layout, left to right:
              [Spanish 1] [Spanish 3] [Math 10] [Favorites]  |  [Search...]
            With "Favorites" as the rightmost class tab (it isn't a
            class but it lives at the same nav level conceptually:
            another bucket of decks). Search input on the far right
            filters whatever class tab is active. */}

        {loading ? (
          // Skeleton placeholder while the library loads — without this the
          // hard-empty state below flashes for a frame before data resolves.
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} width={90} height={34} radius={8} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={150} radius={12} />)}
            </div>
          </>
        ) : userClasses.length === 0 && favoriteDecks.length === 0 ? (
          // Hard empty state — no classes AND no favorites. Surface a
          // primary action to nudge the teacher to create their first
          // class (which is where decks come from).
          <EmptyState
            icon={<CIcon name="library" size={48} />}
            title={t.libraryEmptyTitle}
            body={t.libraryEmptyHint}
            style={{ maxWidth: 480, margin: "20px auto 0" }}
          />
        ) : (
          <>
            {/* Top tabs bar — class tabs + Favorites + Search input */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 18,
              background: C.bgSoft,
              padding: 4,
              borderRadius: 9,
              flexWrap: "wrap",
            }}>
              {userClasses.map(c => {
                const active = activeClassTab === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setActiveClassTab(c.id); setLibrarySearch(""); }}
                    style={{
                      padding: "7px 13px",
                      borderRadius: 7,
                      background: active ? C.bg : "transparent",
                      color: active ? C.text : C.textSecondary,
                      border: "none",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      cursor: "pointer",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                      transition: "background .12s ease, color .12s ease",
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
              {/* Favorites tab — only shown if the teacher has any favorites */}
              {favoriteDecks.length > 0 && (
                <>
                  <div style={{
                    width: 1, height: 22,
                    background: C.border,
                    margin: "0 4px",
                  }} />
                  <button
                    onClick={() => { setActiveClassTab("favorites"); setLibrarySearch(""); }}
                    style={{
                      padding: "7px 13px",
                      borderRadius: 7,
                      background: activeClassTab === "favorites" ? C.bg : "transparent",
                      color: activeClassTab === "favorites" ? C.text : C.textSecondary,
                      border: "none",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 13, fontWeight: activeClassTab === "favorites" ? 600 : 500,
                      cursor: "pointer",
                      boxShadow: activeClassTab === "favorites" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                      transition: "background .12s ease, color .12s ease",
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    ★ {t.favoritesTab}
                    <span style={{
                      fontSize: 10.5, fontFamily: MONO,
                      padding: "1px 6px", borderRadius: 9,
                      color: C.textMuted,
                      fontWeight: 600,
                    }}>{favoriteDecks.length}</span>
                  </button>
                </>
              )}
              {/* Search input on the far right of the bar */}
              <div style={{
                flex: 1,
                minWidth: 180,
                maxWidth: 260,
                marginLeft: "auto",
              }}>
                <input
                  type="text"
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  style={{
                    width: "100%",
                    padding: "7px 11px",
                    borderRadius: 7,
                    border: `1px solid ${librarySearch ? C.accent : C.border}`,
                    background: C.bg,
                    fontSize: 12.5,
                    fontFamily: "'Inter', sans-serif",
                    color: C.text,
                    outline: "none",
                    transition: "border-color .12s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
                  onBlur={e => { if (!librarySearch) e.currentTarget.style.borderColor = C.border; }}
                />
              </div>
            </div>

            {/* Active class content */}
            {activeClassTab === "favorites" ? (
              <FavoritesGrid
                decks={favoriteDecks}
                search={librarySearch}
                t={t}
                lang={l}
                onCustomize={(d) => setCustomizingFav(d)}
                onRemove={handleRemoveFavorite}
              />
            ) : activeClassTab ? (
              <ClassDecksView
                classId={activeClassTab}
                classObj={userClasses.find(c => c.id === activeClassTab)}
                allUnits={allUnits}
                allDecks={myDecks}
                search={librarySearch}
                t={t}
                lang={l}
                isMobile={isMobile}
                navigate={navigate}
                onEdit={(d) => navigate(buildRoute.deckEdit(d.id))}
                onDelete={handleDelete}
                onTogglePublic={handleTogglePublic}
                onReorder={handleReorderDeck}
                onDownloadPdf={handleDownloadPdf}
                activeDragDeckId={activeDragDeckId}
                setActiveDragDeckId={setActiveDragDeckId}
                collapsedUnits={collapsedUnits}
                toggleCollapsed={toggleCollapsed}
              />
            ) : null}
          </>
        )}
      </div>

      {/* Customize favorite modal — class picker. The user is taken into the
          editor immediately after picking a class (or "no class"), so this is
          a quick decision rather than a config form. */}
      {customizingFav && (
        <div
          onClick={() => setCustomizingFav(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 20,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg, borderRadius: 14, padding: 24,
              maxWidth: 420, width: "100%",
              maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{t.addToWhichFav}</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>{customizingFav.title}</p>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{t.customizeFavHint}</p>

            {userClasses.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textMuted, padding: "12px 8px", textAlign: "center", marginBottom: 8 }}>
                {t.noClassesYetFav}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {userClasses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCustomizeFavorite(customizingFav, c.id)}
                    style={{
                      padding: 12, borderRadius: 10,
                      background: C.bg, border: `1px solid ${C.border}`,
                      textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10,
                      fontFamily: "'Outfit',sans-serif", cursor: "pointer",
                    }}
                  >
                    <CIcon name={SUBJ_ICON[c.subject] || "book"} size={20} inline />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{c.subject} · {c.grade}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => handleCustomizeFavorite(customizingFav, null)}
              style={{
                width: "100%", padding: 10, borderRadius: 8,
                fontSize: 13, fontWeight: 500,
                background: C.bgSoft, color: C.textSecondary,
                border: `1px solid ${C.border}`, cursor: "pointer",
                fontFamily: "'Outfit',sans-serif", marginBottom: 8,
              }}
            >{t.noClassFav}</button>
            <button
              onClick={() => setCustomizingFav(null)}
              style={{
                width: "100%", padding: 10, borderRadius: 8,
                fontSize: 13, fontWeight: 500,
                background: "transparent", color: C.textMuted,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t.cancel}</button>
          </div>
        </div>
      )}

      {/* PR 29.1: PDF export modal — appears when handleDownloadPdf is
          called. Single instance, mounted at the root so it can overlay
          any view (library, class decks, favorites). */}
      {pdfModalState && (
        // PR 98: Suspense para el lazy chunk del modal. fallback=null
        // evita un flicker visible mientras se descarga (el modal está
        // por aparecer a pantalla completa, un null transiente es OK).
        <Suspense fallback={null}>
          <PDFExportModal
            deck={pdfModalState.deck}
            classObj={userClasses.find(c => c.id === pdfModalState.deck.class_id) || null}
            lang={pdfModalState.deck.language || l}
            initialVariant={pdfModalState.kind === "answers" ? "answers" : "exam"}
            onClose={closePdfModal}
            C={C}
            userId={profile?.id}
          />
        </Suspense>
      )}
    </div>
  );
}

// ─── ClassDecksView ────────────────────────────────────────────────────
//
// Shows all decks for a single class, grouped by unit, with section
// rows inside each unit. Drag within a row reorders. Click on a deck
// opens edit. Decks have inline action buttons (edit, delete, publish).
//
// Layout:
//   Unit 1 — Verbo hacer    [Active]  5 decks
//     warmup ▸ ⊙ ⊙ ⊙ ⊙
//     exit ▸    ⊙ ⊙ ⊙
//
//   Unit 2 — Pretérito      [Planned]  3 decks
//     warmup ▸ ⊙ ⊙
//     exit ▸    ⊙
//
//   General reviews (no unit)
//     ⊙ ⊙ ⊙
//
//   Unassigned decks (if any have unit_id=null and section ≠ general_review)
//     warmup ▸ ⊙
//     exit ▸    ⊙
function ClassDecksView({
  classId, classObj, allUnits, allDecks, search,
  t, lang, isMobile, navigate,
  onEdit, onDelete, onTogglePublic, onReorder, onDownloadPdf,
  activeDragDeckId, setActiveDragDeckId,
  collapsedUnits, toggleCollapsed,
}) {
  // Filter to this class
  const classDecks = allDecks.filter(d => d.class_id === classId);
  const classUnits = allUnits.filter(u => u.class_id === classId);

  // Apply search filter (title / tags / subject)
  const q = (search || "").trim().toLowerCase();
  const filteredDecks = q
    ? classDecks.filter(d => {
        const title = (d.title || "").toLowerCase();
        const tags = (d.tags || []).join(" ").toLowerCase();
        const subject = (d.subject || "").toLowerCase();
        return title.includes(q) || tags.includes(q) || subject.includes(q);
      })
    : classDecks;

  // Group by unit
  const generalReviews = filteredDecks
    .filter(d => d.section === "general_review")
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const unitGroups = classUnits.map(u => ({
    unit: u,
    warmups: filteredDecks
      .filter(d => d.unit_id === u.id && d.section === "warmup")
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    exits: filteredDecks
      .filter(d => d.unit_id === u.id && d.section === "exit_ticket")
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
  }));
  // Unassigned: decks with no unit_id and section ≠ general_review
  const unassignedWarmups = filteredDecks
    .filter(d => !d.unit_id && d.section === "warmup")
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const unassignedExits = filteredDecks
    .filter(d => !d.unit_id && d.section === "exit_ticket")
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const totalDecks = filteredDecks.length;

  if (totalDecks === 0) {
    return (
      <div style={{
        padding: "32px 20px",
        background: C.bgSoft,
        border: `1px dashed ${C.border}`,
        borderRadius: 10,
        textAlign: "center",
        color: C.textMuted,
        fontSize: 13,
        lineHeight: 1.5,
      }}>
        {q ? t.noSearchMatch : t.noDecksInClass}
      </div>
    );
  }

  const handleDragEnd = (rowDecks) => (event) => {
    const { active, over } = event;
    setActiveDragDeckId(null);
    if (!over || active.id === over.id) return;
    const fromIndex = rowDecks.findIndex(d => d.id === active.id);
    const toIndex = rowDecks.findIndex(d => d.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    onReorder(rowDecks, fromIndex, toIndex);
  };

  return (
    <>
      {/* Unit groups */}
      {unitGroups.map(({ unit, warmups, exits }) => {
        if (warmups.length === 0 && exits.length === 0) return null;
        const totalInUnit = warmups.length + exits.length;
        const isCollapsed = collapsedUnits.has(unit.id);
        return (
          <div key={unit.id} style={{ marginBottom: 28 }}>
            {/* Unit header — clickable to toggle collapse */}
            <button
              onClick={() => toggleCollapsed(unit.id)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "4px 0",
                marginBottom: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                flexWrap: "wrap",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              {/* Chevron — rotates 90° when collapsed.
                  CSS transform animates the rotation. */}
              <span style={{
                display: "inline-block",
                width: 14,
                fontSize: 11,
                color: C.textMuted,
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)",
                transition: "transform .15s ease",
                lineHeight: 1,
                flexShrink: 0,
                alignSelf: "center",
              }}>▾</span>
              <h3 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15, fontWeight: 700,
                color: C.text,
                letterSpacing: "-0.005em",
                margin: 0,
              }}>
                {unit.name}
              </h3>
              <span style={{
                fontSize: 10.5, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "2px 7px", borderRadius: 4,
                background: unit.status === "active" ? C.greenSoft : unit.status === "closed" ? C.bgSoft : C.bgSoft,
                color: unit.status === "active" ? C.green : unit.status === "closed" ? C.textMuted : C.textSecondary,
              }}>
                {unit.status === "active" ? (lang === "es" ? "Activa" : lang === "ko" ? "활성" : "Active")
                  : unit.status === "closed" ? (lang === "es" ? "Cerrada" : lang === "ko" ? "종료" : "Closed")
                  : (lang === "es" ? "Planeada" : lang === "ko" ? "예정" : "Planned")}
              </span>
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
                {totalInUnit} {totalInUnit === 1 ? t.deckSingular : t.deckPlural}
              </span>
            </button>

            {/* Collapsible content */}
            {!isCollapsed && (
              <>
                {/* Warmups row */}
                {warmups.length > 0 && (
                  <DeckRow
                    decks={warmups}
                    section="warmup"
                    t={t} lang={lang} isMobile={isMobile} navigate={navigate}
                    onEdit={onEdit} onDelete={onDelete} onTogglePublic={onTogglePublic} onDownloadPdf={onDownloadPdf}
                    onDragEnd={handleDragEnd(warmups)}
                  />
                )}
                {/* Exit tickets row */}
                {exits.length > 0 && (
                  <DeckRow
                    decks={exits}
                    section="exit_ticket"
                    t={t} lang={lang} isMobile={isMobile} navigate={navigate}
                    onEdit={onEdit} onDelete={onDelete} onTogglePublic={onTogglePublic} onDownloadPdf={onDownloadPdf}
                    onDragEnd={handleDragEnd(exits)}
                  />
                )}
              </>
            )}
          </div>
        );
      })}

      {/* General reviews — outside the unit-day plan */}
      {generalReviews.length > 0 && (() => {
        const isCollapsed = collapsedUnits.has("__general__");
        return (
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => toggleCollapsed("__general__")}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "4px 0",
              marginBottom: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <span style={{
              display: "inline-block",
              width: 14,
              fontSize: 11,
              color: C.textMuted,
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)",
              transition: "transform .15s ease",
              lineHeight: 1,
              flexShrink: 0,
              alignSelf: "center",
            }}>▾</span>
            <h3 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15, fontWeight: 700,
              color: C.text,
              margin: 0,
            }}>
              {t.generalReviewsTitle}
            </h3>
            <span style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
              {generalReviews.length} {generalReviews.length === 1 ? t.deckSingular : t.deckPlural}
            </span>
          </button>
          {!isCollapsed && (
            <DeckRow
              decks={generalReviews}
              section="general_review"
              t={t} lang={lang} isMobile={isMobile} navigate={navigate}
              onEdit={onEdit} onDelete={onDelete} onTogglePublic={onTogglePublic} onDownloadPdf={onDownloadPdf}
              onDragEnd={handleDragEnd(generalReviews)}
            />
          )}
        </div>
        );
      })()}

      {/* Unassigned (decks with no unit) */}
      {(unassignedWarmups.length > 0 || unassignedExits.length > 0) && (() => {
        const isCollapsed = collapsedUnits.has("__unassigned__");
        const total = unassignedWarmups.length + unassignedExits.length;
        return (
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => toggleCollapsed("__unassigned__")}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "4px 0",
              marginBottom: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <span style={{
              display: "inline-block",
              width: 14,
              fontSize: 11,
              color: C.textMuted,
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)",
              transition: "transform .15s ease",
              lineHeight: 1,
              flexShrink: 0,
              marginTop: 4,
            }}>▾</span>
            <div style={{ flex: 1 }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: 10,
              }}>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15, fontWeight: 700,
                  color: C.text,
                  margin: 0,
                }}>
                  {t.unassignedTitle}
                </h3>
                <span style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
                  {total} {total === 1 ? t.deckSingular : t.deckPlural}
                </span>
              </div>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0" }}>
                {t.unassignedHint}
              </p>
            </div>
          </button>
          {!isCollapsed && (
            <>
              {unassignedWarmups.length > 0 && (
                <DeckRow
                  decks={unassignedWarmups}
                  section="warmup"
                  t={t} lang={lang} isMobile={isMobile} navigate={navigate}
                  onEdit={onEdit} onDelete={onDelete} onTogglePublic={onTogglePublic} onDownloadPdf={onDownloadPdf}
                  onDragEnd={handleDragEnd(unassignedWarmups)}
                />
              )}
              {unassignedExits.length > 0 && (
                <DeckRow
                  decks={unassignedExits}
                  section="exit_ticket"
                  t={t} lang={lang} isMobile={isMobile} navigate={navigate}
                  onEdit={onEdit} onDelete={onDelete} onTogglePublic={onTogglePublic} onDownloadPdf={onDownloadPdf}
                  onDragEnd={handleDragEnd(unassignedExits)}
                />
              )}
            </>
          )}
        </div>
        );
      })()}
    </>
  );
}

// ─── FavoritesGrid ─────────────────────────────────────────────────────
//
// Simple grid of favorite decks (the ones the teacher saved from
// Community). No drag (favorites don't have unit/position assignment),
// no inline edit (you can't edit someone else's deck — you "customize"
// which copies it to your own decks).
function FavoritesGrid({ decks, search, t, lang, onCustomize, onRemove }) {
  const [pendingRemove, setPendingRemove] = useState(null);
  const q = (search || "").trim().toLowerCase();
  const filtered = q
    ? decks.filter(d => {
        const title = (d.title || "").toLowerCase();
        const tags = (d.tags || []).join(" ").toLowerCase();
        const subject = (d.subject || "").toLowerCase();
        return title.includes(q) || tags.includes(q) || subject.includes(q);
      })
    : decks;

  if (filtered.length === 0) {
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
        {q ? t.noSearchMatch : t.noFavorites}
      </div>
    );
  }

  return (
    <>
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 10,
    }}>
      {filtered.map(deck => {
        const stripe = sectionAccent(deck.section);
        const qs = deck.questions || [];
        const author = deck.profiles?.full_name;
        return (
          <div key={deck.id} style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderTop: `3px solid ${stripe}`,
            borderRadius: 8,
            padding: "10px 12px 12px",
          }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 600,
              color: C.text,
              lineHeight: 1.3,
              marginBottom: 4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 32,
            }}>
              {deck.title}
            </div>
            <div style={{
              fontSize: 11, color: C.textMuted,
              marginBottom: 8,
            }}>
              <span style={{ fontFamily: MONO }}>{qs.length}q</span>
              {author && <> · by {author}</>}
            </div>
            <div style={{
              display: "flex", gap: 4,
              paddingTop: 8,
              borderTop: `1px solid ${C.border}`,
            }}>
              <button
                onClick={() => onCustomize(deck)}
                title={t.customizeFavHint}
                style={{
                  flex: 1,
                  padding: "5px 6px",
                  borderRadius: 5,
                  background: C.accentSoft,
                  color: C.accent,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {t.customizeFav}
              </button>
              <button
                onClick={() => setPendingRemove(deck)}
                title={t.removeFav}
                style={{
                  flex: "0 0 auto",
                  minWidth: 30,
                  padding: "6px 8px",
                  borderRadius: 5,
                  background: "transparent",
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1,
                  // PR 7.2 fix: hover wasn't lighting up red like the
                  // delete button in DeckTile. Match the same handlers
                  // for visual consistency between the two grids.
                  transition: "border-color .12s ease, color .12s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
    {pendingRemove && (
      <ConfirmDialog
        title={t.confirmRemoveFav}
        confirmLabel={t.removeFav}
        cancelLabel={t.cancel}
        variant="danger"
        onConfirm={() => { onRemove(pendingRemove.id); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)}
      />
    )}
    </>
  );
}
