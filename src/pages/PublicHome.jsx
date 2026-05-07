import { useState, useEffect } from "react";
import { LogoMark, CIcon, TeacherInline, StudentInline } from "../components/Icons";
import { C, MONO } from "../components/tokens";

// ─── i18n ──────────────────────────────────────────────────
// La landing es el primer punto de contacto del producto. El copy va alineado
// 100% con el reposicionamiento "warmups & exit tickets" que decidimos. NO
// usamos lenguaje vago ("active learning", "engaging", etc.) — todo es
// concreto y específico. EN es prioridad, después ES y KO.

const i18n = {
  en: {
    navFeatures: "Features",
    navSchools: "For schools",
    navPricing: "Pricing",
    haveCode: "Got a code?",
    signIn: "Sign in",
    signUpFree: "Sign up free",

    pill: "Your daily warmups & exit tickets",
    taglinePart1: "From any file to a class warmup or exit ticket in",
    taglineHighlight: "60 seconds.",
    sub: "Any file or topic in. Verified, ready-to-use questions out. You review, launch, done.",
    ctaPrimary: "Start free trial",
    ctaSubtext: "7 days free, all features unlocked. No credit card needed.",

    typeMcq: "Multiple choice",
    typeTf: "True/False",
    typeFill: "Fill blanks",
    typeOrder: "Order steps",
    typeMatch: "Match pairs",
    typeOpen: "Open response",
    typeSentence: "Sentence",
    typeSlider: "Slider",
    typePoll: "Poll",

    howTitle: "Three steps. Five minutes. Done.",
    howSub: "The same routine, every day. That's where the learning sticks.",
    step1Title: "Drop your material",
    step1Body: "PDF, PowerPoint, Word, image, or just type a topic. Whatever you already have for class.",
    step2Title: "AI writes and verifies",
    step2Body: "Questions get generated, then double-checked for quality before you see them. No hallucinations, no filler.",
    step3Title: "Launch in class",
    step3Body: "Five minutes at the start to warm up. Five at the end as exit ticket. Repeat tomorrow.",

    whyTitle: "Built for the daily class routine",
    whySub: "Most quiz apps are made for big events. Clasloop is made for what you do every day.",
    why1Title: "Spaced repetition baked in",
    why1Body: "Concepts students struggle with come back automatically. The stuff they got right rests longer.",
    why2Title: "Reuse what you build",
    why2Body: "Every warmup you generate stays in your library. Run the same one again next semester. Or remix it.",
    why3Title: "Works in any subject",
    why3Body: "Math, biology, English, history. If you can teach it, the AI can write the warmup for it.",

    finalTitle: "Every class deserves a warmup.",
    finalSub: "Every lesson, an exit.",

    footerTagline: "Your daily warmups & exit tickets.",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerContact: "Contact",
    footerCopyright: "© 2026 Clasloop. Built for teachers.",

    codeDialogTitle: "Got a code?",
    codeDialogHint: "Enter the 6-digit code from your teacher.",
    codePlaceholder: "Code",
    codeJoin: "Join",
    codeCancel: "Cancel",

    signUp: "Create account",
    teacherSignup: "I'm a teacher",
    studentSignup: "I'm a student",
    haveAccount: "Already have an account?",
    back: "← Back",
  },
  es: {
    navFeatures: "Funcionalidades",
    navSchools: "Para escuelas",
    navPricing: "Precios",
    haveCode: "¿Tienes un código?",
    signIn: "Iniciar sesión",
    signUpFree: "Registrarse gratis",

    pill: "Tus warmups y exit tickets diarios",
    taglinePart1: "De cualquier archivo a un warmup o exit ticket en",
    taglineHighlight: "60 segundos.",
    sub: "Cualquier archivo o tema entra. Preguntas verificadas y listas para usar salen. Tú revisas, lanzas, listo.",
    ctaPrimary: "Empezar prueba gratis",
    ctaSubtext: "7 días gratis, todas las funciones. Sin tarjeta de crédito.",

    typeMcq: "Opción múltiple",
    typeTf: "Verdadero/Falso",
    typeFill: "Rellenar espacios",
    typeOrder: "Ordenar pasos",
    typeMatch: "Emparejar",
    typeOpen: "Respuesta libre",
    typeSentence: "Oración",
    typeSlider: "Slider",
    typePoll: "Encuesta",

    howTitle: "Tres pasos. Cinco minutos. Listo.",
    howSub: "La misma rutina, cada día. Ahí es donde el aprendizaje se queda.",
    step1Title: "Sube tu material",
    step1Body: "PDF, PowerPoint, Word, imagen, o simplemente escribe un tema. Lo que ya tienes para clase.",
    step2Title: "La AI escribe y verifica",
    step2Body: "Las preguntas se generan, luego se revisan por calidad antes de que las veas. Sin alucinaciones, sin relleno.",
    step3Title: "Lanza en clase",
    step3Body: "Cinco minutos al inicio para activar. Cinco al final como exit ticket. Mañana se repite.",

    whyTitle: "Hecho para la rutina diaria de clase",
    whySub: "Las apps de quiz están hechas para eventos grandes. Clasloop está hecho para lo que haces cada día.",
    why1Title: "Repetición espaciada incorporada",
    why1Body: "Los conceptos donde fallan los estudiantes vuelven automáticamente. Lo que dominaron descansa más tiempo.",
    why2Title: "Reusa lo que construyes",
    why2Body: "Cada warmup que generas se queda en tu biblioteca. Lánzalo de nuevo el próximo semestre. O remíxalo.",
    why3Title: "Funciona en cualquier materia",
    why3Body: "Matemáticas, biología, inglés, historia. Si lo enseñas, la AI te puede escribir el warmup.",

    finalTitle: "Cada clase merece un warmup.",
    finalSub: "Cada lección, un exit ticket.",

    footerTagline: "Tus warmups y exit tickets diarios.",
    footerPrivacy: "Privacidad",
    footerTerms: "Términos",
    footerContact: "Contacto",
    footerCopyright: "© 2026 Clasloop. Hecho para profes.",

    codeDialogTitle: "¿Tienes un código?",
    codeDialogHint: "Ingresa el código de 6 dígitos de tu profe.",
    codePlaceholder: "Código",
    codeJoin: "Entrar",
    codeCancel: "Cancelar",

    signUp: "Crear cuenta",
    teacherSignup: "Soy profe",
    studentSignup: "Soy estudiante",
    haveAccount: "¿Ya tienes cuenta?",
    back: "← Atrás",
  },
  ko: {
    navFeatures: "기능",
    navSchools: "학교용",
    navPricing: "가격",
    haveCode: "코드가 있나요?",
    signIn: "로그인",
    signUpFree: "무료 가입",

    pill: "매일의 워밍업과 종료 티켓",
    taglinePart1: "어떤 파일이든 워밍업이나 종료 티켓으로",
    taglineHighlight: "60초.",
    sub: "어떤 파일이나 주제든 입력하세요. 검증된 사용 가능한 문제가 나옵니다. 검토하고, 시작하고, 완료.",
    ctaPrimary: "무료 체험 시작",
    ctaSubtext: "7일 무료, 모든 기능 잠금 해제. 신용카드 필요 없음.",

    typeMcq: "객관식",
    typeTf: "참/거짓",
    typeFill: "빈칸 채우기",
    typeOrder: "순서 정렬",
    typeMatch: "짝 맞추기",
    typeOpen: "주관식",
    typeSentence: "문장",
    typeSlider: "슬라이더",
    typePoll: "투표",

    howTitle: "세 단계. 5분. 완료.",
    howSub: "매일 같은 루틴. 그곳에서 학습이 자리 잡습니다.",
    step1Title: "자료를 올리세요",
    step1Body: "PDF, PowerPoint, Word, 이미지, 또는 그냥 주제를 입력하세요. 이미 가지고 있는 수업 자료라면 무엇이든.",
    step2Title: "AI가 작성하고 검증합니다",
    step2Body: "문제가 생성된 후 품질을 다시 확인합니다. 환각도, 무의미한 내용도 없습니다.",
    step3Title: "수업에서 시작하세요",
    step3Body: "시작 5분 동안 워밍업. 끝 5분 동안 종료 티켓. 내일 다시.",

    whyTitle: "매일의 수업 루틴을 위해 만들어졌습니다",
    whySub: "대부분의 퀴즈 앱은 큰 이벤트용입니다. Clasloop은 매일 하는 것을 위한 것입니다.",
    why1Title: "간격 반복 학습 내장",
    why1Body: "학생들이 어려워하는 개념이 자동으로 다시 나타납니다. 잘 아는 것은 더 오래 쉬게 됩니다.",
    why2Title: "만든 것을 재사용하세요",
    why2Body: "생성한 모든 워밍업은 라이브러리에 저장됩니다. 다음 학기에 다시 사용하거나 리믹스할 수 있습니다.",
    why3Title: "어떤 과목에서도 작동합니다",
    why3Body: "수학, 생물, 영어, 역사. 가르칠 수 있다면 AI가 그 과목의 워밍업을 작성할 수 있습니다.",

    finalTitle: "모든 수업은 워밍업이 필요합니다.",
    finalSub: "모든 강의는 종료 티켓이 필요합니다.",

    footerTagline: "매일의 워밍업과 종료 티켓.",
    footerPrivacy: "개인정보",
    footerTerms: "약관",
    footerContact: "연락처",
    footerCopyright: "© 2026 Clasloop. 선생님들을 위해.",

    codeDialogTitle: "코드가 있나요?",
    codeDialogHint: "선생님이 알려준 6자리 코드를 입력하세요.",
    codePlaceholder: "코드",
    codeJoin: "참여",
    codeCancel: "취소",

    signUp: "계정 만들기",
    teacherSignup: "저는 선생님이에요",
    studentSignup: "저는 학생이에요",
    haveAccount: "이미 계정이 있나요?",
    back: "← 뒤로",
  },
};

