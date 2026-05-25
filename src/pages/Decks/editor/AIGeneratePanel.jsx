// ─── AI Generate Panel ───────────────────────────────────────────────────
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

import { useState, useRef } from "react";
import { generateQuestions, AIError, SUPPORTED_FILES } from "../../../lib/ai";
import { C } from "../styles";
import AIIcon from "../../../components/AIIcon";
import Button from "../../../components/ui/Button";
import { inputStyle as inp, selectStyle as sel } from "../../../components/forms/field-styles";
import { FieldLabel } from "../../../components/forms/FieldLabel";
import { ACTIVITY_TYPES } from "./constants";
import { sectionToLessonContext, sectionLabels } from "../../../lib/class-hierarchy";

// Tipos que el dropdown del panel AI ofrece. Orden importa — pongo primero los
// más usados pedagógicamente y "Mixto" arriba como recomendado.
//   - "mix" es un meta-tipo: la AI devuelve preguntas de tipos variados, cada
//     item con su propio q.type. El editor renderiza cada uno como corresponde.
//   - "poll" sigue afuera porque el editor no lo renderiza todavía.
const AI_SUPPORTED_TYPES = ["mix", "mcq", "tf", "fill", "order", "match", "free", "sentence", "slider"];

// "From my document" image source only works for PPTX — that's the one format
// we can pull embedded images out of. Used to gate the source option + defaults.
const isPptx = (f) => !!f && /\.pptx$/i.test(f.name);

