// ─── Deck editor — General tab ───────────────────────────────────────────
// Presentational block for the editor's "General" tab: title/description,
// class + section selection, subject/grade/language, tags, and the
// make-public toggle (with derivation/anti-republish feedback). Pure
// relocation from CreateDeckEditor — receives the hook object `ed` whole.

import { CIcon } from "../../../components/Icons";
import { resolveClassAccent } from "../../../lib/class-hierarchy";
import { SECTIONS, sectionLabels } from "../../../lib/class-hierarchy";
import { SUBJECTS } from "../../../lib/constants";
import { getStrings } from "../../../i18n";
import { C } from "../styles";
import { inputStyle as inp, selectStyle as sel } from "../../../components/forms/field-styles";

export default function GeneralTab({ ed, t, l, userClasses, onNeedClass }) {
  const {
    title, setTitle,
    desc, setDesc,
    subject, setSubject,
    grade, setGrade,
    deckLang, setDeckLang,
    tags, setTags,
    classId, setClassId,
    section, setSection,
    makePublic, setMakePublic,
    originalAuthorName,
    derivation,
  } = ed;

  return (
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
  );
}
