// ─── Create / Edit Deck Editor ──────────────────────────────────────────────
// Extracted from the parent Decks.jsx. Owns the entire deck creation/edit
// flow: cover (color, icon, image, presets), General tab (title/desc/class),
// Customize tab (subject/grade/language/tags), Questions tab (drag-drop,
// per-type forms, anti-republish coverage gate), and the publish action.
//
// Receives `t` (i18n strings) as a prop from Decks.jsx so it doesn't need
// its own copy of the locale dictionary.

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { generateQuestions, AIError, SUPPORTED_FILES } from "../../lib/ai";
import { TIME_LIMITS, estimateDeckSeconds, formatDeckDuration } from "../../lib/time-limits";
import { CIcon } from "../../components/Icons";
import {
  DeckCover,
  DECK_COLORS, DECK_ICONS,
  DEFAULT_DECK_COLOR, DEFAULT_DECK_ICON,
  SUBJ_ICON,
  PRESET_PATTERNS, presetToDataUrl,
  resolveColor, colorTint,
} from "../../lib/deck-cover";
import { uploadDeckCover, deleteDeckCover } from "../../lib/deck-image-upload";
import { analyzeDerivation } from "../../lib/deck-derivation";
import { useIsMobile } from "../../components/MobileMenuButton";
import { MONO } from "../../components/tokens";
import { C, css } from "./styles";

const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];

// Question type catalog — used by the type-selector grid and the per-question
// header to render the right icon + label. Same definition Decks.jsx had
// before the split; duplicated here (rather than imported) because it's the
// editor's domain and lives close to where it's used.
const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" } },
  { id: "free", icon: "study", label: { en: "Free Text", es: "Respuesta Libre", ko: "자유 응답" } },
  { id: "sentence", icon: "language", label: { en: "Sentence Builder", es: "Crear Oración", ko: "문장 만들기" } },
  { id: "slider", icon: "speed", label: { en: "Slider Estimate", es: "Estimar (Slider)", ko: "슬라이더 추정" } },
];

// ── Editor-local style objects ─────────────────────────────────────────────
// Shared by the editor's inputs/selects/buttons. Kept here (not in styles.js)
// because they reference C and live close to the JSX that uses them.
const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };
const addMiniBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
  background: "transparent", color: C.accent,
  border: `1px dashed ${C.accent}66`, cursor: "pointer",
  fontFamily: "'Outfit',sans-serif",
};
const miniDeleteBtn = {
  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
  background: "transparent", color: C.textMuted,
  border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0,
};
const iconOverImageBtn = {
  width: 24, height: 24, borderRadius: 6,
  background: "rgba(0,0,0,0.5)", color: "#fff",
  border: "none", cursor: "pointer", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(4px)",
};