// ─── Floating doc card data ────────────────────────────────
// 4 cards animan en el hero. Cada card representa un input típico (PDF,
// PPTX, DOCX, topic) y morphea a una pregunta del tipo correspondiente.
// La animación cuenta visualmente lo que dice el sub: "any file or topic
// in, verified questions out".
const FLOATING_CARDS = [
  {
    id: 1,
    fileType: "PDF",
    fileColor: "#D85A30",
    fileName: "chapter5.pdf",
    questionTag: { en: "WARMUP · MCQ", es: "WARMUP · MCQ", ko: "워밍업 · 객관식" },
    questionText: { en: "What is photosynthesis?", es: "¿Qué es la fotosíntesis?", ko: "광합성이란 무엇인가요?" },
    bg: "#DDEBFB", border: "#2383E2", labelColor: "#185FA5", textColor: "#042C53",
    pos: { top: 90, left: 60 }, size: { w: 225, h: 150 },
    floatDelay: 0,
  },
  {
    id: 2,
    fileType: "PPT",
    fileColor: "#BA7517",
    fileName: "lesson.pptx",
    questionTag: { en: "EXIT TICKET · TF", es: "EXIT TICKET · VF", ko: "종료 티켓 · 참거짓" },
    questionText: { en: "Mitosis happens in 4 phases.", es: "La mitosis tiene 4 fases.", ko: "유사분열은 4단계입니다." },
    bg: "#FAEEDA", border: "#BA7517", labelColor: "#854F0B", textColor: "#412402",
    pos: { top: 65, right: 75 }, size: { w: 215, h: 145 },
    floatDelay: -1,
  },
  {
    id: 3,
    fileType: "DOC",
    fileColor: "#185FA5",
    fileName: "notes.docx",
    questionTag: { en: "WARMUP · FILL", es: "WARMUP · ESPACIO", ko: "워밍업 · 빈칸" },
    questionText: { en: "The mitochondria is the ___.", es: "La mitocondria es el ___.", ko: "미토콘드리아는 ___입니다." },
    bg: "#E1F5EE", border: "#1D9E75", labelColor: "#0F6E56", textColor: "#04342C",
    pos: { bottom: 75, left: 110 }, size: { w: 215, h: 145 },
    floatDelay: -2,
  },
  {
    id: 4,
    fileType: "TXT",
    fileColor: "#5A5A5A",
    fileName: "topic",
    questionTag: { en: "EXIT TICKET · MATCH", es: "EXIT TICKET · EMPAREJAR", ko: "종료 티켓 · 짝짓기" },
    questionText: { en: "Match cell parts to functions", es: "Empareja partes de la célula", ko: "세포 부분과 기능 짝짓기" },
    bg: "#FBEAF0", border: "#D4537E", labelColor: "#993556", textColor: "#4B1528",
    pos: { bottom: 100, right: 60 }, size: { w: 210, h: 140 },
    floatDelay: -1.5,
  },
];