export default function AIGeneratePanel({
  t, l,
  panelRef,
  defaultActivityType,
  deckSubject,
  deckGrade,
  deckLanguage,        // idioma del deck — single source of truth.
  setDeckLanguage,     // setter del editor padre. El selector AI escribe acá
                       // directamente. NO mantenemos un state local separado:
                       // intentos previos con `aiLanguage` + `useEffect` de sync
                       // generaban bugs sutiles donde el panel y General se
                       // desincronizaban silenciosamente. Una sola fuente de
                       // verdad = imposible que diverjan.
  section,             // El section del deck (warmup | exit_ticket | general_review).
                       // Single source of truth: derivamos lessonContext de acá
                       // en vez de tener su propio dropdown duplicado. Si el profe
                       // crea un "+ New warmup" desde ClassPage, el AI genera con
                       // prompt de warmup automáticamente — sin que tenga que
                       // recordar elegirlo otra vez en este panel.
  onGenerated,
  onCancel,
  dropReport,          // {kept, dropped} cuando handleAIGenerated descartó preguntas
}) {
  // El panel AI siempre arranca en "mix" porque es el flujo recomendado para
  // warmups y exit tickets reales (mezcla pedagógica > monotipo). Ignoramos el
  // tipo activo del editor — ese se usa para "Add question" manual, no para AI.
  const [aiActivityType, setAiActivityType] = useState("mix");
  const [numQuestions, setNumQuestions] = useState(5);
  // lessonContext se deriva de section. Una sola fuente de verdad — antes
  // teníamos un dropdown propio acá que arrancaba siempre en "warmup",
  // ignorando si el deck era exit ticket o general review. Ahora la AI
  // siempre genera con el flavor correcto sin que el profe tenga que
  // recordar setearlo dos veces.
  const lessonContext = sectionToLessonContext(section);
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  // Track A (A-img-3): two-axis image control.
  //   imageSource — where pictures come from: "document" (a PPTX's own embedded
  //     images, only when a .pptx is attached), "ai" (generate with Gemini), or
  //     "none". Defaults to the document's images for a PPTX, else "none" so we
  //     never spend on AI images without an explicit opt-in.
  //   imageMode — how they're used: "illustrate" (visual support) or "about"
  //     (the picture carries what the question asks). Hidden when source=none.
  const [imageSource, setImageSource] = useState("none");
  const [imageMode, setImageMode] = useState("illustrate");
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
    // A PPTX brings its own images, so default to reusing them. Any other file
    // can't satisfy a "document" source — drop back to "none" if we were on it.
    if (isPptx(f)) setImageSource("document");
    else setImageSource((s) => (s === "document" ? "none" : s));
  };

  const clearFile = () => {
    setFile(null);
    setFileError("");
    if (aiFileInputRef.current) aiFileInputRef.current.value = "";
    setImageSource((s) => (s === "document" ? "none" : s));
  };

  // Generate solo se habilita cuando hay material (file o topic) Y el idioma
  // está seteado. Forzamos elección consciente del idioma para evitar bugs
  // sutiles donde un default no coincide con lo que el profe espera.
  const canGenerate = !generating && (file || topic.trim().length >= 3) && Boolean(deckLanguage);

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
        language: deckLanguage,
        file,
        lessonContext,
        imageSource,
        imageMode,
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
      // Single source of truth: deckLanguage es el idioma del deck. El selector
      // del panel AI escribe directamente con setDeckLanguage, así que no hay
      // que propagar nada — el editor padre ya está actualizado.
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
        // all_rejected: Haiku descartó las N preguntas. El message del error
        // ya viene compuesto en lib/ai.js con el reason más común y guía al
        // profe ("usually means the deck's subject doesn't match..."). Lo
        // mostramos tal cual — más informativo que cualquier copy genérico.
        else if (err.code === "all_rejected") setError(err.message);
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
          <AIIcon size={14} /> {t.aiPanelTitle}
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

      {/* File uploader. Source material is the single biggest lever for
          AI quality — when teachers attach the actual lesson, generated
          questions stay anchored to what students have seen. Without it,
          the AI works from the topic name alone, which often produces
          off-target content. So we visually elevate this block: a small
          "recommended" pill in the label, an accent-tinted upload button
          (instead of a quiet gray dashed one), and a longer hint text
          that explains the *why*. */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, fontWeight: 600, color: C.textSecondary,
          marginBottom: 6,
        }}>
          <span>{t.aiSourceLabel.split("—")[0].trim()}</span>
          {/* Inline "recommended" pill — extracted from the label string
              so it renders as a visual badge, not part of the prose. */}
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "2px 7px", borderRadius: 999,
            background: C.accentSoft,
            color: C.accent,
            lineHeight: 1.4,
          }}>
            {/* Picks "recommended" / "muy recomendado" / "권장" from
                the locale's label, after the em-dash. */}
            {(t.aiSourceLabel.split("—")[1] || "recommended").trim()}
          </span>
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
                width: "100%", padding: "16px 12px", borderRadius: 8,
                // Accent-tinted instead of gray-dashed: signals "you
                // probably want to do this" rather than a neutral option.
                border: `1.5px dashed ${C.accent}`,
                background: C.accentSoft,
                color: C.accent,
                fontSize: 13, fontWeight: 600,
                cursor: generating ? "not-allowed" : "pointer",
                fontFamily: "'Outfit',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "transform .12s ease, box-shadow .12s ease",
              }}
              onMouseEnter={e => {
                if (!generating) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4v12M6 10l6-6 6 6M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.aiUploadCta}
            </button>
            <p style={{
              fontSize: 11.5, color: C.textSecondary,
              margin: "8px 0 0", lineHeight: 1.5,
            }}>
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
            >{"×"}</button>
          </div>
        )}
        {fileError && <p style={{ fontSize: 11, color: "#d23", margin: "6px 0 0" }}>{fileError}</p>}
      </div>

      {/* Track A (A-img-3): two-axis image control. Source = where pictures
          come from; How = how the question uses them. "From my document" only
          appears for a PPTX (the one format we can extract images from). The
          "How" selector + hint are hidden when there are no images. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: imageSource === "none" ? 14 : 6 }}>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <FieldLabel dense>{t.aiImgSourceLabel}</FieldLabel>
          <select
            value={imageSource}
            onChange={(e) => setImageSource(e.target.value)}
            disabled={generating}
            style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
          >
            {isPptx(file) && <option value="document">{t.aiImgSourceDoc}</option>}
            <option value="ai">{t.aiImgSourceAi}</option>
            <option value="none">{t.aiImgSourceNone}</option>
          </select>
        </div>
        {imageSource !== "none" && (
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <FieldLabel dense>{t.aiImgModeLabel}</FieldLabel>
            <select
              value={imageMode}
              onChange={(e) => setImageMode(e.target.value)}
              disabled={generating}
              style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
            >
              <option value="illustrate">{t.aiImgModeIllustrate}</option>
              <option value="about">{t.aiImgModeAbout}</option>
            </select>
          </div>
        )}
      </div>
      {imageSource !== "none" && (
        <p style={{ fontSize: 11.5, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>
          {imageSource === "ai"
            ? (imageMode === "about" ? t.aiImgHintAiAbout : t.aiImgHintAiIllustrate)
            : (imageMode === "about" ? t.aiImgHintAbout : t.aiImgHintIllustrate)}
        </p>
      )}

      {/* Topic + key points */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel dense>{file ? t.aiTopicOptional : t.aiTopicRequired}</FieldLabel>
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
        <FieldLabel dense>{t.aiKeyPointsLabel}</FieldLabel>
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
          <FieldLabel dense>{t.aiTypeLabel}</FieldLabel>
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
          <FieldLabel dense>{t.aiCountLabel}</FieldLabel>
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
          <FieldLabel dense>{t.aiContextLabel}</FieldLabel>
          {/* Read-only display — the AI's lessonContext is derived from the
              deck's section (set in the General tab). Shows the same value
              the AI prompt will use, so the teacher can verify, but no
              independent dropdown that could drift out of sync. To change
              it, switch the section on the General tab. */}
          {(() => {
            const labels = sectionLabels(l);
            const sectionName = labels[section]?.name || section;
            return (
              <div
                title={t.aiContextHelp || ""}
                style={{
                  ...sel,
                  padding: "7px 10px",
                  fontSize: 12,
                  width: "100%",
                  background: C.bgSoft,
                  cursor: "default",
                  display: "flex",
                  alignItems: "center",
                  color: C.textSecondary,
                  // Override `sel`'s dropdown caret arrow background image.
                  backgroundImage: "none",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {sectionName}
              </div>
            );
          })()}
        </div>
        <div style={{ flex: "0 0 130px" }}>
          <FieldLabel dense>{t.aiLanguageLabel}</FieldLabel>
          <select
            value={deckLanguage || ""}
            onChange={(e) => setDeckLanguage(e.target.value)}
            disabled={generating}
            style={{ ...sel, padding: "7px 28px 7px 10px", fontSize: 12, width: "100%" }}
          >
            <option value="" disabled hidden>{t.aiLanguagePlaceholder}</option>
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

      <Button
        type="button"
        variant="primary"
        fullWidth
        loading={generating}
        disabled={!canGenerate}
        onClick={handleGenerate}
        leftIcon={<AIIcon size={13} />}
      >
        {generating
          ? (imageSource === "ai" ? t.aiGeneratingImages : t.aiGenerating)
          : t.aiGenerateCta}
      </Button>

      {/* AI image generation adds the image step + quality check on top of the
          questions, so it's noticeably slower. Reassure the teacher the wait is
          expected (and that it hasn't frozen) while it runs. */}
      {generating && imageSource === "ai" && (
        <p style={{
          fontSize: 11.5, color: C.textSecondary,
          margin: "8px 0 0", textAlign: "center", lineHeight: 1.5,
        }}>
          {t.aiGeneratingImagesHint}
        </p>
      )}
    </div>
  );
}
