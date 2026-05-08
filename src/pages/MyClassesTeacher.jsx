import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon, SchoolIcon } from "../components/Icons";
import { useIsMobile } from "../components/MobileMenuButton";
import CreateClassModal from "../components/CreateClassModal";
import ImportClassModal from "../components/ImportClassModal";
import { C, MONO } from "../components/tokens";
import { ROUTES, QUERY, buildPathWithOpts, buildRoute } from "../routes";
import { resolveClassAccent } from "../lib/class-hierarchy";

// ─── i18n ────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "My Classes",
    subtitle: "Your classrooms — share the code so students can join.",
    newClass: "+ New class",
    noClassesYet: "No classes yet",
    noClassesSub: "Create your first class so your students can join with a code.",
    createFirst: "Create your first class",
    code: "Code",
    copyCode: "Copy code",
    copied: "Copied!",
    decks: "decks",
    students: "students",
    student: "student",
    deck: "deck",
    openClass: "Open",
    schoolAnalytics: "School analytics",
    importClass: "Import",
    // Real import modal strings (used by ImportClassModal)
    import_title: "Import class",
    import_description: "Pick a JSON file you've previously exported from a Clasloop class. The class is created fresh — you can rename it before confirming.",
    import_pickFile: "Choose JSON file",
    import_changeFile: "Choose another file",
    import_cancel: "Cancel",
    import_close: "Close",
    import_previewTitle: "Ready to import",
    import_className: "Class name",
    import_classNamePlaceholder: "Class name",
    import_willImport: "Will import",
    import_unitsCount: "{n} units",
    import_decksCount: "{n} decks",
    import_fromOriginal: "From export of \"{name}\"",
    import_importButton: "Import class",
    import_importing: "Importing...",
    import_errorReadFile: "Couldn't read the file.",
    import_errorParseJson: "This file isn't valid JSON.",
    import_errorEmptyName: "Class name can't be empty.",
    import_errorImportFailed: "Could not import class.",
    import_errorWrongSchema: "This file isn't a Clasloop class export.",
    import_errorNoClass: "The file is missing the class info.",
    import_errorTooManyUnits: "This export has too many units (limit: {max}).",
    import_errorTooManyDecks: "This export has too many decks (limit: {max}).",
    import_errorInvalidGeneric: "The file structure isn't valid.",
    importedToast: "Imported \"{name}\" — code {code}",
    loading: "Loading...",
    grade: "Grade",
    subject: "Subject",
    // Modal keys (used by CreateClassModal)
    createClass: "Create class",
    className: "Class name",
    classNamePlaceholder: "e.g. Math 6th Grade",
    classSubject: "Subject",
    classGrade: "Grade",
    classGradePlaceholder: "e.g. 6th, 7th–9th, Mixed",
    cancel: "Cancel",
    classCreate: "Create class",
    creating: "Creating...",
    classCreated: "Class created!",
  },
  es: {
    pageTitle: "Mis clases",
    subtitle: "Tus salones — comparte el código para que los estudiantes entren.",
    newClass: "+ Nueva clase",
    noClassesYet: "Aún no tienes clases",
    noClassesSub: "Crea tu primera clase para que tus estudiantes entren con un código.",
    createFirst: "Crear primera clase",
    code: "Código",
    copyCode: "Copiar código",
    copied: "¡Copiado!",
    decks: "decks",
    students: "estudiantes",
    student: "estudiante",
    deck: "deck",
    openClass: "Abrir",
    schoolAnalytics: "Estadísticas escolares",
    importClass: "Importar",
    import_title: "Importar clase",
    import_description: "Elige un archivo JSON que hayas exportado previamente desde una clase de Clasloop. La clase se crea nueva — puedes renombrarla antes de confirmar.",
    import_pickFile: "Elegir archivo JSON",
    import_changeFile: "Elegir otro archivo",
    import_cancel: "Cancelar",
    import_close: "Cerrar",
    import_previewTitle: "Listo para importar",
    import_className: "Nombre de la clase",
    import_classNamePlaceholder: "Nombre de la clase",
    import_willImport: "Se importará",
    import_unitsCount: "{n} unidades",
    import_decksCount: "{n} decks",
    import_fromOriginal: "Del export de \"{name}\"",
    import_importButton: "Importar clase",
    import_importing: "Importando...",
    import_errorReadFile: "No se pudo leer el archivo.",
    import_errorParseJson: "Este archivo no es JSON válido.",
    import_errorEmptyName: "El nombre no puede estar vacío.",
    import_errorImportFailed: "No se pudo importar la clase.",
    import_errorWrongSchema: "Este archivo no es un export de clase de Clasloop.",
    import_errorNoClass: "El archivo no tiene información de la clase.",
    import_errorTooManyUnits: "Este export tiene demasiadas unidades (límite: {max}).",
    import_errorTooManyDecks: "Este export tiene demasiados decks (límite: {max}).",
    import_errorInvalidGeneric: "La estructura del archivo no es válida.",
    importedToast: "Importada \"{name}\" — código {code}",
    loading: "Cargando...",
    grade: "Grado",
    subject: "Materia",
    createClass: "Crear clase",
    className: "Nombre de la clase",
    classNamePlaceholder: "ej. Matemáticas 6to",
    classSubject: "Materia",
    classGrade: "Grado",
    classGradePlaceholder: "ej. 6to, 7mo–9no, Mixto",
    cancel: "Cancelar",
    classCreate: "Crear clase",
    creating: "Creando...",
    classCreated: "¡Clase creada!",
  },
  ko: {
    pageTitle: "내 수업",
    subtitle: "내 교실 — 코드를 공유하면 학생이 참여할 수 있어요.",
    newClass: "+ 새 수업",
    noClassesYet: "아직 수업이 없어요",
    noClassesSub: "첫 수업을 만들어 학생들이 코드로 참여하게 하세요.",
    createFirst: "첫 수업 만들기",
    code: "코드",
    copyCode: "코드 복사",
    copied: "복사됨!",
    decks: "덱",
    students: "학생",
    student: "학생",
    deck: "덱",
    openClass: "열기",
    schoolAnalytics: "학교 분석",
    importClass: "가져오기",
    import_title: "수업 가져오기",
    import_description: "Clasloop 수업에서 이전에 내보낸 JSON 파일을 선택하세요. 수업은 새로 생성되며, 확인 전에 이름을 바꿀 수 있습니다.",
    import_pickFile: "JSON 파일 선택",
    import_changeFile: "다른 파일 선택",
    import_cancel: "취소",
    import_close: "닫기",
    import_previewTitle: "가져올 준비 완료",
    import_className: "수업 이름",
    import_classNamePlaceholder: "수업 이름",
    import_willImport: "가져옴",
    import_unitsCount: "단원 {n}개",
    import_decksCount: "덱 {n}개",
    import_fromOriginal: "\"{name}\"의 내보내기에서",
    import_importButton: "수업 가져오기",
    import_importing: "가져오는 중...",
    import_errorReadFile: "파일을 읽을 수 없습니다.",
    import_errorParseJson: "유효한 JSON 파일이 아닙니다.",
    import_errorEmptyName: "수업 이름을 입력하세요.",
    import_errorImportFailed: "수업을 가져올 수 없습니다.",
    import_errorWrongSchema: "Clasloop 수업 내보내기 파일이 아닙니다.",
    import_errorNoClass: "파일에 수업 정보가 없습니다.",
    import_errorTooManyUnits: "단원이 너무 많습니다 (한도: {max}).",
    import_errorTooManyDecks: "덱이 너무 많습니다 (한도: {max}).",
    import_errorInvalidGeneric: "파일 구조가 올바르지 않습니다.",
    importedToast: "\"{name}\" 가져옴 — 코드 {code}",
    loading: "로딩 중...",
    grade: "학년",
    subject: "과목",
    createClass: "수업 만들기",
    className: "수업 이름",
    classNamePlaceholder: "예: 수학 6학년",
    classSubject: "과목",
    classGrade: "학년",
    classGradePlaceholder: "예: 6학년, 7~9학년, 혼합",
    cancel: "취소",
    classCreate: "수업 만들기",
    creating: "만드는 중...",
    classCreated: "수업이 생성되었습니다!",
  },
};