// ─── CSS animations + responsive ───────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *{box-sizing:border-box}
  body{margin:0;background:#fff;font-family:'Outfit',sans-serif}

  /* Forzar light mode en la landing — esta página es marketing y debe verse
     consistente para todos los visitors sin importar su preferencia de OS.
     Notion, Linear, Stripe hacen lo mismo: la landing es siempre light. */
  .ph-root { color-scheme: light; background: #fff !important; }
  .ph-root, .ph-root * { color-scheme: light !important; }
  @media (prefers-color-scheme: dark) {
    .ph-root { background: #fff !important; }
  }

  /* Float keyframes — cada card tiene su propia rotación base, animamos solo translateY */
  @keyframes ph-float-a { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(-3deg); } }
  @keyframes ph-float-b { 0%,100% { transform: translateY(-5px) rotate(2deg); } 50% { transform: translateY(5px) rotate(2deg); } }
  @keyframes ph-float-c { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-12px) rotate(-1deg); } }
  @keyframes ph-float-d { 0%,100% { transform: translateY(-3px) rotate(4deg); } 50% { transform: translateY(8px) rotate(4deg); } }

  /* Morph: cada 6s alterna doc <-> pregunta */
  @keyframes ph-morph-from { 0%, 40% { opacity: 1; } 50%, 90% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes ph-morph-to { 0%, 40% { opacity: 0; } 50%, 90% { opacity: 1; } 100% { opacity: 0; } }

  .ph-float { animation-duration: 4s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
  .ph-float-a { animation-name: ph-float-a; }
  .ph-float-b { animation-name: ph-float-b; }
  .ph-float-c { animation-name: ph-float-c; }
  .ph-float-d { animation-name: ph-float-d; }
  .ph-morph-from { animation: ph-morph-from 6s infinite; }
  .ph-morph-to { animation: ph-morph-to 6s infinite; position: absolute; inset: 0; }

  /* Page-load fade for sections */
  @keyframes ph-fade { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  .ph-fade { animation: ph-fade .4s ease both }

  /* Hover states */
  .ph-btn-primary { transition: transform .15s, box-shadow .15s; }
  .ph-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(35,131,226,0.25); }
  .ph-btn-primary:active { transform: translateY(0); }
  .ph-nav-link { transition: color .15s; cursor: pointer; }
  .ph-nav-link:hover { color: ${C.text} !important; }
  .ph-cta-secondary { transition: background .15s, border-color .15s; }
  .ph-cta-secondary:hover { background: ${C.bgSoft}; border-color: ${C.textMuted}; }
  .ph-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accentSoft}; outline: none; }
  .ph-lang-btn { transition: all .15s ease; cursor: pointer; }

  /* Tablet (≤1100px) — bajar todos los tamaños base ~25% para que se sienta
     como el zoom 75% que el user describió en su Galaxy Tab S9 FE. Cards
     flotantes escondidas porque se amontonan. Nav links escondidos porque
     no caben con el header reducido. */
  @media (max-width: 1100px) {
    .ph-floating-card { display: none !important; }
    .ph-tagline { font-size: 42px !important; line-height: 1.15 !important; }
    .ph-sub { font-size: 18px !important; }
    .ph-cta-primary { font-size: 17px !important; padding: 14px 32px !important; }
    .ph-nav-links { display: none !important; }
    .ph-section { padding: 70px 28px !important; }
    .ph-how-grid, .ph-why-grid { grid-template-columns: 1fr !important; }
    .ph-section-h2 { font-size: 38px !important; }
    .ph-section-sub { font-size: 17px !important; }
    .ph-step-title, .ph-why-title { font-size: 22px !important; }
    .ph-step-body, .ph-why-body { font-size: 16px !important; }
    .ph-final-h2 { font-size: 44px !important; }
    .ph-final-sub { font-size: 21px !important; }
    .ph-pill { font-size: 14px !important; }
  }

  /* Mobile (≤640px) — header simplificado: solo logo + Sign up free + langs.
     "Got a code?" se mueve al hero como botón secundario debajo del CTA.
     "Sign in" se esconde — el dialog de signup ya tiene link "ya tengo cuenta".
     Tagline más chico, padding reducido. */
  @media (max-width: 640px) {
    .ph-tagline { font-size: 32px !important; line-height: 1.15 !important; }
    .ph-sub { font-size: 16px !important; }
    .ph-cta-primary { font-size: 16px !important; padding: 13px 28px !important; }
    .ph-have-code-btn { display: none !important; }
    .ph-sign-in-btn { display: none !important; }
    .ph-mobile-code-btn { display: inline-block !important; }
    .ph-section { padding: 56px 20px !important; }
    .ph-section-h2 { font-size: 30px !important; }
    .ph-section-sub { font-size: 16px !important; }
    .ph-step-title, .ph-why-title { font-size: 20px !important; }
    .ph-step-body, .ph-why-body { font-size: 15px !important; }
    .ph-final-h2 { font-size: 34px !important; }
    .ph-final-sub { font-size: 18px !important; }
    .ph-pill { font-size: 13px !important; padding: 6px 14px !important; }
    .ph-header { padding: 12px 18px !important; }
    .ph-header-logo-text { font-size: 18px !important; }
    .ph-header-actions { gap: 6px !important; }
    .ph-header-langs { margin-left: 4px !important; }
    .ph-header-langs button { padding: 5px 8px !important; font-size: 12px !important; }
    .ph-step-card { padding: 28px !important; }
  }

  /* Dialog backdrop */
  .ph-dialog-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
  .ph-dialog { background: ${C.bg}; border-radius: 16px; padding: 28px; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
`;

export default function PublicHome({ onSignIn, onSignUp }) {
  // ─── Lang detection (URL → localStorage → browser → EN) ──
  // Prioridad: URL ?lang= (link compartido), después la elección guardada
  // del user en localStorage (clasloop_lang, misma key que usa el resto del
  // app), después navigator.language, y EN como fallback.
  const [lang, setLangRaw] = useState(() => {
    if (typeof window === "undefined") return "en";
    const url = new URLSearchParams(window.location.search).get("lang");
    if (["en", "es", "ko"].includes(url)) return url;
    const saved = window.localStorage?.getItem("clasloop_lang");
    if (["en", "es", "ko"].includes(saved)) return saved;
    const browser = navigator.language?.slice(0, 2);
    if (["en", "es", "ko"].includes(browser)) return browser;
    return "en";
  });
  const setLang = (newLang) => {
    setLangRaw(newLang);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("clasloop_lang", newLang);
    }
  };
  const t = i18n[lang] || i18n.en;

  // ─── Modes y dialogs ─────────────────────────────────────
  // mode: "home" (landing principal) | "auth-select" (role picker)
  // codeDialogOpen: dialog para entrar con código de profe.
  const [mode, setMode] = useState("home");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [code, setCode] = useState("");
  const codeValid = /^[0-9]{6}$/.test(code);

  // Cerrar dialog con Escape
  useEffect(() => {
    if (!codeDialogOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setCodeDialogOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [codeDialogOpen]);

  // ─── Handlers ────────────────────────────────────────────
  const handleJoin = () => {
    if (!codeValid) return;
    // Hand off to the dedicated guest route. Same origin, full reload — that
    // way main.jsx routes to GuestJoin cleanly and we keep its existing
    // localStorage reconnect logic untouched.
    window.location.href = `/join?code=${code}&lang=${lang}`;
  };
  const handleTeacher = () => onSignUp?.("teacher");
  const handleStudent = () => onSignUp?.("student");
  const handleLogin = () => onSignIn?.();

  // Helper para float class por id
  const floatClass = (id) => ["ph-float-a", "ph-float-b", "ph-float-c", "ph-float-d"][(id - 1) % 4];

  return (
    <>
      <style>{css}</style>
      <div className="ph-root" data-theme="light" style={{ background: "#fff", minHeight: "100vh" }}>

        {/* HEADER — sticky con logo, nav, acciones */}
        <header className="ph-header" style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 36px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoMark size={36} />
              <span className="ph-header-logo-text" style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
                Clasloop
              </span>
            </div>
            <nav className="ph-nav-links" style={{ display: "flex", gap: 28 }}>
              <span className="ph-nav-link" style={{ fontSize: 16, color: C.textSecondary, fontWeight: 500 }}>{t.navFeatures}</span>
              <span className="ph-nav-link" style={{ fontSize: 16, color: C.textSecondary, fontWeight: 500 }}>{t.navSchools}</span>
              <span className="ph-nav-link" style={{ fontSize: 16, color: C.textSecondary, fontWeight: 500 }}>{t.navPricing}</span>
            </nav>
          </div>
          <div className="ph-header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="ph-have-code-btn ph-cta-secondary"
              onClick={() => setCodeDialogOpen(true)}
              style={{
                fontSize: 15, padding: "9px 16px",
                border: `1px solid ${C.border}`, background: C.bg,
                borderRadius: 8, color: C.textSecondary, fontWeight: 500,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.haveCode}</button>
            <button
              className="ph-nav-link ph-sign-in-btn"
              onClick={handleLogin}
              style={{
                fontSize: 16, padding: "9px 14px",
                border: "none", background: "transparent",
                color: C.textSecondary, fontWeight: 500,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.signIn}</button>
            <button
              className="ph-btn-primary"
              onClick={() => setMode("auth-select")}
              style={{
                fontSize: 16, padding: "10px 18px",
                background: C.accent, color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.signUpFree}</button>
            <div className="ph-header-langs" style={{ display: "flex", gap: 3, marginLeft: 10 }}>
              {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
                <button
                  key={c}
                  onClick={() => setLang(c)}
                  className="ph-lang-btn"
                  style={{
                    padding: "6px 11px", borderRadius: 7,
                    fontSize: 14, fontWeight: 600,
                    background: lang === c ? C.accentSoft : "transparent",
                    color: lang === c ? C.accent : C.textMuted,
                    border: "none", fontFamily: "'Outfit',sans-serif",
                  }}
                >{l}</button>
              ))}
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="ph-section ph-fade" style={{
          padding: "100px 32px 70px",
          position: "relative",
          textAlign: "center",
          minHeight: 700,
          background: `radial-gradient(ellipse at top center, ${C.accentSoft} 0%, transparent 50%)`,
        }}>
          {FLOATING_CARDS.map(card => (
            <div
              key={card.id}
              className={`ph-floating-card ph-float ${floatClass(card.id)}`}
              style={{
                position: "absolute",
                top: card.pos.top, left: card.pos.left,
                right: card.pos.right, bottom: card.pos.bottom,
                width: card.size.w, height: card.size.h,
                animationDelay: `${card.floatDelay}s`,
                zIndex: 1,
              }}
            >
              <div className="ph-morph-from" style={{
                width: "100%", height: "100%",
                background: "white", border: `1px solid ${C.border}`,
                borderRadius: 12, padding: 18,
                boxShadow: "0 6px 16px rgba(0,0,0,0.07)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                  <div style={{
                    width: 38, height: 38, background: card.fileColor,
                    borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 13, fontWeight: 700, fontFamily: MONO,
                  }}>{card.fileType}</div>
                  <span style={{ fontSize: 14, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.fileName}
                  </span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 6 }} />
                <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 6, width: "80%" }} />
                <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 6 }} />
                <div style={{ height: 4, background: C.border, borderRadius: 2, width: "65%" }} />
              </div>
              <div className="ph-morph-to" style={{
                background: card.bg, border: `1px solid ${card.border}`,
                borderRadius: 12, padding: 18, textAlign: "left",
              }}>
                <div style={{ fontSize: 13, color: card.labelColor, fontWeight: 700, marginBottom: 9, letterSpacing: "0.5px" }}>
                  {card.questionTag[lang] || card.questionTag.en}
                </div>
                <div style={{ fontSize: 16, color: card.textColor, lineHeight: 1.4 }}>
                  {card.questionText[lang] || card.questionText.en}
                </div>
              </div>
            </div>
          ))}

          <div style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto" }}>
            <div className="ph-pill" style={{
              display: "inline-block",
              padding: "9px 22px",
              background: C.accentSoft, color: C.accent,
              borderRadius: 100, fontSize: 17, fontWeight: 600,
              marginBottom: 34, letterSpacing: "0.2px",
            }}>{t.pill}</div>

            <h1 className="ph-tagline" style={{
              fontSize: 80, fontWeight: 700, color: C.text,
              lineHeight: 1.08, margin: "0 0 28px",
              letterSpacing: "-0.02em",
            }}>
              {t.taglinePart1} <span style={{ color: C.accent }}>{t.taglineHighlight}</span>
            </h1>

            <p className="ph-sub" style={{
              fontSize: 24, color: C.textSecondary,
              lineHeight: 1.55, margin: "0 0 46px",
              maxWidth: 800, marginLeft: "auto", marginRight: "auto",
            }}>{t.sub}</p>

            <button
              className="ph-cta-primary ph-btn-primary"
              onClick={() => setMode("auth-select")}
              style={{
                background: C.accent, color: "#fff",
                padding: "20px 44px", borderRadius: 12,
                fontSize: 21, fontWeight: 600,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t.ctaPrimary}</button>

            <p style={{
              fontSize: 17, color: C.textMuted,
              margin: "18px 0 0", fontFamily: "'Outfit',sans-serif",
            }}>{t.ctaSubtext}</p>

            {/* Got a code? — solo en mobile (header lo esconde, lo movemos
                acá para que el estudiante con código siga teniéndolo a mano). */}
            <button
              className="ph-mobile-code-btn"
              onClick={() => setCodeDialogOpen(true)}
              style={{
                display: "none",
                marginTop: 24,
                background: "transparent",
                color: C.accent,
                border: `1.5px solid ${C.accent}`,
                padding: "10px 22px",
                borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t.haveCode}</button>
          </div>
        </section>

        {/* QUESTION TYPE PILLS */}
        <div style={{
          padding: "0 32px 90px",
          display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
        }}>
          {[
            { color: "#2383E2", label: t.typeMcq },
            { color: "#1D9E75", label: t.typeTf },
            { color: "#D85A30", label: t.typeFill },
            { color: "#BA7517", label: t.typeOrder },
            { color: "#534AB7", label: t.typeMatch },
            { color: "#D4537E", label: t.typeOpen },
            { color: "#0F7B6C", label: t.typeSentence },
            { color: "#993C1D", label: t.typeSlider },
            { color: "#7F77DD", label: t.typePoll },
          ].map(p => (
            <div key={p.label} style={{
              padding: "11px 22px", background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 100,
              fontSize: 17, color: C.textSecondary, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 9,
            }}>
              <span style={{ color: p.color, fontSize: 14 }}>●</span>
              {p.label}
            </div>
          ))}
        </div>

        {/* HOW IT WORKS */}
        <section className="ph-section" style={{
          padding: "120px 32px",
          background: C.bgSoft,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", textAlign: "center" }}>
            <h2 className="ph-section-h2" style={{
              fontSize: 52, fontWeight: 700, color: C.text,
              margin: "0 0 20px", letterSpacing: "-0.02em",
            }}>{t.howTitle}</h2>
            <p className="ph-section-sub" style={{
              fontSize: 22, color: C.textSecondary,
              margin: "0 0 70px", maxWidth: 760,
              marginLeft: "auto", marginRight: "auto", lineHeight: 1.5,
            }}>{t.howSub}</p>
            <div className="ph-how-grid" style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: 34, textAlign: "left",
            }}>
              {[
                { num: "1", title: t.step1Title, body: t.step1Body, color: C.accent },
                { num: "2", title: t.step2Title, body: t.step2Body, color: C.purple },
                { num: "3", title: t.step3Title, body: t.step3Body, color: "#1D9E75" },
              ].map(s => (
                <div key={s.num} className="ph-step-card" style={{
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 18, padding: 40,
                }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 54, height: 54, borderRadius: "50%",
                    background: `${s.color}1A`, color: s.color,
                    fontSize: 22, fontWeight: 700, marginBottom: 22,
                    fontFamily: MONO,
                  }}>{s.num}</div>
                  <h3 className="ph-step-title" style={{
                    fontSize: 26, fontWeight: 600, color: C.text,
                    margin: "0 0 12px",
                  }}>{s.title}</h3>
                  <p className="ph-step-body" style={{
                    fontSize: 18, color: C.textSecondary,
                    lineHeight: 1.55, margin: 0,
                  }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY DAILY */}
        <section className="ph-section" style={{ padding: "120px 32px" }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", textAlign: "center" }}>
            <h2 className="ph-section-h2" style={{
              fontSize: 52, fontWeight: 700, color: C.text,
              margin: "0 0 20px", letterSpacing: "-0.02em",
            }}>{t.whyTitle}</h2>
            <p className="ph-section-sub" style={{
              fontSize: 22, color: C.textSecondary,
              margin: "0 0 70px", maxWidth: 820,
              marginLeft: "auto", marginRight: "auto", lineHeight: 1.5,
            }}>{t.whySub}</p>
            <div className="ph-why-grid" style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: 36, textAlign: "left",
            }}>
              {[
                { title: t.why1Title, body: t.why1Body, icon: "🔁" },
                { title: t.why2Title, body: t.why2Body, icon: "📚" },
                { title: t.why3Title, body: t.why3Body, icon: "🎯" },
              ].map(w => (
                <div key={w.title} style={{ padding: 8 }}>
                  <div style={{ fontSize: 44, marginBottom: 20 }}>{w.icon}</div>
                  <h3 className="ph-why-title" style={{
                    fontSize: 26, fontWeight: 600, color: C.text,
                    margin: "0 0 12px",
                  }}>{w.title}</h3>
                  <p className="ph-why-body" style={{
                    fontSize: 18, color: C.textSecondary,
                    lineHeight: 1.55, margin: 0,
                  }}>{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="ph-section" style={{
          padding: "120px 32px",
          background: `linear-gradient(135deg, ${C.accentSoft} 0%, ${C.bgSoft} 100%)`,
          textAlign: "center",
        }}>
          <h2 className="ph-final-h2" style={{
            fontSize: 60, fontWeight: 700, color: C.text,
            margin: "0 0 18px", letterSpacing: "-0.02em",
          }}>{t.finalTitle}</h2>
          <p className="ph-final-sub" style={{
            fontSize: 28, color: C.textSecondary,
            margin: "0 0 44px",
          }}>{t.finalSub}</p>
          <button
            className="ph-cta-primary ph-btn-primary"
            onClick={() => setMode("auth-select")}
            style={{
              background: C.accent, color: "#fff",
              padding: "20px 48px", borderRadius: 12,
              fontSize: 21, fontWeight: 600,
              border: "none", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.ctaPrimary}</button>
          <p style={{
            fontSize: 17, color: C.textMuted,
            margin: "18px 0 0",
          }}>{t.ctaSubtext}</p>
        </section>

        {/* FOOTER */}
        <footer style={{
          padding: "32px",
          borderTop: `1px solid ${C.border}`,
          background: C.bg,
        }}>
          <div style={{
            maxWidth: 1000, margin: "0 auto",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoMark size={24} />
              <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>
                {t.footerTagline}
              </span>
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.textMuted }}>
              <span style={{ cursor: "pointer" }}>{t.footerPrivacy}</span>
              <span style={{ cursor: "pointer" }}>{t.footerTerms}</span>
              <span style={{ cursor: "pointer" }}>{t.footerContact}</span>
            </div>
          </div>
          <div style={{
            maxWidth: 1000, margin: "16px auto 0",
            fontSize: 11, color: C.textMuted, textAlign: "center",
          }}>{t.footerCopyright}</div>
        </footer>

        {/* DIALOG — code input */}
        {codeDialogOpen && (
          <div className="ph-dialog-bg" onClick={() => setCodeDialogOpen(false)}>
            <div className="ph-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: C.text,
                margin: "0 0 6px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <CIcon name="rocket" size={18} inline /> {t.codeDialogTitle}
              </h3>
              <p style={{
                fontSize: 13, color: C.textSecondary,
                margin: "0 0 16px",
              }}>{t.codeDialogHint}</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder={t.codePlaceholder}
                className="ph-input"
                autoFocus
                style={{
                  fontFamily: MONO, background: C.bg,
                  border: `2px solid ${C.border}`, color: C.accent,
                  padding: 14, borderRadius: 12,
                  fontSize: 28, fontWeight: 700,
                  letterSpacing: ".22em", textAlign: "center",
                  width: "100%", outline: "none",
                  transition: "border-color .15s, box-shadow .15s",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => setCodeDialogOpen(false)}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    fontSize: 14, fontWeight: 600,
                    background: C.bg, color: C.textSecondary,
                    border: `1px solid ${C.border}`, cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >{t.codeCancel}</button>
                <button
                  onClick={handleJoin}
                  disabled={!codeValid}
                  className="ph-btn-primary"
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    fontSize: 14, fontWeight: 600,
                    background: codeValid ? C.accent : C.bgSoft,
                    color: codeValid ? "#fff" : C.textMuted,
                    border: "none",
                    cursor: codeValid ? "pointer" : "default",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >{t.codeJoin}</button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG — auth-select (role picker) */}
        {mode === "auth-select" && (
          <div className="ph-dialog-bg" onClick={() => setMode("home")}>
            <div className="ph-dialog" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMode("home")}
                style={{
                  background: "transparent", border: "none",
                  color: C.textSecondary, fontSize: 13,
                  cursor: "pointer", marginBottom: 12,
                  fontFamily: "'Outfit',sans-serif", padding: 0,
                }}
              >{t.back}</button>
              <h3 style={{
                fontSize: 20, fontWeight: 700, color: C.text,
                margin: "0 0 18px",
              }}>{t.signUp}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={handleTeacher}
                  className="ph-cta-secondary"
                  style={{
                    padding: "14px 16px", borderRadius: 12,
                    fontSize: 15, fontWeight: 600,
                    background: C.bg, color: C.text,
                    border: `1.5px solid ${C.border}`, cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "flex", alignItems: "center", gap: 10,
                    textAlign: "left",
                  }}
                >
                  <TeacherInline size={22} />
                  {t.teacherSignup}
                </button>
                <button
                  onClick={handleStudent}
                  className="ph-cta-secondary"
                  style={{
                    padding: "14px 16px", borderRadius: 12,
                    fontSize: 15, fontWeight: 600,
                    background: C.bg, color: C.text,
                    border: `1.5px solid ${C.border}`, cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "flex", alignItems: "center", gap: 10,
                    textAlign: "left",
                  }}
                >
                  <StudentInline size={22} />
                  {t.studentSignup}
                </button>
              </div>
              <p style={{
                textAlign: "center", marginTop: 20, marginBottom: 0,
                fontSize: 13, color: C.textMuted,
              }}>
                {t.haveAccount}{" "}
                <span
                  onClick={handleLogin}
                  style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}
                >{t.signIn}</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
