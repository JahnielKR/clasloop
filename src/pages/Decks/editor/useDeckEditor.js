// ─── useDeckEditor ──────────────────────────────────────────────────────────
// All of CreateDeckEditor's logic, extracted verbatim from the component body.
// The orchestrator (CreateDeckEditor.jsx) now only renders JSX driven by the
// object this hook returns — behavior is byte-for-byte identical, this is a
// pure relocation (no logic changes).

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { TIME_LIMITS } from "../../../lib/time-limits";
import {
  DEFAULT_DECK_COLOR, DEFAULT_DECK_ICON,
  SUBJ_ICON,
} from "../../../lib/deck-cover";
import { uploadDeckCover, deleteDeckCover } from "../../../lib/deck-image-upload";
import { analyzeDerivation } from "../../../lib/deck-derivation";
import { useIsMobile } from "../../../components/MobileMenuButton";
import { DEFAULT_SECTION, isValidSection } from "../../../lib/class-hierarchy";
import { useToast } from "../../../lib/toast";
import { useJourney } from "../../../onboarding/useJourney";
import { useTourLaunch } from "../../../onboarding/useTourLaunch";
import { ACTIVITY_TYPES } from "./constants";

export function useDeckEditor({ t, l, onCreated, userId, userClasses, existingDeck, prefilledClassId = null, prefilledSection = null, prefilledUnitId = null, prefilledPosition = null, profile = null }) {
  const toast = useToast();
  const isMobile = useIsMobile();
  // Guided journey: when the pointer is on the "editor" leg, run the jEditor
  // walkthrough (same anchors as deckEditor, journey copy). Saving advances the
  // journey to the finale (see Decks.jsx onCreated).
  const { leg: journeyLegId } = useJourney(userId);
  const inEditorLeg = journeyLegId === "editor";
  const editorLaunch = useTourLaunch("deckEditor"); // chat: "how does the deck editor work"
  const [title, setTitle] = useState(existingDeck?.title || "");
  const [desc, setDesc] = useState(existingDeck?.description || "");
  // If we're creating fresh AND a class was pre-selected (came from "Add deck"
  // CTA inside an empty class group), copy the class's subject/grade as initial
  // values. The editor will lock these because classId is set.
  const prefilledClass = prefilledClassId ? userClasses.find(c => c.id === prefilledClassId) : null;
  const [subject, setSubject] = useState(existingDeck?.subject || prefilledClass?.subject || "");
  const [grade, setGrade] = useState(existingDeck?.grade || prefilledClass?.grade || "");
  // En deck nuevo arrancamos con idioma vacío para forzar elección consciente
  // antes de generar con AI. Si el deck es existente respetamos su idioma
  // guardado. La UI muestra el placeholder "—" en el selector si está vacío.
  const [deckLang, setDeckLang] = useState(existingDeck?.language || "");
  const [tags, setTags] = useState((existingDeck?.tags || []).join(", "));
  const [classId, setClassId] = useState(existingDeck?.class_id || prefilledClassId || "");
  // Section (warmup / exit_ticket / general_review). Comes from existing deck
  // if editing, from URL ?section= when creating from a section tab in
  // ClassPage, or starts EMPTY otherwise — the teacher must explicitly
  // choose. Defaulting silently to general_review (the v1 behavior) was
  // confusing: teachers would land on the editor not knowing they were
  // committing to a section. Forcing the choice is one extra click that
  // makes the deck's role explicit.
  const initialSection = existingDeck?.section
    || (isValidSection(prefilledSection) ? prefilledSection : null)
    || "";
  const [section, setSection] = useState(initialSection);
  // PR 28.9: when creating a NEW deck, seed `makePublic` from the
  // teacher's default_deck_visibility setting (Settings → Profile tab).
  // Editing an existing deck still keeps the deck's own is_public —
  // the global default is for creation only, and changing it later
  // never silently retroactively flips past decks.
  const [makePublic, setMakePublic] = useState(
    existingDeck
      ? !!existingDeck.is_public
      : profile?.default_deck_visibility === "public"
  );
  const [activityType, setActivityType] = useState(existingDeck?.questions?.[0]?.type || "mcq");
  const [questions, setQuestions] = useState(existingDeck?.questions || []);
  const [saving, setSaving] = useState(false);
  const [coverColor, setCoverColor] = useState(existingDeck?.cover_color || DEFAULT_DECK_COLOR);
  const [coverIcon, setCoverIcon] = useState(existingDeck?.cover_icon || (existingDeck?.subject && SUBJ_ICON[existingDeck.subject]) || DEFAULT_DECK_ICON);
  const [coverImageUrl, setCoverImageUrl] = useState(existingDeck?.cover_image_url || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editorTab, setEditorTab] = useState("general");
  const fileInputRef = useRef(null);

  // Resilient prefill — `userClasses` may arrive AFTER this component mounts
  // (Decks.jsx fetches them in parallel with the route). If subject/grade
  // started empty because prefilledClass was null at mount, fill them in once
  // the class data lands. We only do this for creation-from-prefill, never
  // for an existing deck (whose values are authoritative).
  useEffect(() => {
    if (existingDeck) return;
    if (!prefilledClassId) return;
    if (subject && grade) return; // already filled by initial state, nothing to do
    const cls = userClasses.find(c => c.id === prefilledClassId);
    if (!cls) return;
    if (!subject) setSubject(cls.subject);
    if (!grade) setGrade(cls.grade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userClasses, prefilledClassId, existingDeck]);

  // ── Derivation tracking ──
  // If this deck is a copy of someone else's, fetch the original's questions
  // so we can show live feedback on whether the user has adapted it enough to
  // publish, and how it would be attributed in Community.
  const copiedFromId = existingDeck?.copied_from_id || null;
  const [originalQuestions, setOriginalQuestions] = useState(null);
  const [originalAuthorName, setOriginalAuthorName] = useState("");
  useEffect(() => {
    if (!copiedFromId) return;
    (async () => {
      const { data } = await supabase
        .from("decks")
        .select("questions, profiles(full_name)")
        .eq("id", copiedFromId)
        .maybeSingle();
      if (data) {
        setOriginalQuestions(data.questions || []);
        setOriginalAuthorName(data.profiles?.full_name || "");
      }
    })();
  }, [copiedFromId]);

  // Live derivation analysis as the user edits questions.
  const derivation = (copiedFromId && originalQuestions)
    ? analyzeDerivation(originalQuestions, questions)
    : null;

  // ── Question list UX (expand/drag/scroll) ──
  const [expandedQ, setExpandedQ] = useState(null); // index of currently expanded question
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [flashIndex, setFlashIndex] = useState(null); // briefly highlights newly added question
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  // Cuando la validación estructural descarta preguntas malas (p.ej. match sin
  // pairs, mcq con respuesta correcta fuera de rango), mostramos un aviso al
  // profe para que sepa qué pasó. null = sin aviso; { kept, dropped } = aviso.
  const [aiDropReport, setAiDropReport] = useState(null);
  // Warnings no-bloqueantes de generateQuestions (ej. el archivo se truncó por
  // largo). Array de { code, ...metadata }. Mostrados como banner amarillo.
  const [aiGenerationWarnings, setAiGenerationWarnings] = useState([]);
  const questionRefs = useRef({});
  const typeSelectorRef = useRef(null);
  const aiPanelRef = useRef(null);

  // Abrir el panel de AI: cierra el type selector si estaba abierto, scroll suave.
  const openAIPanel = () => {
    setShowTypeSelector(false);
    setShowAIPanel(true);
    setAiDropReport(null);
    setAiGenerationWarnings([]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        aiPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  // Validación estructural: una pregunta es válida solo si su shape garantiza
  // que el alumno puede responderla y el editor puede renderizarla.
  // Devuelve { valid: bool, reason: string } — reason solo se loggea en consola
  // para debugging, no se muestra al profe.
  const validateQuestion = (q) => {
    if (!q || typeof q !== "object") return { valid: false, reason: "not an object" };
    if (typeof q.q !== "string" || q.q.trim().length < 3) return { valid: false, reason: "missing or too-short q text" };

    if (q.type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2) return { valid: false, reason: "mcq needs ≥2 options" };
      const validOpts = q.options.filter(o => typeof o === "string" && o.trim().length > 0);
      if (validOpts.length < 2) return { valid: false, reason: "mcq needs ≥2 non-empty options" };
      // Detectar duplicados (case-insensitive, trim) — opciones repetidas rompen la pregunta
      const lowercased = validOpts.map(o => o.trim().toLowerCase());
      if (new Set(lowercased).size !== lowercased.length) return { valid: false, reason: "mcq has duplicate options" };
      if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= q.options.length) return { valid: false, reason: "mcq correct index out of range" };
      return { valid: true };
    }

    if (q.type === "tf") {
      if (typeof q.correct !== "boolean") return { valid: false, reason: "tf needs boolean correct" };
      return { valid: true };
    }

    if (q.type === "fill") {
      if (typeof q.answer !== "string" || q.answer.trim().length === 0) return { valid: false, reason: "fill needs non-empty answer" };
      if (!q.q.includes("_____")) return { valid: false, reason: "fill q must contain blank marker _____" };
      return { valid: true };
    }

    if (q.type === "order") {
      if (!Array.isArray(q.items) || q.items.length < 3) return { valid: false, reason: "order needs ≥3 items" };
      const validItems = q.items.filter(i => typeof i === "string" && i.trim().length > 0);
      if (validItems.length < 3) return { valid: false, reason: "order needs ≥3 non-empty items" };
      return { valid: true };
    }

    if (q.type === "match") {
      // Este es el bug que vio Jota — match con pairs vacío o muy pocas.
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) return { valid: false, reason: "match needs ≥2 pairs" };
      const validPairs = q.pairs.filter(p =>
        p && typeof p === "object" &&
        typeof p.left === "string" && p.left.trim().length > 0 &&
        typeof p.right === "string" && p.right.trim().length > 0
      );
      if (validPairs.length < 2) return { valid: false, reason: "match needs ≥2 complete pairs" };
      // Detectar lefts duplicados (rompen el matching) y rights duplicados (ambiguos)
      const lefts = validPairs.map(p => p.left.trim().toLowerCase());
      const rights = validPairs.map(p => p.right.trim().toLowerCase());
      if (new Set(lefts).size !== lefts.length) return { valid: false, reason: "match has duplicate left items" };
      if (new Set(rights).size !== rights.length) return { valid: false, reason: "match has duplicate right items" };
      return { valid: true };
    }

    if (q.type === "free") {
      // free solo necesita q text — ya validado arriba.
      return { valid: true };
    }

    if (q.type === "sentence") {
      if (typeof q.required_word !== "string" || q.required_word.trim().length === 0) return { valid: false, reason: "sentence needs required_word" };
      if (typeof q.min_words !== "number" || q.min_words < 2) return { valid: false, reason: "sentence needs sensible min_words" };
      return { valid: true };
    }

    if (q.type === "slider") {
      if (typeof q.min !== "number" || typeof q.max !== "number" || typeof q.correct !== "number") return { valid: false, reason: "slider needs numeric min/max/correct" };
      if (q.min >= q.max) return { valid: false, reason: "slider min must be < max" };
      if (q.correct < q.min || q.correct > q.max) return { valid: false, reason: "slider correct must be within min..max" };
      if (typeof q.tolerance !== "number" || q.tolerance <= 0) return { valid: false, reason: "slider needs positive tolerance" };
      return { valid: true };
    }

    return { valid: false, reason: `unknown type: ${q.type}` };
  };

  // Cuando la AI termina, anexamos las preguntas al final del array existente,
  // expandimos la primera nueva, y hacemos flash. Luego cerramos el panel.
  // El segundo argumento `warnings` viene de generateQuestions con avisos
  // no bloqueantes (ej. truncado por largo). Los guardamos en state para
  // mostrarlos arriba de la lista.
  const handleAIGenerated = (newQuestions, warnings = []) => {
    // 1. Normalización: rellenar campos opcionales que el editor espera.
    const normalized = newQuestions.map(q => {
      const base = { ...q };
      if (base.type === "mcq") {
        if (typeof base.multi !== "boolean") base.multi = false;
        if (!Array.isArray(base.options)) base.options = ["", "", "", ""];
        if (typeof base.correct !== "number") base.correct = 0;
      }
      if (base.type === "fill") {
        if (!Array.isArray(base.alternatives)) base.alternatives = [];
      }
      if (base.type === "tf") {
        if (typeof base.correct !== "boolean") base.correct = true;
      }
      if (base.type === "order") {
        if (!Array.isArray(base.items)) base.items = [];
        // PR 24.4.1: cap at 8 to match the themed render limit. If the
        // AI returns more, keep the first 8 in their canonical order.
        if (base.items.length > 8) base.items = base.items.slice(0, 8);
      }
      if (base.type === "match") {
        if (!Array.isArray(base.pairs)) base.pairs = [];
        // PR 24.4.1: same cap as order.
        if (base.pairs.length > 8) base.pairs = base.pairs.slice(0, 8);
      }
      if (base.type === "sentence") {
        if (typeof base.required_word !== "string") base.required_word = "";
        if (typeof base.min_words !== "number") base.min_words = 5;
      }
      if (base.type === "slider") {
        if (typeof base.min !== "number") base.min = 0;
        if (typeof base.max !== "number") base.max = 100;
        if (typeof base.correct !== "number") base.correct = 50;
        if (typeof base.tolerance !== "number") base.tolerance = 5;
        if (typeof base.unit !== "string") base.unit = "";
      }
      // Normalizar time_limit: si la AI mandó un valor fuera del set permitido,
      // lo descartamos (resolveTimeLimit caerá al default del tipo en runtime).
      // Para polls, removemos el campo siempre (no aplica).
      if (base.type === "poll") {
        delete base.time_limit;
      } else {
        const config = TIME_LIMITS[base.type];
        if (config && typeof base.time_limit === "number" && !config.allowed.includes(base.time_limit)) {
          // Valor fuera de set → lo borramos. resolveTimeLimit usará default.
          console.warn(`[AI] Out-of-set time_limit ${base.time_limit} for ${base.type}; falling back to default`);
          delete base.time_limit;
        }
      }
      return base;
    });

    // 2. Validación estructural en cliente: descartamos las que vienen rotas.
    // Loggeamos en consola para debugging interno.
    const validated = [];
    let structuralDropped = 0;
    for (const q of normalized) {
      const result = validateQuestion(q);
      if (result.valid) {
        validated.push(q);
      } else {
        structuralDropped++;
        console.warn("[AI] Dropped invalid question:", result.reason, q);
      }
    }

    // 3. Sumar drops semánticos (Haiku) si vinieron en warnings, con los
    // estructurales (de validateQuestion). Para el profe son lo mismo:
    // "preguntas descartadas por calidad". El detalle técnico se guarda
    // solo en consola.
    const incomingWarnings = Array.isArray(warnings) ? warnings : [];
    const validationWarning = incomingWarnings.find(w => w.code === "validation_dropped");
    const semanticDropped = validationWarning?.dropped || 0;
    // The most-common reason from Haiku's drops. We forward it to the UI
    // so the warning copy can be specific (e.g. "5 questions were dropped:
    // mostly because 'Spanish content, not history'") instead of just
    // generic "5 dropped". Helps the teacher learn what to fix next time.
    const semanticTopReason = validationWarning?.topReason || null;
    const totalDropped = structuralDropped + semanticDropped;

    // 4. Caso: TODAS fueron descartadas. No hay nada que insertar; dejamos
    // el panel abierto para que el profe reintente. El AIGeneratePanel
    // tiene su propio dropReport para este caso (lo mantenemos por ahora
    // para que el panel sepa mostrar error grande).
    if (validated.length === 0) {
      setAiDropReport({ kept: 0, dropped: totalDropped });
      setAiGenerationWarnings([]);
      return;
    }

    // 5. Caso: algunas válidas. Construimos la lista de warnings unificada.
    // Quitamos los originales de "validation_dropped" porque los unificamos
    // en "quality_filtered" abajo. Mantenemos otros (truncated, etc.).
    const otherWarnings = incomingWarnings.filter(w => w.code !== "validation_dropped");
    const unifiedWarnings = [...otherWarnings];
    if (totalDropped > 0) {
      unifiedWarnings.push({
        code: "quality_filtered",
        delivered: validated.length,
        dropped: totalDropped,
        // requested = lo que el profe pidió originalmente. Si no lo sabemos
        // (porque estamos en cliente), aproximamos con delivered + dropped.
        requested: validated.length + totalDropped,
        topReason: semanticTopReason,
      });
    }
    setAiGenerationWarnings(unifiedWarnings);
    setAiDropReport(null);

    setQuestions(prev => {
      const startIdx = prev.length;
      const merged = [...prev, ...validated];
      setExpandedQ(startIdx);
      setFlashIndex(startIdx);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          questionRefs.current[startIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
      return merged;
    });
    setShowAIPanel(false);
  };

  // Build a blank question of the given type (defaults to mcq).
  const blankQuestion = (type) => {
    if (type === "tf")    return { type: "tf",    q: "", correct: true };
    if (type === "fill")  return { type: "fill",  q: "", answer: "", alternatives: [] };
    if (type === "order") return { type: "order", q: "", items: ["", "", "", ""] };
    if (type === "match") return { type: "match", q: "", pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] };
    if (type === "free")  return { type: "free",  q: "" };
    if (type === "sentence") return { type: "sentence", q: "", required_word: "", min_words: 3 };
    if (type === "slider") return { type: "slider", q: "", min: 0, max: 100, correct: 50, tolerance: 5, unit: "" };
    return { type: "mcq", q: "", options: ["", "", "", ""], correct: 0, multi: false };
  };

  const addQuestion = (type) => {
    const newQ = blankQuestion(type);
    setQuestions(prev => {
      const newIdx = prev.length;
      setExpandedQ(newIdx);
      setFlashIndex(newIdx);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          questionRefs.current[newIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
      setTimeout(() => setFlashIndex(null), 1400);
      return [...prev, newQ];
    });
    setShowTypeSelector(false);
  };

  const openTypeSelector = () => {
    setShowTypeSelector(true);
    // Scroll to the selector after it mounts so user sees it without effort.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        typeSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const updateQ = (idx, field, val) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const updateOption = (qIdx, optIdx, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q));
  const updateItem = (qIdx, itemIdx, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, items: q.items.map((it, j) => j === itemIdx ? val : it) } : q));
  const updatePair = (qIdx, pairIdx, side, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, pairs: q.pairs.map((p, j) => j === pairIdx ? { ...p, [side]: val } : p) } : q));

  // ── Dynamic add/remove for options, items, pairs ──
  const MAX_OPTIONS = 8;
  // PR 24.4.1: caps lowered from 12 to 8 to match the themed render
  // limits in StudentJoin.jsx (themedMatchEligible, themedOrderEligible
  // both require length ≤ 8). Above 8 the themed UI gets cramped and
  // would fall through to the legacy render — easier to just prevent
  // creating those questions in the first place.
  const MAX_ITEMS = 8;
  const MAX_PAIRS = 8;

  const addOption = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx || (q.options || []).length >= MAX_OPTIONS) return q;
    return { ...q, options: [...(q.options || []), ""] };
  }));

  const removeOption = (qIdx, optIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const opts = q.options || [];
    if (opts.length <= 2) return q;
    const newOpts = opts.filter((_, j) => j !== optIdx);
    // Adjust correct index/array.
    let newCorrect = q.correct;
    if (Array.isArray(q.correct)) {
      newCorrect = q.correct
        .filter(idx => idx !== optIdx)
        .map(idx => idx > optIdx ? idx - 1 : idx);
    } else if (typeof q.correct === "number") {
      if (q.correct === optIdx) newCorrect = 0;
      else if (q.correct > optIdx) newCorrect = q.correct - 1;
    }
    return { ...q, options: newOpts, correct: newCorrect };
  }));

  const addItem = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx || (q.items || []).length >= MAX_ITEMS) return q;
    return { ...q, items: [...(q.items || []), ""] };
  }));

  const removeItem = (qIdx, itemIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const items = q.items || [];
    if (items.length <= 2) return q;
    return { ...q, items: items.filter((_, j) => j !== itemIdx) };
  }));

  const addPair = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx || (q.pairs || []).length >= MAX_PAIRS) return q;
    return { ...q, pairs: [...(q.pairs || []), { left: "", right: "" }] };
  }));

  const removePair = (qIdx, pairIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const pairs = q.pairs || [];
    if (pairs.length <= 2) return q;
    return { ...q, pairs: pairs.filter((_, j) => j !== pairIdx) };
  }));

  // Toggle MCQ between single/multi. When switching to multi, convert number to array.
  // When switching to single, take the first array element.
  const toggleMcqMulti = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const willBeMulti = !q.multi;
    let nextCorrect = q.correct;
    if (willBeMulti) {
      nextCorrect = Array.isArray(q.correct) ? q.correct : (typeof q.correct === "number" ? [q.correct] : [0]);
    } else {
      nextCorrect = Array.isArray(q.correct) ? (q.correct[0] ?? 0) : (typeof q.correct === "number" ? q.correct : 0);
    }
    return { ...q, multi: willBeMulti, correct: nextCorrect };
  }));

  const toggleMcqCorrect = (qIdx, optIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    if (q.multi || Array.isArray(q.correct)) {
      const set = new Set(Array.isArray(q.correct) ? q.correct : []);
      if (set.has(optIdx)) set.delete(optIdx); else set.add(optIdx);
      // Always keep at least one correct? Allow zero for now; isQComplete enforces.
      return { ...q, correct: Array.from(set).sort((a, b) => a - b) };
    }
    return { ...q, correct: optIdx };
  }));

  const isMcqCorrect = (q, optIdx) => {
    if (Array.isArray(q.correct)) return q.correct.includes(optIdx);
    return q.correct === optIdx;
  };

  // Detect whether an MCQ is in image-mode (any option is an object with image_url
  // OR explicit q.image_options flag from the toggle).
  const isMcqImageMode = (q) => {
    if (q.image_options === true) return true;
    if (q.image_options === false) return false;
    return Array.isArray(q.options) && q.options.some(o => typeof o === "object" && o?.image_url);
  };

  // Toggle MCQ between text and image options. Convert format both ways without
  // losing data the user has entered.
  const toggleMcqImageMode = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const willBeImage = !isMcqImageMode(q);
    const newOptions = (q.options || []).map(o => {
      if (willBeImage) {
        // Convert "text" → { text: "text", image_url: null } so existing labels are preserved.
        if (typeof o === "string") return { text: o, image_url: null };
        return o; // already object
      }
      // Going back to text-only: keep .text if present, otherwise empty string.
      if (typeof o === "object") return o.text || "";
      return o;
    });
    return { ...q, options: newOptions, image_options: willBeImage };
  }));

  // Set image URL for a specific MCQ option (called after upload).
  const setOptionImage = (qIdx, optIdx, url) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    return {
      ...q,
      options: q.options.map((o, j) => {
        if (j !== optIdx) return o;
        const base = typeof o === "object" ? o : { text: o };
        return { ...base, image_url: url };
      }),
    };
  }));

  // Per-option upload state — { "qi:oi": true } while uploading.
  const [optionUploading, setOptionUploading] = useState({});
  const optionFileRef = useRef(null);
  const optionUploadTargetRef = useRef(null); // { qi, oi }

  const triggerOptionUpload = (qi, oi) => {
    optionUploadTargetRef.current = { qi, oi };
    optionFileRef.current?.click();
  };

  const handleOptionFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const target = optionUploadTargetRef.current;
    if (!target) return;
    const key = `${target.qi}:${target.oi}`;
    setOptionUploading(prev => ({ ...prev, [key]: true }));
    const result = await uploadDeckCover(file, userId);
    setOptionUploading(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    if (!result.error) {
      // Delete previous custom image if any (best-effort).
      setQuestions(prev => {
        const q = prev[target.qi];
        const prevUrl = q?.options?.[target.oi]?.image_url;
        if (prevUrl && !prevUrl.startsWith("preset:")) {
          deleteDeckCover(prevUrl);
        }
        return prev;
      });
      setOptionImage(target.qi, target.oi, result.url);
    }
  };

  const removeOptionImage = (qIdx, optIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const opt = q.options[optIdx];
    if (typeof opt === "object" && opt?.image_url) {
      deleteDeckCover(opt.image_url);
    }
    return {
      ...q,
      options: q.options.map((o, j) => {
        if (j !== optIdx) return o;
        if (typeof o === "object") return { ...o, image_url: null };
        return o;
      }),
    };
  }));

  // ── Question-level image (attached to the question itself, not options) ──
  const [qImageUploading, setQImageUploading] = useState({}); // { qi: true }
  const qImageFileRef = useRef(null);
  const qImageTargetRef = useRef(null); // { qi }

  const triggerQImageUpload = (qi) => {
    qImageTargetRef.current = { qi };
    qImageFileRef.current?.click();
  };

  const handleQImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const target = qImageTargetRef.current;
    if (!target) return;
    setQImageUploading(prev => ({ ...prev, [target.qi]: true }));
    const result = await uploadDeckCover(file, userId);
    setQImageUploading(prev => {
      const { [target.qi]: _, ...rest } = prev;
      return rest;
    });
    if (!result.error) {
      // Best-effort: delete previous question image if any.
      setQuestions(prev => {
        const prevUrl = prev[target.qi]?.image_url;
        if (prevUrl) deleteDeckCover(prevUrl);
        return prev.map((q, i) => i === target.qi ? { ...q, image_url: result.url } : q);
      });
    }
  };

  const removeQImage = (qi) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qi) return q;
    if (q.image_url) deleteDeckCover(q.image_url);
    return { ...q, image_url: null };
  }));

  const removeQ = (idx) => {
    setQuestions(prev => {
      const removed = prev[idx];
      // Best-effort cleanup of any uploaded images attached to this question.
      if (removed?.image_url) deleteDeckCover(removed.image_url);
      if (Array.isArray(removed?.options)) {
        removed.options.forEach(o => {
          if (typeof o === "object" && o?.image_url) deleteDeckCover(o.image_url);
        });
      }
      return prev.filter((_, i) => i !== idx);
    });
    setExpandedQ(curr => curr === idx ? null : (curr !== null && curr > idx ? curr - 1 : curr));
  };

  // Move question from `from` index to `to` index (drag-to-reorder).
  const moveQuestion = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    setQuestions(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    // Keep expansion stable: follow the dragged item to its new index.
    setExpandedQ(curr => {
      if (curr === null) return null;
      if (curr === from) return to;
      if (from < curr && to >= curr) return curr - 1;
      if (from > curr && to <= curr) return curr + 1;
      return curr;
    });
  };

  // Validate completeness of a question (all required fields filled).
  const isQComplete = (q) => {
    if (!q?.q?.trim()) return false;
    const type = q.type || "mcq";
    if (type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2) return false;
      if (!q.options.every(o => (typeof o === "string" ? o.trim() : (o?.text?.trim() || o?.image_url)))) return false;
      // multi: at least one correct, single: a valid index
      if (Array.isArray(q.correct)) return q.correct.length > 0;
      return typeof q.correct === "number" && q.correct >= 0 && q.correct < q.options.length;
    }
    if (type === "tf")    return typeof q.correct === "boolean";
    if (type === "fill")  return !!q.answer?.trim();
    if (type === "order") return Array.isArray(q.items) && q.items.length >= 2 && q.items.every(it => it?.trim());
    if (type === "match") return Array.isArray(q.pairs) && q.pairs.length >= 2 && q.pairs.every(p => p?.left?.trim() && p?.right?.trim());
    if (type === "free")  return true;
    if (type === "sentence") return !!q.required_word?.trim() && Number.isFinite(q.min_words) && q.min_words >= 1;
    if (type === "slider") return Number.isFinite(q.min) && Number.isFinite(q.max) && Number.isFinite(q.correct) && q.max > q.min && q.correct >= q.min && q.correct <= q.max && Number.isFinite(q.tolerance) && q.tolerance >= 0;
    return true;
  };

  // Short preview text for a question type chip.
  const shortType = (q) => {
    const id = q.type || "mcq";
    return ACTIVITY_TYPES.find(a => a.id === id)?.label[l] || id;
  };

  // ── Custom pointer-based drag with a real visual ghost ──
  // Why custom: HTML5 native drag uses a browser-generated "ghost" image that
  // doesn't look like our row, so users only see the cursor moving. With
  // pointer events we render a styled clone that follows the pointer 1:1 and
  // works identically on mouse + touch.
  const dragStateRef = useRef(null); // { fromIdx, ghostEl, offsetX, offsetY }
  const [ghostState, setGhostState] = useState(null); // { x, y, width, html } — for React-controlled ghost

  // Cleanup on unmount in case a drag is in progress.
  useEffect(() => {
    return () => {
      if (dragStateRef.current?.cleanup) dragStateRef.current.cleanup();
    };
  }, []);

  const handleHandlePointerDown = (idx) => (e) => {
    // Only primary mouse button or any touch/pen.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rowEl = questionRefs.current[idx];
    if (!rowEl) return;

    const rect = rowEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragIndex(idx);
    setGhostState({
      x: e.clientX - offsetX,
      y: e.clientY - offsetY,
      width: rect.width,
      html: rowEl.outerHTML,
    });

    const onMove = (ev) => {
      // Update ghost position.
      setGhostState(prev => prev ? { ...prev, x: ev.clientX - offsetX, y: ev.clientY - offsetY } : prev);

      // Determine drop target: find the row whose vertical midpoint is closest.
      const refs = Object.entries(questionRefs.current)
        .map(([k, el]) => el ? { idx: Number(k), rect: el.getBoundingClientRect() } : null)
        .filter(Boolean)
        .sort((a, b) => a.rect.top - b.rect.top);

      let target = null;
      for (const r of refs) {
        if (ev.clientY < r.rect.top + r.rect.height / 2) { target = r.idx; break; }
      }
      if (target === null && refs.length) target = refs[refs.length - 1].idx + 1;
      // Clamp to valid range
      if (target !== null) {
        const maxIdx = refs.length;
        if (target > maxIdx) target = maxIdx;
        // dragOverIndex is the index where we'd drop INTO
        // Use clamped target for visual feedback (keep behaviour aligned with moveQuestion)
        const visualTarget = Math.min(target, refs.length - 1);
        setDragOverIndex(visualTarget);
      }
    };

    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // Compute final drop target one more time.
      const refs = Object.entries(questionRefs.current)
        .map(([k, el]) => el ? { idx: Number(k), rect: el.getBoundingClientRect() } : null)
        .filter(Boolean)
        .sort((a, b) => a.rect.top - b.rect.top);

      let target = refs.length;
      for (let i = 0; i < refs.length; i++) {
        if (ev.clientY < refs[i].rect.top + refs[i].rect.height / 2) { target = refs[i].idx; break; }
      }
      // splice semantics: dropping at index N means "insert before current item at N".
      // If we drag from `idx` to `target` and target > idx, the item being moved
      // shifts the destination down by 1 — splice handles it because we remove first then insert.
      if (target !== idx && target !== idx + 1) {
        const finalTarget = target > idx ? target - 1 : target;
        moveQuestion(idx, finalTarget);
      }
      setDragIndex(null);
      setDragOverIndex(null);
      setGhostState(null);
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dragStateRef.current = {
      fromIdx: idx,
      cleanup: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      },
    };
  };

  // Keyboard: ESC closes type selector first, then collapses the expanded question.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (showTypeSelector) { setShowTypeSelector(false); return; }
      if (expandedQ !== null) {
        // Don't trigger if user is in a multiline input or textarea — let them dismiss naturally.
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "textarea") return;
        setExpandedQ(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTypeSelector, expandedQ]);

  // ── Cover image handlers ──
  const handleImagePick = () => fileInputRef.current?.click();

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const prevUrl = coverImageUrl;
    const result = await uploadDeckCover(file, userId);
    setUploading(false);
    if (result.error) {
      setUploadError(t.uploadFailed);
      return;
    }
    setCoverImageUrl(result.url);
    // If we replaced an existing custom upload, delete the old file (best effort).
    if (prevUrl && !prevUrl.startsWith("preset:") && prevUrl !== result.url) {
      deleteDeckCover(prevUrl);
    }
  };

  const handleSelectPreset = (presetId) => {
    const prevUrl = coverImageUrl;
    setCoverImageUrl(`preset:${presetId}`);
    if (prevUrl && !prevUrl.startsWith("preset:")) {
      deleteDeckCover(prevUrl);
    }
  };

  const handleClearCover = () => {
    const prevUrl = coverImageUrl;
    setCoverImageUrl("");
    if (prevUrl && !prevUrl.startsWith("preset:")) {
      deleteDeckCover(prevUrl);
    }
  };

  // Which sub-mode of "Customize" is active.
  const coverMode = !coverImageUrl ? "color" : coverImageUrl.startsWith("preset:") ? "preset" : "image";

  // Save guard: title, subject, grade, at least one question, a class,
  // AND now an explicit section. Section was previously not in this
  // check because the field defaulted to general_review — with the
  // forced-choice behavior, an empty section must block submission.
  const canSave = title.trim() && subject && grade && questions.length > 0 && !!classId && isValidSection(section);

  const handleSave = async () => {
    if (!canSave) return;

    // If the user toggled "Make public" but this is a copy that fails the
    // derivation rules, force is_public back to false and warn. This keeps
    // the gate honest even if the toggle wasn't disabled at the right time.
    let finalPublic = makePublic;
    let finalAdapted = false;
    if (makePublic && derivation && !derivation.canPublish) {
      toast.error(derivation.status === "identical" ? t.publishBlockedIdentical : t.publishBlockedLowEffort);
      finalPublic = false;
    } else if (makePublic && derivation && derivation.showAdaptedBadge) {
      finalAdapted = true;
    }

    setSaving(true);
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      author_id: userId, class_id: classId, title: title.trim(), description: desc.trim(),
      subject, grade, language: deckLang, questions, tags: tagArr,
      // Section is required by the schema (NOT NULL with check constraint).
      // Validate again right before INSERT in case it got mutated; default to
      // general_review if anything weird shows up.
      section: isValidSection(section) ? section : DEFAULT_SECTION,
      is_public: finalPublic,
      is_adapted: finalAdapted,
      cover_color: coverColor, cover_icon: coverIcon,
      cover_image_url: coverImageUrl || null,
    };
    // PR4: when creating from a PlanView empty slot, the editor receives
    // prefilledUnitId via ?unit=<id>. We attach it on insert (not on
    // update — editing an existing deck shouldn't blow away its unit
    // assignment). FK constraint on the DB will reject invalid uuids,
    // so no extra validation needed here.
    if (!existingDeck && prefilledUnitId) {
      payload.unit_id = prefilledUnitId;
    }
    // PR 24.10: same idea for position — if PlanView sent ?position=N
    // because the teacher clicked Day N's empty slot, stamp the deck
    // at position N so it shows up in Day N (not Day 1 by default).
    // Only on insert; edits leave existing position alone (manual
    // drag-reorder handles that).
    if (!existingDeck && typeof prefilledPosition === "number" && prefilledPosition > 0) {
      payload.position = prefilledPosition;
    }
    if (existingDeck) {
      await supabase.from("decks").update(payload).eq("id", existingDeck.id);
      onCreated({ ...existingDeck, ...payload });
    } else {
      const { data } = await supabase.from("decks").insert(payload).select().single();
      if (data) onCreated(data);
    }
    setSaving(false);
  };

  return {
    // hook-call results
    toast,
    isMobile,
    journeyLegId,
    inEditorLeg,
    editorLaunch,
    // state + setters
    title, setTitle,
    desc, setDesc,
    prefilledClass,
    subject, setSubject,
    grade, setGrade,
    deckLang, setDeckLang,
    tags, setTags,
    classId, setClassId,
    initialSection,
    section, setSection,
    makePublic, setMakePublic,
    activityType, setActivityType,
    questions, setQuestions,
    saving, setSaving,
    coverColor, setCoverColor,
    coverIcon, setCoverIcon,
    coverImageUrl, setCoverImageUrl,
    uploading, setUploading,
    uploadError, setUploadError,
    editorTab, setEditorTab,
    fileInputRef,
    // derivation
    copiedFromId,
    originalQuestions, setOriginalQuestions,
    originalAuthorName, setOriginalAuthorName,
    derivation,
    // question list UX
    expandedQ, setExpandedQ,
    dragIndex, setDragIndex,
    dragOverIndex, setDragOverIndex,
    flashIndex, setFlashIndex,
    showTypeSelector, setShowTypeSelector,
    showAIPanel, setShowAIPanel,
    aiDropReport, setAiDropReport,
    aiGenerationWarnings, setAiGenerationWarnings,
    questionRefs,
    typeSelectorRef,
    aiPanelRef,
    // handlers
    openAIPanel,
    validateQuestion,
    handleAIGenerated,
    blankQuestion,
    addQuestion,
    openTypeSelector,
    updateQ,
    updateOption,
    updateItem,
    updatePair,
    // caps
    MAX_OPTIONS,
    MAX_ITEMS,
    MAX_PAIRS,
    addOption,
    removeOption,
    addItem,
    removeItem,
    addPair,
    removePair,
    toggleMcqMulti,
    toggleMcqCorrect,
    isMcqCorrect,
    isMcqImageMode,
    toggleMcqImageMode,
    setOptionImage,
    // option upload
    optionUploading, setOptionUploading,
    optionFileRef,
    optionUploadTargetRef,
    triggerOptionUpload,
    handleOptionFileChange,
    removeOptionImage,
    // question-level image
    qImageUploading, setQImageUploading,
    qImageFileRef,
    qImageTargetRef,
    triggerQImageUpload,
    handleQImageFileChange,
    removeQImage,
    removeQ,
    moveQuestion,
    isQComplete,
    shortType,
    // drag
    dragStateRef,
    ghostState, setGhostState,
    handleHandlePointerDown,
    // cover handlers
    handleImagePick,
    handleImageChange,
    handleSelectPreset,
    handleClearCover,
    coverMode,
    canSave,
    handleSave,
  };
}
