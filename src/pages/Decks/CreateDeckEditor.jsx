// ─── Create / Edit Deck Editor ──────────────────────────────────────────────
// Extracted from the parent Decks.jsx. Owns the entire deck creation/edit
// flow: cover (color, icon, image, presets), General tab (title/desc/class),
// Customize tab (subject/grade/language/tags), Questions tab (drag-drop,
// per-type forms, anti-republish coverage gate), and the publish action.
//
// Receives `t` (i18n strings) as a prop from Decks.jsx so it doesn't need
// its own copy of the locale dictionary.

import { CIcon } from "../../components/Icons";
import { DeckCover } from "../../lib/deck-cover";
import { C } from "./styles";
import CleoTour from "../../onboarding/CleoTour";
import { finishJourney } from "../../onboarding/journey";
import GeneralTab from "./editor/GeneralTab";
import CustomizeTab from "./editor/CustomizeTab";
import QuestionsTab from "./editor/QuestionsTab";
import { useDeckEditor } from "./editor/useDeckEditor";

function CreateDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck, prefilledClassId = null, prefilledSection = null, prefilledUnitId = null, prefilledPosition = null, profile = null, onNeedClass, autoStartTour = false }) {
  const ed = useDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck, prefilledClassId, prefilledSection, prefilledUnitId, prefilledPosition, profile, onNeedClass, autoStartTour });
  const {
    isMobile,
    inEditorLeg,
    editorLaunch,
    subject,
    questions,
    saving,
    coverColor,
    coverIcon,
    coverImageUrl,
    editorTab, setEditorTab,
    optionFileRef,
    handleOptionFileChange,
    qImageFileRef,
    handleQImageFileChange,
    ghostState,
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
        {editorTab === "general" && <GeneralTab ed={ed} t={t} l={l} userClasses={userClasses} onNeedClass={onNeedClass} />}

        {/* ── Tab: Customize ── */}
        {editorTab === "customize" && <CustomizeTab ed={ed} t={t} />}

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
      {editorTab === "questions" && <QuestionsTab ed={ed} t={t} l={l} />}

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