function DeckCardPreview({ title, description, cover_color, cover_icon, cover_image_url, subject, grade, language, questionCount, t }) {
  const deckLike = { cover_color, cover_icon, cover_image_url, subject };
  const tint = colorTint(deckLike, "0F"); // ~6% tint
  const langCode = (language || "en").toUpperCase().slice(0, 2);
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{t.preview}</div>
      <div style={{
        background: C.bg,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}>
        <DeckCover deck={deckLike} variant="banner" height={92} radius={14} />
        <div style={{ padding: 16, background: tint, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {description && <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>}
          <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            {subject || "—"} {grade && `· ${grade}`} · {questionCount} {t.questionCount} · <span style={{ padding: "1px 5px", borderRadius: 4, background: C.bgSoft, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.textSecondary, border: `1px solid ${C.border}` }}>{langCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auto-resizing textarea ─────────────────────────────────────────────────
// Grows with content. Useful for question text where length varies a lot
// (one-liners → "MCQ" vs paragraph-length → word problems).
function AutoResizeTextarea({ value, onChange, placeholder, minHeight = 44, maxHeight = 320, autoFocus = false, style = {}, ...rest }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };
  useEffect(resize, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={1}
      style={{
        ...inp,
        resize: "none",
        lineHeight: 1.5,
        minHeight,
        overflowY: "hidden",
        ...style,
      }}
      {...rest}
    />
  );
}

// ─── AI Generate Panel ─────────────────────────────────────────────────────
// Inline panel que aparece dentro del editor cuando el profe pide "Generar con AI".
// Visualmente imita el TypeSelector existente (panel con border accent, mismo padding).
//
// Inputs:
//   - file (PDF/imagen/texto/docx/pptx) — opcional pero recomendado
//   - topic + keyPoints — alternativa o complemento
//   - activityType — qué tipo de pregunta generar (solo los soportados por la AI)
//   - numQuestions — cuántas preguntas (3-10)
//   - lessonContext — warmup / exitTicket / general
//
// Output: las preguntas generadas se pasan al callback `onGenerated(questions)`
// que el editor usa para anexarlas al array `questions`.
//
// Tipos que el dropdown del panel AI ofrece. Orden importa — pongo primero los
// más usados pedagógicamente y "Mixto" arriba como recomendado.
//   - "mix" es un meta-tipo: la AI devuelve preguntas de tipos variados, cada
//     item con su propio q.type. El editor renderiza cada uno como corresponde.
//   - "poll" sigue afuera porque el editor no lo renderiza todavía.
const AI_SUPPORTED_TYPES = ["mix", "mcq", "tf", "fill", "order", "match", "free", "sentence", "slider"];

function AIGeneratePanel({
  t, l,
  panelRef,
  defaultActivityType,
  deckSubject,
  deckGrade,
  deckLanguage,
  onGenerated,
  onCancel,
  onLanguageChange,  // se dispara al generar si el profe escogió un idioma
                     // distinto al del deck — el editor actualiza deckLang
                     // silenciosamente para mantener General coherente.
  dropReport,        // {kept, dropped} cuando handleAIGenerated descartó preguntas
}) {
  // El panel AI siempre arranca en "mix" porque es el flujo recomendado para
  // warmups y exit tickets reales (mezcla pedagógica > monotipo). Ignoramos el
  // tipo activo del editor — ese se usa para "Add question" manual, no para AI.
  const [aiActivityType, setAiActivityType] = useState("mix");
  const [numQuestions, setNumQuestions] = useState(5);
  const [lessonContext, setLessonContext] = useState("warmup"); // warmup | exitTicket | general
  // Idioma de las preguntas generadas. Default = idioma del deck (o el de la
  // UI si el deck no tiene idioma seteado todavía). Cuando el profe le da
  // Generate, este idioma se propaga al deck via onLanguageChange — así el
  // LangBadge, los filtros de Community, etc., quedan coherentes con lo que
  // realmente se generó.
  const [aiLanguage, setAiLanguage] = useState(deckLanguage || l || "en");
  // Si el profe tocó el selector explícitamente, respetamos su elección. Si no,
  // sincronizamos con deckLanguage por si cambió (p.ej. profe abrió General y
  // cambió el idioma del deck antes de venir a generar).
  const [userTouchedLang, setUserTouchedLang] = useState(false);
  useEffect(() => {
    if (userTouchedLang) return; // ya eligió manualmente, respetamos
    const target = deckLanguage || l || "en";
    if (target !== aiLanguage) setAiLanguage(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckLanguage, l]);
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const aiFileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileError("");
    if (f.size > SUPPORTED_FILES.maxSizeMB * 1024 * 1024) {
      setFileError(t.aiFileTooBig.replace("{mb}", SUPPORTED_FILES.maxSizeMB));
      return;
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setFileError("");
    if (aiFileInputRef.current) aiFileInputRef.current.value = "";
  };

  const canGenerate = !generating && (file || topic.trim().length >= 3);

  const handleGenerate = async () => {
    setError("");
    setGenerating(true);
    try {
      const result = await generateQuestions({
        topic: topic.trim() || (file ? file.name : ""),
        keyPoints: keyPoints.trim(),
        grade: deckGrade,
        subject: deckSubject,
        activityType: aiActivityType,
        numQuestions,
        language: aiLanguage,
        file,
        lessonContext,
      });
      // generateQuestions ahora devuelve { questions, warnings }.
      // Tolerante a la versión vieja que devolvía solo el array (ej. de un
      // build cacheado durante el deploy): si es array, lo envolvemos.
      const generated = Array.isArray(result) ? result : (result?.questions || []);
      const generationWarnings = Array.isArray(result?.warnings) ? result.warnings : [];

      // Saneo defensivo: el modelo a veces devuelve objetos sin "type". En modo
      // single-type, podemos inferirlo del tipo solicitado. En modo "mix", no
      // podemos adivinar — descartamos las que vengan sin type.
      const VALID_TYPES = new Set(["mcq", "tf", "fill", "order", "match", "free", "sentence", "slider"]);
      const cleaned = generated
        .filter(q => q && typeof q === "object")
        .map(q => {
          if (aiActivityType === "mix") {
            // Modo mixto: el type debe venir en cada pregunta. No imponemos.
            return q;
          }
          // Single type: si falta type, lo seteamos al tipo solicitado.
          return { ...q, type: q.type || aiActivityType };
        })
        .filter(q => VALID_TYPES.has(q.type));
      if (cleaned.length === 0) {
        setError(t.aiNoQuestions);
        setGenerating(false);
        return;
      }
      // Si el profe escogió un idioma distinto al del deck, propagamos al
      // editor para que actualice deckLang silenciosamente. Mantiene
      // LangBadge / Community / filtros coherentes con lo que se generó.
      if (aiLanguage !== deckLanguage && typeof onLanguageChange === "function") {
        onLanguageChange(aiLanguage);
      }
      // Si hubo warnings (ej. truncado), los pasamos al padre para que los
      // muestre arriba de las preguntas. Si no hay warnings, segundo arg
      // queda vacío.
      onGenerated(cleaned, generationWarnings);
      // El padre cierra el panel y muestra las preguntas.
    } catch (err) {
      // AIError viene con código; otros errores son network/parse genéricos.
      if (err instanceof AIError) {
        if (err.code === "rate_limited") setError(err.message || t.aiRateLimited);
        else if (err.code === "unauthorized") setError(t.aiSessionExpired);
        else if (err.code === "forbidden") setError(t.aiTeachersOnly);
        else if (err.code === "bad_output") setError(t.aiBadOutput);
        else if (err.code === "extraction_empty") setError(err.message || t.aiExtractionEmpty);
        else if (err.code === "extraction_failed") setError(err.message || t.aiExtractionFailed);
        else if (err.code === "unsupported_file") setError(t.aiUnsupportedFile);
        else if (err.code === "file_too_big") setError(err.message || t.aiFileTooBigGeneric);
        else if (err.code === "prompt_too_long") setError(err.message || t.aiPromptTooLong);
        else if (err.code === "doc_legacy") setError(err.message || t.aiDocLegacy);
        else setError(err.message || t.aiError);
      } else {
        setError(err?.message || t.aiError);
      }
      setGenerating(false);
    }
  };

  return (
    <div ref={panelRef} className="fade-up dk-type-picker" style={{
      marginTop: 12,
      padding: 18,
      borderRadius: 12,
      background: C.bg,
      border: `2px solid ${C.accent}`,
      boxShadow: `0 6px 20px ${C.accent}22`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true">✨</span> {t.aiPanelTitle}
        </h4>
        <button
          onClick={onCancel}
          disabled={generating}
          style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: "transparent", color: C.textMuted, border: "none",
            cursor: generating ? "not-allowed" : "pointer", fontFamily: "'Outfit',sans-serif",
            opacity: generating ? 0.5 : 1,
          }}
        >{t.cancel}</button>
      </div>

      {/* File uploader */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>
          {t.aiSourceLabel}
        </label>
        {!file ? (
          <>
            <input
              ref={aiFileInputRef}
              type="file"
              accept={SUPPORTED_FILES.accept}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => aiFileInputRef.current?.click()}
              disabled={generating}
              style={{
                width: "100%", padding: "14px 12px", borderRadius: 8,
                border: `1.5px dashed ${C.border}`, background: C.bgSoft,
                color: C.textSecondary, fontSize: 13,
                cursor: generating ? "not-allowed" : "pointer",
                fontFamily: "'Outfit',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4v12M6 10l6-6 6 6M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.aiUploadCta}
            </button>
            <p style={{ fontSize: 11, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.4 }}>
              {t.aiUploadHint}
            </p>
          </>
        ) : (
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: C.accentSoft, border: `1px solid ${C.accent}44`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: C.accent }}>
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
              <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            </svg>
            <span style={{ flex: 1, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </span>
            <button
              type="button"
              onClick={clearFile}
              disabled={generating}
              style={{
                background: "transparent", border: "none", color: C.textMuted,
                fontSize: 18, lineHeight: 1, cursor: generating ? "not-allowed" : "pointer",
                padding: 0,
              }}
              aria-label={t.aiRemoveFile}
            >×</button>
          </div>
        )}
        {fileError && <p style={{ fontSize: 11, color: "#d23", margin: "6px 0 0" }}>{fileError}</p>}
      </div>

      {/* Topic + key points */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>
          {file ? t.aiTopicOptional : t.aiTopicRequired}
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t.aiTopicPlaceholder}
          disabled={generating}
          style={{ ...inp, padding: "8px 12px", fontSize: 13 }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>
          {t.aiKeyPointsLabel}
        </label>
        <textarea
          value={keyPoints}
          onChange={(e) => setKeyPoints(e.target.value)}
          placeholder={t.aiKeyPointsPlaceholder}
          disabled={generating}
          rows={3}
          style={{ ...inp, padding: "8px 12px", fontSize: 13, resize: "vertical", minHeight: 60, lineHeight: 1.5 }}
        />
      </div>

      {/* Settings row: type + count + context + language.
          Usamos flex con flex-basis en vez de grid uniforme porque "How many"
          y "Language" tienen contenido corto (números, idiomas) y no se
          merecen el mismo ancho que "Type" (que muestra "Mixed (recommended)").
          flex-wrap permite reorganizarse en pantallas chicas. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: "2 1 160px", minWidth: 0 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>{t.aiTypeLabel}</label>
          <select
            value={aiActivityType}
            onChange={(e) => setAiActivityType(e.target.value)}
            disabled={generating}
            style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
          >
            {AI_SUPPORTED_TYPES.map(typeId => {
              // "mix" es virtual, no está en ACTIVITY_TYPES; usamos el label
              // i18n del panel directamente.
              if (typeId === "mix") return <option key="mix" value="mix">{t.aiTypeMixed}</option>;
              const at = ACTIVITY_TYPES.find(a => a.id === typeId);
              if (!at) return null;
              return <option key={typeId} value={typeId}>{at.label[l]}</option>;
            })}
          </select>
        </div>
        <div style={{ flex: "0 0 90px" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>{t.aiCountLabel}</label>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            disabled={generating}
            style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
          >
            {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: "1.5 1 140px", minWidth: 0 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>{t.aiContextLabel}</label>
          <select
            value={lessonContext}
            onChange={(e) => setLessonContext(e.target.value)}
            disabled={generating}
            style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
          >
            <option value="warmup">{t.aiContextWarmup}</option>
            <option value="exitTicket">{t.aiContextExit}</option>
            <option value="general">{t.aiContextGeneral}</option>
          </select>
        </div>
        <div style={{ flex: "0 0 130px" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>{t.aiLanguageLabel}</label>
          <select
            value={aiLanguage}
            onChange={(e) => { setAiLanguage(e.target.value); setUserTouchedLang(true); }}
            disabled={generating}
            style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ko">한국어</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "10px 12px", marginBottom: 12, borderRadius: 8,
          background: "#fdebea", border: "1px solid #f5c6c4",
          color: "#922", fontSize: 12, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Caso: la AI generó pero TODAS las preguntas eran inválidas
          estructuralmente (match sin pairs, mcq sin options, etc.). Le
          decimos al profe que reintente. */}
      {!error && dropReport && dropReport.kept === 0 && dropReport.dropped > 0 && (
        <div style={{
          padding: "10px 12px", marginBottom: 12, borderRadius: 8,
          background: "#fff8e6", border: "1px solid #f0d090",
          color: "#7a5500", fontSize: 12, lineHeight: 1.5,
        }}>
          {(t.aiAllDroppedMsg || "All {dropped} questions came back incomplete. Try generating again, change the source, or pick a single type.")
            .replace("{dropped}", String(dropReport.dropped))}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        style={{
          width: "100%", padding: "11px 16px", borderRadius: 8,
          fontSize: 14, fontWeight: 600,
          background: canGenerate ? C.accent : C.bgSoft,
          color: canGenerate ? "#fff" : C.textMuted,
          border: "none", cursor: canGenerate ? "pointer" : "not-allowed",
          fontFamily: "'Outfit',sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {generating ? (
          <>
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              animation: "dk-spin 0.7s linear infinite",
              display: "inline-block",
            }} />
            {t.aiGenerating}
          </>
        ) : (
          <>✨ {t.aiGenerateCta}</>
        )}
      </button>
    </div>
  );
}

function CreateDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck, prefilledClassId = null }) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState(existingDeck?.title || "");
  const [desc, setDesc] = useState(existingDeck?.description || "");
  // If we're creating fresh AND a class was pre-selected (came from "Add deck"
  // CTA inside an empty class group), copy the class's subject/grade as initial
  // values. The editor will lock these because classId is set.
  const prefilledClass = prefilledClassId ? userClasses.find(c => c.id === prefilledClassId) : null;
  const [subject, setSubject] = useState(existingDeck?.subject || prefilledClass?.subject || "");
  const [grade, setGrade] = useState(existingDeck?.grade || prefilledClass?.grade || "");
  const [deckLang, setDeckLang] = useState(existingDeck?.language || l);
  const [tags, setTags] = useState((existingDeck?.tags || []).join(", "));
  const [classId, setClassId] = useState(existingDeck?.class_id || prefilledClassId || "");
  const [makePublic, setMakePublic] = useState(existingDeck?.is_public || false);
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
      }
      if (base.type === "match") {
        if (!Array.isArray(base.pairs)) base.pairs = [];
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
  const MAX_ITEMS = 12;
  const MAX_PAIRS = 12;

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
          deleteDeckCover(prevUrl).catch(() => {});
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
      deleteDeckCover(opt.image_url).catch(() => {});
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
        if (prevUrl) deleteDeckCover(prevUrl).catch(() => {});
        return prev.map((q, i) => i === target.qi ? { ...q, image_url: result.url } : q);
      });
    }
  };

  const removeQImage = (qi) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qi) return q;
    if (q.image_url) deleteDeckCover(q.image_url).catch(() => {});
    return { ...q, image_url: null };
  }));

  const removeQ = (idx) => {
    setQuestions(prev => {
      const removed = prev[idx];
      // Best-effort cleanup of any uploaded images attached to this question.
      if (removed?.image_url) deleteDeckCover(removed.image_url).catch(() => {});
      if (Array.isArray(removed?.options)) {
        removed.options.forEach(o => {
          if (typeof o === "object" && o?.image_url) deleteDeckCover(o.image_url).catch(() => {});
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
      deleteDeckCover(prevUrl).catch(() => {});
    }
  };

  const handleSelectPreset = (presetId) => {
    const prevUrl = coverImageUrl;
    setCoverImageUrl(`preset:${presetId}`);
    if (prevUrl && !prevUrl.startsWith("preset:")) {
      deleteDeckCover(prevUrl).catch(() => {});
    }
  };

  const handleClearCover = () => {
    const prevUrl = coverImageUrl;
    setCoverImageUrl("");
    if (prevUrl && !prevUrl.startsWith("preset:")) {
      deleteDeckCover(prevUrl).catch(() => {});
    }
  };

  // Which sub-mode of "Customize" is active.
  const coverMode = !coverImageUrl ? "color" : coverImageUrl.startsWith("preset:") ? "preset" : "image";

  const canSave = title.trim() && subject && grade && questions.length > 0;

  const handleSave = async () => {
    if (!canSave) return;

    // If the user toggled "Make public" but this is a copy that fails the
    // derivation rules, force is_public back to false and warn. This keeps
    // the gate honest even if the toggle wasn't disabled at the right time.
    let finalPublic = makePublic;
    let finalAdapted = false;
    if (makePublic && derivation && !derivation.canPublish) {
      alert(derivation.status === "identical" ? t.publishBlockedIdentical : t.publishBlockedLowEffort);
      finalPublic = false;
    } else if (makePublic && derivation && derivation.showAdaptedBadge) {
      finalAdapted = true;
    }

    setSaving(true);
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      author_id: userId, class_id: classId || null, title: title.trim(), description: desc.trim(),
      subject, grade, language: deckLang, questions, tags: tagArr,
      is_public: finalPublic,
      is_adapted: finalAdapted,
      cover_color: coverColor, cover_icon: coverIcon,
      cover_image_url: coverImageUrl || null,
    };
    if (existingDeck) {
      await supabase.from("decks").update(payload).eq("id", existingDeck.id);
      onCreated({ ...existingDeck, ...payload });
    } else {
      const { data } = await supabase.from("decks").insert(payload).select().single();
      if (data) onCreated(data);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Hidden file input for MCQ option image uploads */}
      <input
        ref={optionFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleOptionFileChange}
        style={{ display: "none" }}
      />

      {/* Hidden file input for question images (separate from options) */}
      <input
        ref={qImageFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleQImageFileChange}
        style={{ display: "none" }}
      />

      <button className="dk-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.back}
      </button>

      <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit'", margin: 0 }}>{existingDeck ? t.edit : t.create}</h2>
          <DeckCover deck={{ cover_color: coverColor, cover_icon: coverIcon, cover_image_url: coverImageUrl, subject }} variant="tile" size={36} radius={9} />
        </div>

        {/* ── Tabs ── */}
        <div className={isMobile ? "dk-scroll-x" : ""} style={{
          display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.border}`,
          ...(isMobile ? { flexWrap: "nowrap" } : {}),
        }}>
          {[
            { id: "general",   label: t.tabGeneral,   icon: "settings" },
            { id: "customize", label: t.tabCustomize, icon: "paint" },
            { id: "questions", label: t.tabQuestions + ` (${questions.length})`, icon: "question" },
          ].map(tab => (
            <button
              key={tab.id}
              className="dk-editor-tab"
              onClick={() => setEditorTab(tab.id)}
              style={{
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom: `2.5px solid ${editorTab === tab.id ? C.accent : "transparent"}`,
                color: editorTab === tab.id ? C.accent : C.textSecondary,
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Outfit',sans-serif",
                cursor: "pointer",
                marginBottom: -1,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all .15s ease",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <CIcon name={tab.icon} size={14} inline />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: General ── */}
        {editorTab === "general" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.title} *</label>
            <input className="dk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.description}</label>
            <textarea className="dk-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.descPlaceholder} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.addToClass}</label>
            <select className="dk-input" value={classId} onChange={e => {
              const id = e.target.value;
              setClassId(id);
              if (id) {
                const cls = userClasses.find(c => c.id === id);
                if (cls) { setSubject(cls.subject); setGrade(cls.grade); }
              }
            }} style={sel}>
              <option value="">{t.noClass}</option>
              {userClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject} · {c.grade})</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.subject} *</label>
              <select
                className="dk-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={!!classId}
                style={{ ...sel, opacity: classId ? 0.6 : 1, cursor: classId ? "not-allowed" : "pointer" }}
                title={classId ? t.lockedByClass : ""}
              >
                <option value="">{t.selectSubject}</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.grade} *</label>
              <input
                className="dk-input"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                disabled={!!classId}
                placeholder={t.gradePlaceholder}
                style={{ ...inp, opacity: classId ? 0.6 : 1, cursor: classId ? "not-allowed" : "text" }}
                title={classId ? t.lockedByClass : ""}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.language}</label>
              <select className="dk-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={sel}>
                <option value="en">English</option><option value="es">Español</option><option value="ko">한국어</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.tags}</label>
            <input className="dk-input" value={tags} onChange={e => setTags(e.target.value)} placeholder={t.tagsPlaceholder} style={inp} />
          </div>

          {/* Make public toggle (lives inside General — affects metadata, not content) */}
          {(() => {
            // For copies of someone else's deck, the publish toggle is gated
            // by the derivation analysis (anti-republish rule). We show the
            // teacher inline why they can or can't publish, and what the
            // attribution will look like.
            const blocked = derivation && !derivation.canPublish;
            const isAdaptedCase = derivation && derivation.canPublish && derivation.showAdaptedBadge;
            const isIndependentCase = derivation && derivation.canPublish && !derivation.showAdaptedBadge;
            const toggleDisabled = blocked;
            const handleToggle = () => {
              if (toggleDisabled) return;
              setMakePublic(!makePublic);
            };
            return (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: blocked ? C.redSoft : C.bgSoft,
                border: `1px solid ${blocked ? C.red + "44" : C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: blocked ? C.red : C.text }}>{t.makePublic}</div>
                  <button
                    onClick={handleToggle}
                    disabled={toggleDisabled}
                    title={blocked ? t.publishBlockedTooltip : ""}
                    style={{
                      width: 44, height: 24, borderRadius: 12, padding: 2,
                      background: blocked ? C.border : (makePublic ? C.accent : C.border),
                      border: "none", display: "flex", alignItems: "center",
                      cursor: blocked ? "not-allowed" : "pointer",
                      opacity: blocked ? 0.5 : 1,
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transform: (!blocked && makePublic) ? "translateX(20px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                  </button>
                </div>

                {/* Derivation feedback */}
                {derivation && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${blocked ? C.red + "33" : C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 6,
                      color: blocked ? C.red : isAdaptedCase ? C.accent : C.green }}>
                      <CIcon name={blocked ? "warning" : isAdaptedCase ? "sparkle" : "check"} size={13} inline />
                      {blocked && (derivation.status === "identical" ? t.derivIdentical : t.derivBlocked)}
                      {isAdaptedCase && t.derivAdapted}
                      {isIndependentCase && t.derivIndependent}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                      {t.derivStats
                        .replace("{coverage}", derivation.originalCoverage)
                        .replace("{contribution}", derivation.ownContribution)}
                      {originalAuthorName && (isAdaptedCase || blocked) && (
                        <> · {t.derivOriginalBy} <strong>{originalAuthorName}</strong></>
                      )}
                    </div>
                    {blocked && derivation.status !== "identical" && (
                      <div style={{ fontSize: 11, color: C.red, marginTop: 6, lineHeight: 1.5 }}>
                        {t.derivBlockedHint}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        )}

        {/* ── Tab: Customize ── */}
        {editorTab === "customize" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Live preview — full card mock ─────────────────────────── */}
          <DeckCardPreview
            title={title || t.titlePlaceholder}
            description={desc}
            cover_color={coverColor}
            cover_icon={coverIcon}
            cover_image_url={coverImageUrl}
            subject={subject}
            grade={grade}
            language={deckLang}
            questionCount={questions.length}
            t={t}
          />

          {/* Cover style selector ─────────────────────────── */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>{t.coverStyle}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { id: "color",  label: t.styleColor,  icon: "paint" },
                { id: "preset", label: t.stylePreset, icon: "sparkle" },
                { id: "image",  label: t.styleImage,  icon: "art" },
              ].map(opt => {
                const active = coverMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className="dk-mode-btn"
                    onClick={() => {
                      if (opt.id === "color")  handleClearCover();
                      if (opt.id === "preset" && coverMode !== "preset") handleSelectPreset(PRESET_PATTERNS[0].id);
                      if (opt.id === "image"  && coverMode !== "image")  handleImagePick();
                    }}
                    style={{
                      padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      background: active ? C.accentSoft : C.bg,
                      color: active ? C.accent : C.textSecondary,
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={opt.icon} size={14} inline /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hidden file input (always rendered, triggered by handlers) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

          {/* Color always visible — it tints presets too ─────────── */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverColor}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DECK_COLORS.map(col => (
                <button
                  key={col.id}
                  type="button"
                  aria-label={col.label}
                  title={col.label}
                  onClick={() => setCoverColor(col.id)}
                  className="dk-color-swatch"
                  style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: col.value,
                    border: coverColor === col.id ? `2.5px solid ${C.text}` : `2px solid transparent`,
                    cursor: "pointer", padding: 0,
                    boxShadow: coverColor === col.id ? `0 0 0 2px ${C.bg}, 0 2px 6px ${col.value}55` : `0 1px 3px ${col.value}33`,
                    transition: "all .15s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mode-specific content */}
          {coverMode === "color" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverIcon}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
                {DECK_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={ic}
                    title={ic}
                    onClick={() => setCoverIcon(ic)}
                    className="dk-icon-btn"
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      background: coverIcon === ic ? C.accentSoft : C.bg,
                      border: `1.5px solid ${coverIcon === ic ? C.accent : C.border}`,
                      cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={ic} size={18} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {coverMode === "preset" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.presetPatterns}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {PRESET_PATTERNS.map(p => {
                  const active = coverImageUrl === `preset:${p.id}`;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => handleSelectPreset(p.id)}
                      className="dk-preset-btn"
                      style={{
                        position: "relative",
                        aspectRatio: "16 / 9",
                        borderRadius: 8,
                        backgroundImage: presetToDataUrl(p.id, resolveColor({ cover_color: coverColor })),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: active ? `2.5px solid ${C.text}` : `2px solid transparent`,
                        cursor: "pointer", padding: 0,
                        boxShadow: active ? `0 0 0 2px ${C.bg}, 0 2px 6px rgba(0,0,0,0.15)` : "0 1px 3px rgba(0,0,0,0.08)",
                        transition: "all .15s ease",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {coverMode === "image" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  className="dk-btn"
                  onClick={handleImagePick}
                  disabled={uploading}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}33`,
                    cursor: uploading ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  <CIcon name="refresh" size={14} inline />
                  {uploading ? t.uploading : t.changeImage}
                </button>
                <button
                  type="button"
                  className="dk-btn-secondary"
                  onClick={handleClearCover}
                  disabled={uploading}
                  style={{
                    padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                    background: C.bg, color: C.red, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {t.removeImage}
                </button>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{t.uploadHint}</p>
              {uploadError && <p style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{uploadError}</p>}
            </div>
          )}
        </div>
        )}

        {/* ── Tab: Questions ── */}
        {editorTab === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            {questions.length === 0 ? t.questionsEmpty : t.questionsHint}
          </p>
        </div>
        )}
      </div>

      {/* Questions list (only on Questions tab) */}
      {editorTab === "questions" && (
      <div className="fade-up" style={{ animationDelay: ".1s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.questions} ({questions.length})</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="dk-btn"
              onClick={openAIPanel}
              disabled={showAIPanel || showTypeSelector}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: (showAIPanel || showTypeSelector) ? C.bgSoft : C.accent,
                color: (showAIPanel || showTypeSelector) ? C.textMuted : "#fff",
                border: "none",
                opacity: (showAIPanel || showTypeSelector) ? 0.6 : 1,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <span aria-hidden="true">✨</span> {t.aiGenerateButton}
            </button>
            <button className="dk-btn" onClick={openTypeSelector} disabled={showTypeSelector || showAIPanel} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: (showTypeSelector || showAIPanel) ? C.bgSoft : C.accentSoft, color: (showTypeSelector || showAIPanel) ? C.textMuted : C.accent, opacity: (showTypeSelector || showAIPanel) ? 0.6 : 1 }}>{t.addQuestion}</button>
          </div>
        </div>

        {/* Estimated session time — sumando time_limit (AI) o defaults por
            tipo. Sirve para que el profe sepa la duración aproximada del
            deck antes de lanzar la sesión. Solo se muestra si hay
            preguntas (con 0 no tiene sentido). */}
        {questions.length > 0 && (() => {
          const seconds = estimateDeckSeconds(questions);
          if (seconds <= 0) return null;
          return (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 10px", marginBottom: 12, borderRadius: 6,
              background: C.bgSoft, border: `1px solid ${C.border}`,
              fontSize: 12, color: C.textSecondary,
            }}>
              <span aria-hidden="true">⏱</span>
              <span>{t.estimatedTime}: <strong style={{ color: C.text, fontWeight: 600 }}>≈ {formatDeckDuration(seconds, l)}</strong></span>
            </div>
          );
        })()}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {questions.map((q, qi) => {
            const isExpanded = expandedQ === qi;
            const complete = isQComplete(q);
            const dragging = dragIndex === qi;
            const dropTarget = dragOverIndex === qi && dragIndex !== null && dragIndex !== qi;
            return (
              <div
                key={qi}
                ref={(el) => { questionRefs.current[qi] = el; }}
                className={`dk-q-row ${flashIndex === qi ? "dk-q-flash" : ""}`}
                data-dragging={dragging}
                data-drop-target={dropTarget}
                data-expanded={isExpanded}
                style={{
                  background: C.bg, borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  overflow: "hidden",
                }}
              >
                {/* ── Compact row (whole header is clickable to expand) ── */}
                <div
                  className="dk-q-header"
                  onClick={() => setExpandedQ(isExpanded ? null : qi)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}
                >
                  <span
                    className="dk-q-handle"
                    onPointerDown={handleHandlePointerDown(qi)}
                    onClick={(e) => e.stopPropagation()}
                    title={t.drag}
                    aria-label={t.drag}
                    style={{
                      width: 22, height: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      userSelect: "none",
                      touchAction: "none", // critical: prevents scrolling on touch when dragging the handle
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="9" cy="6"  r="1.6" fill="currentColor"/>
                      <circle cx="15" cy="6" r="1.6" fill="currentColor"/>
                      <circle cx="9" cy="12" r="1.6" fill="currentColor"/>
                      <circle cx="15" cy="12" r="1.6" fill="currentColor"/>
                      <circle cx="9" cy="18" r="1.6" fill="currentColor"/>
                      <circle cx="15" cy="18" r="1.6" fill="currentColor"/>
                    </svg>
                  </span>

                  <span style={{
                    width: 28, textAlign: "center", fontSize: 12, fontWeight: 700,
                    color: C.textMuted, fontFamily: MONO, flexShrink: 0,
                  }}>{qi + 1}</span>

                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 5,
                    background: C.accentSoft, color: C.accent,
                    flexShrink: 0,
                    fontFamily: "'Outfit',sans-serif",
                  }}>{shortType(q)}</span>

                  {q.image_url && (
                    <span
                      title="Has image"
                      style={{
                        width: 22, height: 18, borderRadius: 4,
                        backgroundImage: `url(${q.image_url})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        flexShrink: 0,
                        border: `1px solid ${C.border}`,
                      }}
                    />
                  )}

                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 13,
                    color: q.q?.trim() ? C.text : C.textMuted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{q.q?.trim() || t.emptyQ}</span>

                  <span
                    title={complete ? t.complete : t.incomplete}
                    aria-label={complete ? t.complete : t.incomplete}
                    style={{
                      width: 18, height: 18, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: complete ? C.greenSoft : C.orangeSoft,
                      color: complete ? C.green : C.orange,
                      flexShrink: 0,
                    }}
                  >
                    <CIcon name={complete ? "check" : "warning"} size={11} inline />
                  </span>

                  {/* Chevron is a visual indicator only — entire header is clickable */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      color: C.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease" }}>
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>

                  <button
                    className="dk-q-delete"
                    onClick={(e) => { e.stopPropagation(); removeQ(qi); }}
                    aria-label={t.removeQuestion}
                    title={t.removeQuestion}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "transparent", color: C.textMuted,
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, padding: 0,
                      transition: "all .15s ease",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* ── Expanded editor ── */}
                {isExpanded && (
                  <div style={{ padding: "4px 14px 14px 14px", borderTop: `1px solid ${C.border}`, background: C.bgSoft }}>
                    <div style={{ marginTop: 12 }}>
                      <AutoResizeTextarea
                        value={q.q}
                        onChange={e => updateQ(qi, "q", e.target.value)}
                        placeholder={t.questionText}
                        autoFocus
                        style={{ marginBottom: 8 }}
                      />

                      {/* Question image: preview if present, otherwise add button */}
                      {q.image_url ? (
                        <div style={{
                          position: "relative",
                          marginBottom: 10,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: `1px solid ${C.border}`,
                          background: "#000",
                        }}>
                          <img
                            src={q.image_url}
                            alt=""
                            style={{
                              display: "block", width: "100%", maxHeight: 240,
                              objectFit: "contain", background: C.bg,
                            }}
                          />
                          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => triggerQImageUpload(qi)}
                              title={t.changeQuestionImage}
                              style={iconOverImageBtn}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.7614 3 17.2614 4.13579 19.0711 6.04822" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 4L19 7L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQImage(qi)}
                              title={t.removeQuestionImage}
                              style={iconOverImageBtn}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerQImageUpload(qi)}
                          disabled={!!qImageUploading[qi]}
                          className="dk-add-mini"
                          style={{ ...addMiniBtn, marginBottom: 10 }}
                        >
                          <CIcon name="art" size={12} inline />
                          {qImageUploading[qi] ? t.uploading : t.addQuestionImage}
                        </button>
                      )}
                      {/* MCQ */}
                      {(q.type === "mcq" || (!q.type && activityType === "mcq")) && q.options && (() => {
                        const imageMode = isMcqImageMode(q);
                        return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Toggles row */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary }}>{t.multipleCorrect}</span>
                              <button onClick={() => toggleMcqMulti(qi)} style={{ width: 38, height: 22, borderRadius: 11, padding: 2, background: q.multi ? C.accent : C.border, border: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: q.multi ? "translateX(16px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                              </button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary }}>{t.useImageOptions}</span>
                              <button onClick={() => toggleMcqImageMode(qi)} style={{ width: 38, height: 22, borderRadius: 11, padding: 2, background: imageMode ? C.accent : C.border, border: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: imageMode ? "translateX(16px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {q.options.map((o, oi) => {
                              const correct = isMcqCorrect(q, oi);
                              const optText = typeof o === "string" ? o : (o?.text || "");
                              const optImg  = typeof o === "object" ? o?.image_url : null;
                              const uploadingThis = optionUploading[`${qi}:${oi}`];

                              if (imageMode) {
                                return (
                                  <div key={oi} style={{
                                    position: "relative",
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    border: `2px solid ${correct ? C.green : C.border}`,
                                    background: optImg ? "#000" : C.bg,
                                  }}>
                                    {optImg ? (
                                      <div style={{
                                        width: "100%", aspectRatio: "1 / 1",
                                        backgroundImage: `url(${optImg})`,
                                        backgroundSize: "cover", backgroundPosition: "center",
                                      }} />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => triggerOptionUpload(qi, oi)}
                                        disabled={uploadingThis}
                                        style={{
                                          width: "100%", aspectRatio: "1 / 1",
                                          background: C.bgSoft, border: "none",
                                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                                          color: C.textMuted, fontSize: 11, fontWeight: 600,
                                          cursor: uploadingThis ? "default" : "pointer",
                                          fontFamily: "'Outfit',sans-serif",
                                        }}
                                      >
                                        <CIcon name="art" size={24} />
                                        {uploadingThis ? t.uploading : `${t.uploadOptionImage} ${oi + 1}`}
                                      </button>
                                    )}

                                    {/* Optional caption (always editable in image mode) */}
                                    <input
                                      className="dk-input"
                                      value={optText}
                                      onChange={e => updateOption(qi, oi, { ...(typeof o === "object" ? o : {}), text: e.target.value, image_url: optImg })}
                                      placeholder={`Caption ${oi + 1} (optional)`}
                                      style={{ ...inp, fontSize: 12, padding: "6px 10px", borderRadius: 0, border: "none", borderTop: `1px solid ${C.border}` }}
                                    />

                                    {/* Action buttons over image */}
                                    <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4 }}>
                                      <button
                                        type="button"
                                        onClick={() => toggleMcqCorrect(qi, oi)}
                                        title={correct ? t.correctAnswer : ""}
                                        style={{
                                          width: 24, height: 24,
                                          borderRadius: q.multi ? 6 : "50%",
                                          border: `2px solid ${correct ? C.green : "rgba(255,255,255,0.7)"}`,
                                          background: correct ? C.green : "rgba(0,0,0,0.4)",
                                          color: "#fff", fontSize: 11, cursor: "pointer", padding: 0,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                        }}
                                      >{correct && "✓"}</button>
                                    </div>
                                    <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                                      {optImg && (
                                        <button
                                          type="button"
                                          onClick={() => triggerOptionUpload(qi, oi)}
                                          title={t.changeOptionImage}
                                          style={iconOverImageBtn}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.7614 3 17.2614 4.13579 19.0711 6.04822" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 4L19 7L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </button>
                                      )}
                                      {optImg && (
                                        <button
                                          type="button"
                                          onClick={() => removeOptionImage(qi, oi)}
                                          title={t.removeOptionImage}
                                          style={iconOverImageBtn}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                        </button>
                                      )}
                                      {q.options.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => removeOption(qi, oi)}
                                          title={t.removeOption}
                                          style={iconOverImageBtn}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // ── Text mode ──
                              return (
                                <div key={oi} style={{ position: "relative" }}>
                                  <input
                                    className="dk-input"
                                    value={optText}
                                    onChange={e => updateOption(qi, oi, e.target.value)}
                                    placeholder={`${t.option} ${oi + 1}`}
                                    style={{ ...inp, paddingLeft: 36, paddingRight: q.options.length > 2 ? 36 : 14, background: correct ? C.greenSoft : C.bg, borderColor: correct ? C.green + "44" : C.border }}
                                  />
                                  <button
                                    onClick={() => toggleMcqCorrect(qi, oi)}
                                    title={correct ? t.correctAnswer : ""}
                                    style={{
                                      position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                                      width: 20, height: 20,
                                      borderRadius: q.multi ? 5 : "50%",
                                      border: `2px solid ${correct ? C.green : C.border}`,
                                      background: correct ? C.green : "transparent",
                                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 10, color: "#fff", padding: 0,
                                    }}
                                  >{correct && "✓"}</button>
                                  {q.options.length > 2 && (
                                    <button
                                      onClick={() => removeOption(qi, oi)}
                                      title={t.removeOption}
                                      aria-label={t.removeOption}
                                      style={{
                                        position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                                        width: 24, height: 24, borderRadius: 6,
                                        background: "transparent", color: C.textMuted, border: "none",
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                        padding: 0,
                                      }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.options.length < MAX_OPTIONS && (
                            <button onClick={() => addOption(qi)} className="dk-add-mini" style={addMiniBtn}>
                              <CIcon name="plus" size={12} inline /> {t.addOption}
                            </button>
                          )}
                        </div>
                        );
                      })()}

                      {/* True/False */}
                      {(q.type === "tf" || (!q.type && activityType === "tf")) && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {[true, false].map(v => (
                            <button key={String(v)} className="dk-pill" onClick={() => updateQ(qi, "correct", v)} style={{
                              flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                              background: q.correct === v ? C.greenSoft : C.bg,
                              color: q.correct === v ? C.green : C.textMuted,
                              border: `1px solid ${q.correct === v ? C.green + "44" : C.border}`,
                              cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                            }}>{v ? "True" : "False"}</button>
                          ))}
                        </div>
                      )}

                      {/* Fill */}
                      {(q.type === "fill" || (!q.type && activityType === "fill")) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input className="dk-input" value={q.answer || ""} onChange={e => updateQ(qi, "answer", e.target.value)} placeholder={t.correctAnswer} style={{ ...inp, background: C.greenSoft, borderColor: C.green + "44" }} />
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.acceptedAlts}</label>
                            <input
                              className="dk-input"
                              value={Array.isArray(q.alternatives) ? q.alternatives.join(", ") : ""}
                              onChange={e => updateQ(qi, "alternatives", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                              placeholder="paris, PARIS, parís"
                              style={{ ...inp, fontSize: 13 }}
                            />
                            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4, margin: 0 }}>{t.acceptedAltsHint}</p>
                          </div>
                        </div>
                      )}

                      {/* Order */}
                      {(q.type === "order" || (!q.type && activityType === "order")) && q.items && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.items.map((it, ii) => (
                            <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 22, height: 22, borderRadius: 5, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{ii + 1}</span>
                              <input className="dk-input" value={it} onChange={e => updateItem(qi, ii, e.target.value)} placeholder={`Step ${ii + 1}`} style={inp} />
                              {q.items.length > 2 && (
                                <button onClick={() => removeItem(qi, ii)} title={t.removeOption} style={miniDeleteBtn}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {q.items.length < MAX_ITEMS && (
                            <button onClick={() => addItem(qi)} className="dk-add-mini" style={{ ...addMiniBtn, alignSelf: "flex-start" }}>
                              <CIcon name="plus" size={12} inline /> {t.addItem}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Match */}
                      {(q.type === "match" || (!q.type && activityType === "match")) && q.pairs && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.pairs.map((p, pi) => (
                            <div key={pi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input className="dk-input" value={p.left} onChange={e => updatePair(qi, pi, "left", e.target.value)} placeholder="Left" style={{ ...inp, fontFamily: MONO, fontWeight: 600 }} />
                              <span style={{ color: C.textMuted }}>→</span>
                              <input className="dk-input" value={p.right} onChange={e => updatePair(qi, pi, "right", e.target.value)} placeholder="Right" style={inp} />
                              {q.pairs.length > 2 && (
                                <button onClick={() => removePair(qi, pi)} title={t.removeOption} style={miniDeleteBtn}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {q.pairs.length < MAX_PAIRS && (
                            <button onClick={() => addPair(qi)} className="dk-add-mini" style={{ ...addMiniBtn, alignSelf: "flex-start" }}>
                              <CIcon name="plus" size={12} inline /> {t.addPair}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Free Text */}
                      {(q.type === "free") && (
                        <div style={{ padding: "12px 14px", borderRadius: 8, background: C.bg, border: `1px dashed ${C.border}`, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                          <CIcon name="study" size={14} inline />
                          {t.freeTextHint}
                        </div>
                      )}

                      {/* Sentence Builder */}
                      {(q.type === "sentence") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.requiredWord} *</label>
                            <input
                              className="dk-input"
                              value={q.required_word || ""}
                              onChange={e => updateQ(qi, "required_word", e.target.value)}
                              placeholder={t.requiredWordPlaceholder}
                              style={{ ...inp, fontFamily: MONO, fontWeight: 600, background: C.accentSoft, borderColor: C.accent + "44" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.minWords}</label>
                            <input
                              className="dk-input"
                              type="number"
                              min={1}
                              max={50}
                              value={q.min_words ?? 3}
                              onChange={e => updateQ(qi, "min_words", Math.max(1, parseInt(e.target.value || "1", 10)))}
                              style={{ ...inp, width: 100 }}
                            />
                          </div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.bg, border: `1px dashed ${C.border}`, fontSize: 11, color: C.textMuted }}>
                            <CIcon name="lightbulb" size={12} inline /> {t.minWordsHint}
                          </div>
                        </div>
                      )}

                      {/* Slider */}
                      {(q.type === "slider") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderMin}</label>
                              <input
                                className="dk-input"
                                type="number"
                                value={q.min ?? 0}
                                onChange={e => updateQ(qi, "min", Number(e.target.value))}
                                style={{ ...inp, fontFamily: MONO }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderMax}</label>
                              <input
                                className="dk-input"
                                type="number"
                                value={q.max ?? 100}
                                onChange={e => updateQ(qi, "max", Number(e.target.value))}
                                style={{ ...inp, fontFamily: MONO }}
                              />
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderCorrect} *</label>
                              <input
                                className="dk-input"
                                type="number"
                                value={q.correct ?? 50}
                                onChange={e => updateQ(qi, "correct", Number(e.target.value))}
                                style={{ ...inp, fontFamily: MONO, background: C.greenSoft, borderColor: C.green + "44" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderTolerance}</label>
                              <input
                                className="dk-input"
                                type="number"
                                min={0}
                                value={q.tolerance ?? 5}
                                onChange={e => updateQ(qi, "tolerance", Math.max(0, Number(e.target.value)))}
                                style={{ ...inp, fontFamily: MONO }}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderUnit}</label>
                            <input
                              className="dk-input"
                              value={q.unit || ""}
                              onChange={e => updateQ(qi, "unit", e.target.value)}
                              placeholder={t.sliderUnitPlaceholder}
                              style={{ ...inp, width: 200, fontSize: 13 }}
                            />
                          </div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.bg, border: `1px dashed ${C.border}`, fontSize: 11, color: C.textMuted }}>
                            <CIcon name="lightbulb" size={12} inline /> {t.sliderHint}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Generate Panel — appears below the list when triggered */}
        {showAIPanel && (
          <AIGeneratePanel
            t={t}
            l={l}
            panelRef={aiPanelRef}
            defaultActivityType={activityType}
            deckSubject={subject}
            deckGrade={grade}
            deckLanguage={deckLang}
            onGenerated={handleAIGenerated}
            onLanguageChange={(newLang) => setDeckLang(newLang)}
            onCancel={() => { setShowAIPanel(false); setAiDropReport(null); }}
            dropReport={aiDropReport}
          />
        )}

        {/* Warnings no-bloqueantes de la generación (truncado, calidad
            filtrada). Banner amarillo, dismissable. Unifica todos los avisos
            post-generación para que el profe vea UN solo mensaje. */}
        {!showAIPanel && aiGenerationWarnings.length > 0 && (
          <div style={{
            marginTop: 10, padding: "10px 14px", borderRadius: 8,
            background: "#fff8e6", border: "1px solid #f0d090",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
            fontSize: 12, color: "#7a5500", lineHeight: 1.5,
          }}>
            <div style={{ flex: 1 }}>
              {aiGenerationWarnings.map((w, i) => {
                if (w.code === "truncated") {
                  return (
                    <div key={i}>
                      {(t.aiTruncatedMsg || "Source was very long ({total} chars). The AI used the first {used} chars only — review the questions to make sure key topics are covered.")
                        .replace("{total}", String(w.originalLength))
                        .replace("{used}", String(w.usedLength))}
                    </div>
                  );
                }
                if (w.code === "quality_filtered") {
                  // Dos variantes según qué % pasó el filtro:
                  //  - Suave (≥70% pasaron): "X de Y listas para usar"
                  //  - Fuerte (<70% pasaron): "Solo X de Y. Considera material
                  //    más extenso o cambiar de tipo"
                  const requested = w.requested || (w.delivered + w.dropped);
                  const passRate = requested > 0 ? w.delivered / requested : 1;
                  const isSoft = passRate >= 0.7;
                  const template = isSoft
                    ? (t.aiQualityFilteredSoft || "{delivered} of {requested} ready to use ({dropped} filtered for quality).")
                    : (t.aiQualityFilteredHard || "Only {delivered} of {requested} passed the quality check. Try a richer source or a single question type.");
                  return (
                    <div key={i}>
                      {template
                        .replace("{delivered}", String(w.delivered))
                        .replace("{requested}", String(requested))
                        .replace("{dropped}", String(w.dropped))}
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setAiGenerationWarnings([])}
              style={{
                background: "transparent", border: "none", color: "#7a5500",
                fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1,
                flexShrink: 0,
              }}
              aria-label={t.cancel}
            >×</button>
          </div>
        )}

        {/* Type Selector — appears below the list when triggered */}
        {showTypeSelector && (
          <div ref={typeSelectorRef} className="fade-up dk-type-picker" style={{
            marginTop: questions.length > 0 ? 12 : 0,
            padding: 18,
            borderRadius: 12,
            background: C.bg,
            border: `2px solid ${C.accent}`,
            boxShadow: `0 6px 20px ${C.accent}22`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.text }}>{t.chooseType}</h4>
              <button
                className="dk-btn-secondary"
                onClick={() => setShowTypeSelector(false)}
                style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: "transparent", color: C.textMuted, border: "none",
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                }}
              >{t.cancel}</button>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8,
            }}>
              {ACTIVITY_TYPES.map(at => (
                <button
                  key={at.id}
                  className="dk-type-card"
                  onClick={() => addQuestion(at.id)}
                  style={{
                    padding: "16px 10px",
                    borderRadius: 10,
                    background: C.bg,
                    border: `1.5px solid ${C.border}`,
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    transition: "all .15s ease",
                    minHeight: 80,
                  }}
                >
                  <CIcon name={at.icon} size={28} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, textAlign: "center", lineHeight: 1.2 }}>{at.label[l]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add another button at the bottom — opens selector */}
        {questions.length > 0 && !showTypeSelector && (
          <button
            className="dk-add-another"
            onClick={openTypeSelector}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "14px 16px",
              borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              background: C.bg, color: C.accent,
              border: `1.5px dashed ${C.accent}66`,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s ease",
            }}
          >
            <CIcon name="plus" size={16} inline /> {t.addAnother}
          </button>
        )}

        {/* Empty state — full friendly call to action */}
        {questions.length === 0 && !showTypeSelector && (
          <div style={{ textAlign: "center", padding: 36, background: C.bgSoft, borderRadius: 12, border: `1px dashed ${C.border}` }}>
            <CIcon name="question" size={32} />
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 10, marginBottom: 14 }}>{t.questionsEmpty}</p>
            <button
              className="dk-btn"
              onClick={openTypeSelector}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
              }}
            >{t.addQuestion}</button>
          </div>
        )}
      </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="dk-btn" onClick={handleSave} disabled={!canSave || saving} style={{
          flex: 1, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
          background: canSave ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
          color: "#fff", opacity: canSave && !saving ? 1 : 0.4,
        }}>{saving ? t.publishing : t.publish}</button>
      </div>

      {/* Ghost element following the pointer during drag (visual clone) */}
      {ghostState && (
        <div
          className="dk-q-ghost"
          style={{
            left: ghostState.x,
            top: ghostState.y,
            width: ghostState.width,
          }}
          dangerouslySetInnerHTML={{ __html: ghostState.html }}
        />
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────

export default CreateDeckEditor;
