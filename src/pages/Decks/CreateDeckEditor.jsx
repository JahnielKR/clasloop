// ─── Create / Edit Deck Editor ──────────────────────────────────────────────
// Extracted from the parent Decks.jsx. Owns the entire deck creation/edit
// flow: cover (color, icon, image, presets), General tab (title/desc/class),
// Customize tab (subject/grade/language/tags), Questions tab (drag-drop,
// per-type forms, anti-republish coverage gate), and the publish action.
//
// Receives `t` (i18n strings) as a prop from Decks.jsx so it doesn't need
// its own copy of the locale dictionary.

import { estimateDeckSeconds, formatDeckDuration } from "../../lib/time-limits";
import { CIcon } from "../../components/Icons";
import {
  DeckCover,
  DECK_COLORS, DECK_ICONS,
  PRESET_PATTERNS, presetToDataUrl,
  resolveColor,
} from "../../lib/deck-cover";
import { MONO } from "../../components/tokens";
import AIIcon from "../../components/AIIcon";
import { C } from "./styles";
import { SECTIONS, sectionLabels, resolveClassAccent } from "../../lib/class-hierarchy";
import { SUBJECTS } from "../../lib/constants";
import CleoTour from "../../onboarding/CleoTour";
import { finishJourney } from "../../onboarding/journey";
import { getStrings } from "../../i18n";
import DeckCardPreview from "./editor/DeckCardPreview";
import AutoResizeTextarea from "./editor/AutoResizeTextarea";
import AIGeneratePanel from "./editor/AIGeneratePanel";
import { ACTIVITY_TYPES, addMiniBtn, miniDeleteBtn, iconOverImageBtn } from "./editor/constants";
import { useDeckEditor } from "./editor/useDeckEditor";

// ── Editor-local style objects ─────────────────────────────────────────────
// PR 139 (M3): input/select styles come from the shared field-styles module.
import { inputStyle as inp, selectStyle as sel } from "../../components/forms/field-styles";

function CreateDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck, prefilledClassId = null, prefilledSection = null, prefilledUnitId = null, prefilledPosition = null, profile = null, onNeedClass, autoStartTour = false }) {
  const ed = useDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck, prefilledClassId, prefilledSection, prefilledUnitId, prefilledPosition, profile, onNeedClass, autoStartTour });
  const {
    isMobile,
    inEditorLeg,
    editorLaunch,
    title, setTitle,
    desc, setDesc,
    subject, setSubject,
    grade, setGrade,
    deckLang, setDeckLang,
    tags, setTags,
    classId, setClassId,
    section, setSection,
    makePublic, setMakePublic,
    activityType,
    questions,
    saving,
    coverColor, setCoverColor,
    coverIcon, setCoverIcon,
    coverImageUrl,
    uploading,
    uploadError,
    editorTab, setEditorTab,
    fileInputRef,
    originalAuthorName,
    derivation,
    expandedQ, setExpandedQ,
    dragIndex,
    dragOverIndex,
    flashIndex,
    showTypeSelector, setShowTypeSelector,
    showAIPanel, setShowAIPanel,
    aiDropReport, setAiDropReport,
    aiGenerationWarnings, setAiGenerationWarnings,
    questionRefs,
    typeSelectorRef,
    aiPanelRef,
    openAIPanel,
    handleAIGenerated,
    addQuestion,
    openTypeSelector,
    updateQ,
    updateOption,
    updateItem,
    updatePair,
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
    optionUploading,
    optionFileRef,
    triggerOptionUpload,
    handleOptionFileChange,
    removeOptionImage,
    qImageUploading,
    qImageFileRef,
    triggerQImageUpload,
    handleQImageFileChange,
    removeQImage,
    removeQ,
    isQComplete,
    shortType,
    ghostState,
    handleHandlePointerDown,
    handleImagePick,
    handleImageChange,
    handleSelectPreset,
    handleClearCover,
    coverMode,
    canSave,
    handleSave,
  } = ed;

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

      {/* First-visit guided tour — name → class → type → language → AI/manual
          → save. The AI step lives on the Questions tab, so the tour switches
          tabs for us (the overlay is modal — the user can't click there). */}
      <CleoTour
        tourId={inEditorLeg ? "jEditor" : "deckEditor"}
        lang={l}
        userId={userId}
        enabled={profile?.role === "teacher"}
        autoStart={autoStartTour || inEditorLeg || editorLaunch.autoStart}
        force={inEditorLeg || editorLaunch.force}
        onSkip={inEditorLeg ? () => finishJourney(userId) : undefined}
        onStepChange={(_i, step) => {
          if (step?.anchor === "ai-generate") setEditorTab("questions");
          else if (
            step?.anchor === "deck-title" || step?.anchor === "deck-class" ||
            step?.anchor === "deck-section" || step?.anchor === "deck-language"
          ) setEditorTab("general");
        }}
      />

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
            <input className="dk-input" data-tour="deck-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.description}</label>
            <textarea className="dk-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.descPlaceholder} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>
          {/* Class selection. Three layers:
                1. If a class is selected, a colored pill shows "Adding to: ClassName"
                   so the teacher always knows the context, even when they came in
                   from a class page (where this is supposed to be obvious but
                   the form's emptiness made it confusing).
                2. The select itself — for switching/clearing.
                3. The section selector below — only meaningful when a class is set. */}
          {classId && (() => {
            const selectedClass = userClasses.find(c => c.id === classId);
            if (!selectedClass) return null;
            const clsAccent = resolveClassAccent(selectedClass);
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: clsAccent + "10",
                  border: `1px solid ${clsAccent}33`,
                  borderRadius: 10,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: clsAccent,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <CIcon name="school" size={14} inline />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {t.addingToClass}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2, wordBreak: "break-word" }}>
                    {selectedClass.name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }}>
                    {selectedClass.subject} · {selectedClass.grade}
                  </div>
                </div>
              </div>
            );
          })()}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.addToClass} *</label>
            <select className="dk-input" data-tour="deck-class" value={classId} onChange={e => {
              const id = e.target.value;
              setClassId(id);
              if (id) {
                const cls = userClasses.find(c => c.id === id);
                if (cls) { setSubject(cls.subject); setGrade(cls.grade); }
              }
            }} style={sel}>
              {/* Class is now required — no "no class" option. We start
                  with a disabled placeholder so the teacher must pick. */}
              <option value="" disabled>
                {userClasses.length === 0 ? (t.noClassesYet || "No classes yet") : (t.classPickPrompt || "Pick a class…")}
              </option>
              {userClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject} · {c.grade})</option>)}
            </select>
            {/* Unblock a teacher who reached the editor with no class yet (e.g.
                skipped the welcome): a warmup can't be saved without one, so
                point them at where classes are created instead of dead-ending
                on a disabled "No classes yet". */}
            {userClasses.length === 0 && onNeedClass && (() => {
              const tOb = getStrings("onboarding", l);
              return (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: C.textMuted, fontFamily: "'Outfit',sans-serif" }}>{tOb.needClassBody}</span>
                  <button
                    type="button"
                    onClick={onNeedClass}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: C.accent, background: C.accentSoft, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                  >
                    {tOb.needClassCta}
                  </button>
                </div>
              );
            })()}
          </div>
          {/* Section selector — only meaningful when a class is set. We still
              render it greyed out when no class so the teacher knows the
              option exists; tooltip explains. */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>
              {t.sectionLabel}
            </label>
            <select
              className="dk-input"
              data-tour="deck-section"
              value={section}
              onChange={e => setSection(e.target.value)}
              disabled={!classId}
              style={{ ...sel, opacity: classId ? 1 : 0.55, cursor: classId ? "pointer" : "not-allowed" }}
              title={classId ? t.sectionHelp : t.sectionLockedHelp}
            >
              {/* Empty placeholder option — forces an explicit choice
                  rather than silently defaulting to general_review. */}
              <option value="" disabled>
                {t.sectionPlaceholder || "Choose a session type…"}
              </option>
              {SECTIONS.map(s => {
                const labels = sectionLabels(l);
                return <option key={s.id} value={s.id}>{labels[s.id]?.name || s.id}</option>;
              })}
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
              <select className="dk-input" data-tour="deck-language" value={deckLang || ""} onChange={e => setDeckLang(e.target.value)} style={sel}>
                <option value="" disabled hidden>{t.aiLanguagePlaceholder}</option>
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
              data-tour="ai-generate"
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
              <AIIcon size={13} /> {t.aiGenerateButton}
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
                        <>
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
                            alt={q.image_alt || q.q || t.questionImageHint}
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
                        {/* PR 152 (M31): alt text the teacher can write so screen
                            readers describe the image; falls back to q.q. */}
                        <input
                          type="text"
                          value={q.image_alt || ""}
                          onChange={e => updateQ(qi, "image_alt", e.target.value)}
                          placeholder={t.imageAltPlaceholder}
                          style={{
                            width: "100%", marginBottom: 10, padding: "8px 10px",
                            fontSize: 12.5, border: `1px solid ${C.border}`,
                            borderRadius: 8, background: C.bg, color: C.text,
                            fontFamily: "'Outfit',sans-serif", boxSizing: "border-box",
                          }}
                        />
                        </>
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
                              <span style={{ color: C.textMuted }}>{"\u2192"}</span>
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

          {/* "+ same type" button — pinned right under the last question
              of the deck. Saves a click for the common workflow "I'm
              writing a sequence of MCQs and want another one just like
              the last". Only renders when:
                - there's at least one question
                - the last question has a non-empty prompt (otherwise
                  duplicating the type while the previous one is still
                  blank doesn't help anyone)
                - the type selector and AI panel aren't open (they take
                  precedence as the active surface)
              The full type picker stays available below as "+ Add
              another", so this is purely a shortcut, not a replacement. */}
          {(() => {
            if (questions.length === 0) return null;
            if (showTypeSelector || showAIPanel) return null;
            const lastQ = questions[questions.length - 1];
            const lastPrompt = (lastQ?.q || "").trim();
            if (!lastPrompt) return null;
            const lastType = lastQ?.type || "mcq";
            const typeMeta = ACTIVITY_TYPES.find(a => a.id === lastType);
            // Sentence has a different shape (required_word) but the AI
            // generator and editor handle it the same way at the row level;
            // duplicating the type still makes sense.
            const shortLabel = typeMeta?.short?.[l] || typeMeta?.short?.en || lastType.toUpperCase();
            return (
              <button
                onClick={() => addQuestion(lastType)}
                title={typeMeta?.label?.[l] || lastType}
                style={{
                  alignSelf: "flex-start",
                  marginTop: 2,
                  padding: "6px 12px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "transparent",
                  color: C.accent,
                  border: `1px dashed ${C.accent}55`,
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "background .12s ease, border-color .12s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.accentSoft; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${C.accent}55`; }}
              >
                + {shortLabel}
              </button>
            );
          })()}
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
            setDeckLanguage={setDeckLang}
            section={section}
            onGenerated={handleAIGenerated}
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
                  const baseMsg = template
                    .replace("{delivered}", String(w.delivered))
                    .replace("{requested}", String(requested))
                    .replace("{dropped}", String(w.dropped));
                  return (
                    <div key={i}>
                      {baseMsg}
                      {/* Surface Haiku's most-common reason when we have
                          one — turns "5 dropped" into "5 dropped: mostly
                          'Spanish content, not history'", which is what
                          the teacher needs to know. */}
                      {w.topReason && (
                        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                          {(t.aiQualityReason || "Most common reason: \"{reason}\"")
                            .replace("{reason}", w.topReason)}
                        </div>
                      )}
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
            >{"\u00D7"}</button>
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

        {/* Add another row at the bottom — same pair of CTAs as the header
            (Generate with AI + Add question), so a teacher mid-edit on a
            big deck (e.g. 38 questions) doesn't have to scroll back up to
            keep generating. Both buttons drive the same handlers as the
            top row — just placed where the eye lands after the last
            question. Hidden when the AI panel or type selector are open
            so the inline form takes focus. */}
        {questions.length > 0 && !showTypeSelector && !showAIPanel && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {/* AI shortcut — compact sparkle-only square. The full
                "Generate with AI" CTA lives in the header at the top of
                the questions list, where context for first-time users
                makes sense. Down here, after dozens of questions, the
                affordance just needs to be reachable; the icon plus a
                tooltip is enough. Tooltip uses the same i18n key as the
                top button. */}
            <button
              className="dk-add-another"
              onClick={openAIPanel}
              title={t.aiGenerateButton}
              aria-label={t.aiGenerateButton}
              style={{
                width: 52,
                flexShrink: 0,
                padding: "14px 0",
                borderRadius: 10,
                fontSize: 18,
                fontWeight: 600,
                background: C.bg, color: C.accent,
                border: `1.5px dashed ${C.accent}66`,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s ease",
              }}
            >
              <AIIcon size={16} />
            </button>
            <button
              className="dk-add-another"
              onClick={openTypeSelector}
              style={{
                flex: 1,
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
          </div>
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
        <button className="dk-btn" data-tour="save-deck" onClick={handleSave} disabled={!canSave || saving} style={{
          flex: 1, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
          // Disabled (empty deck) stays READABLE — a muted gray label on a soft
          // surface, not white-on-light. It flips to the accent gradient once the
          // deck is saveable (name + a question + class). Theme-aware tokens.
          background: canSave ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.bgSoft,
          color: canSave ? "#fff" : C.textSecondary,
          opacity: saving ? 0.7 : 1,
          cursor: (!canSave || saving) ? "not-allowed" : "pointer",
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