// ─── Class Card ─────────────────────────────────────────────────────────
function ClassCard({ cls, t, lang, onOpen, deckCount = 0, studentCount = 0, highlight = false }) {
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
      catch (_) {}
      document.body.removeChild(ta);
    }
  };

  return (
    <div
      onClick={onOpen}
      className={`cl-class-card${highlight ? " cl-class-card-new cl-class-card-glow" : ""}`}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: 18,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
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
          <CIcon name="school" size={20} inline />
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
          title={t.copyCode}
          style={{
            flexShrink: 0,
            padding: "6px 10px",
            borderRadius: 8,
            background: copied ? C.green : C.bg,
            color: copied ? "#fff" : accent,
            border: copied ? "none" : `1px solid ${accent}55`,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
            transition: "background .15s ease, color .15s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {copied ? (
            <CIcon name="check" size={12} inline />
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
              <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {copied ? t.copied : t.copyCode}
        </button>
      </div>

      {/* Footer: deck/student counts */}
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
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────
export default function MyClassesTeacher({ lang = "en", profile, onNavigateToSessions, onOpenMobileMenu }) {
  const t = i18n[lang] || i18n.en;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [classes, setClasses] = useState([]);
  const [deckCounts, setDeckCounts] = useState({}); // { classId: count }
  const [studentCounts, setStudentCounts] = useState({}); // { classId: count }
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Highlight + toast for the freshly-created class so the teacher's eye lands
  // on it immediately (the new card animates in at the top of the grid, but
  // a quick visual cue makes "I just made this" obvious).
  const [justCreatedId, setJustCreatedId] = useState(null);
  const [toast, setToast] = useState(null); // { message, code? } | null

  // Auto-dismiss toast (5s when it carries a class code, 3s otherwise so the
  // teacher has time to read the code before it disappears).
  useEffect(() => {
    if (!toast) return;
    const ms = toast.code ? 5000 : 3000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  // Read user
  const userId = profile?.id;

  // Load classes + counts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: cls } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = cls || [];
      setClasses(list);

      // Fetch deck counts and student counts in parallel.
      // For now we use simple count queries — fine for small N; if a teacher
      // ever has 100+ classes we can switch to a single grouped RPC.
      if (list.length > 0) {
        const ids = list.map(c => c.id);
        const [decksRes, membersRes] = await Promise.all([
          supabase.from("decks").select("class_id").in("class_id", ids),
          supabase.from("class_members").select("class_id").in("class_id", ids),
        ]);
        if (cancelled) return;
        const dCounts = {};
        const sCounts = {};
        (decksRes.data || []).forEach(d => { dCounts[d.class_id] = (dCounts[d.class_id] || 0) + 1; });
        (membersRes.data || []).forEach(m => { sCounts[m.class_id] = (sCounts[m.class_id] || 0) + 1; });
        setDeckCounts(dCounts);
        setStudentCounts(sCounts);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

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

  const handleClassCreated = (newClass) => {
    setClasses(prev => [newClass, ...prev]);
    setShowCreateModal(false);
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
    <div
      className="ns-fade"
      style={{
        background: C.bg,
        border: `1px dashed ${C.border}`,
        borderRadius: 14,
        padding: "60px 24px",
        textAlign: "center",
        maxWidth: 520,
        margin: "40px auto",
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: C.accentSoft,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <SchoolIcon size={32} active={true} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 6px", fontFamily: "'Outfit',sans-serif" }}>
        {t.noClassesYet}
      </h3>
      <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 auto 22px", maxWidth: 360, lineHeight: 1.5 }}>
        {t.noClassesSub}
      </p>
      <button
        onClick={handleNewClass}
        style={{
          padding: "11px 22px",
          borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          color: "#fff",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Outfit',sans-serif",
          boxShadow: `0 3px 10px ${C.accent}33`,
        }}
      >
        {t.createFirst}
      </button>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────
  // Header is custom (instead of <PageHeader>) because we need:
  //   1) subtitle line under the title
  //   2) action buttons on the right (New class + School analytics)
  //   3) full 1100px max-width so it lines up with the cards grid below
  //      (the shared PageHeader caps at 800px).
  return (
    <div style={{ padding: isMobile ? "16px 14px 32px" : "20px 28px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          paddingBottom: 18,
          marginBottom: 22,
          borderBottom: `1px solid ${C.border}`,
          flexWrap: isMobile ? "wrap" : "nowrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              aria-label="Open menu"
              style={{
                marginTop: 2,
                width: 32, height: 32, borderRadius: 8,
                background: C.bgSoft, border: `1px solid ${C.border}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke={C.text} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: isMobile ? 20 : 24,
                fontWeight: 700,
                color: C.text,
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {t.pageTitle}
            </h1>
            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: isMobile ? 13 : 14,
                color: C.textSecondary,
                margin: "4px 0 0",
                lineHeight: 1.4,
              }}
            >
              {t.subtitle}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={() => navigate(ROUTES.SCHOOL)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <CIcon name="chart" size={13} inline />
            {!isMobile && t.schoolAnalytics}
          </button>
          {/* Import — opens the real import modal (file picker → preview →
              confirm). The actual flow lives in ImportClassModal +
              lib/class-import.js. Header chrome here just hosts the entry
              point. */}
          <button
            onClick={() => setShowImportModal(true)}
            title={t.importClass}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isMobile && t.importClass}
          </button>
          <button
            onClick={handleNewClass}
            className="clp-lift"
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              boxShadow: `0 2px 8px ${C.accent}33`,
              whiteSpace: "nowrap",
            }}
          >
            {t.newClass}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: C.textMuted, padding: 60, fontSize: 14 }}>
          {t.loading}
        </div>
      ) : classes.length === 0 ? (
        renderEmpty()
      ) : (
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
            <ClassCard
              key={cls.id}
              cls={cls}
              t={t}
              lang={lang}
              deckCount={deckCounts[cls.id] || 0}
              studentCount={studentCounts[cls.id] || 0}
              onOpen={() => handleOpenClass(cls)}
              highlight={cls.id === justCreatedId}
            />
          ))}
        </div>
      )}

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
            // Treat an imported class like a freshly-created one: prepend
            // to the list, flash the card, show the toast with code, and
            // close the modal. The teacher stays on /classes — they can
            // click into the new class when ready.
            setClasses(prev => [insertedClass, ...prev]);
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
        .cl-class-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,.06);
        }
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
      `}</style>
    </div>
  );
}
