import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon, SchoolIcon } from "../components/Icons";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import { C, MONO } from "../components/tokens";
import { ROUTES, QUERY, buildPathWithOpts } from "../routes";

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
    loading: "Loading...",
    grade: "Grade",
    subject: "Subject",
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
    loading: "Cargando...",
    grade: "Grado",
    subject: "Materia",
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
    loading: "로딩 중...",
    grade: "학년",
    subject: "과목",
  },
};

// ─── Subject color map (mirrors Decks.jsx) ──────────────────────────────
const SUBJ_COLOR = {
  Math: "blue", Science: "green", History: "orange",
  Language: "purple", Art: "pink", Music: "yellow",
  PE: "green", Other: "gray",
};
const ACCENT_FOR = (subj) => {
  const id = SUBJ_COLOR[subj];
  if (id === "blue")    return C.accent;
  if (id === "green")   return C.green;
  if (id === "orange")  return C.orange;
  if (id === "purple")  return C.purple;
  if (id === "pink")    return C.pink;
  if (id === "yellow")  return C.yellow;
  return C.accent;
};

// ─── Class Card ─────────────────────────────────────────────────────────
function ClassCard({ cls, t, lang, onOpen, deckCount = 0, studentCount = 0 }) {
  const [copied, setCopied] = useState(false);
  const accent = ACCENT_FOR(cls.subject);

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
      className="cl-class-card"
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

  // Handle ?createClass=1 — open the create modal in SessionFlow.
  // Until the create-class modal lives here directly, we redirect to
  // /sessions?createClass=1 (which already hosts the modal).
  useEffect(() => {
    if (searchParams.get(QUERY.CREATE_CLASS) === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete(QUERY.CREATE_CLASS);
      setSearchParams(next, { replace: true });
      navigate(buildPathWithOpts(ROUTES.SESSIONS, { openCreateClass: true }, "sessions"));
    }
  }, [searchParams, setSearchParams, navigate]);

  const handleNewClass = () => {
    if (onNavigateToSessions) {
      onNavigateToSessions({ openCreateClass: true });
    } else {
      navigate(buildPathWithOpts(ROUTES.SESSIONS, { openCreateClass: true }, "sessions"));
    }
  };

  const handleOpenClass = (cls) => {
    // Phase 0: opening a class drops the teacher into Decks filtered to that
    // class. Phase 1+ (the warmups/exit-tickets/general-review refactor) will
    // replace this with a dedicated /classes/:classId teacher page.
    navigate(buildPathWithOpts(ROUTES.DECKS, { focusClassId: cls.id }, "decks"));
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
  return (
    <div style={{ padding: isMobile ? "16px 14px 32px" : "20px 28px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        title={t.pageTitle}
        subtitle={t.subtitle}
        onOpenMobileMenu={onOpenMobileMenu}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
              }}
            >
              <CIcon name="chart" size={13} inline />
              {!isMobile && t.schoolAnalytics}
            </button>
            <button
              onClick={handleNewClass}
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
              }}
            >
              {t.newClass}
            </button>
          </div>
        }
      />

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
            />
          ))}
        </div>
      )}

      <style>{`
        .cl-class-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,.06);
        }
      `}</style>
    </div>
  );
}
