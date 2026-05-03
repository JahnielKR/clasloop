import { CIcon } from "../components/Icons";
import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4",
};

const t = {
  en: {
    nav: ["How it works", "Features", "Pricing"],
    hero: "Your students forget 70% of what you teach within a week.",
    heroSub: "Clasloop fixes that. Spaced repetition built into your daily class routine — warmups, exit tickets, and autonomous study, all powered by AI.",
    cta: "Get early access",
    ctaSub: "Free during beta · No credit card required",
    problemTitle: "The problem every teacher knows",
    problems: [
      { icon: "chart", title: "The forgetting curve is real", desc: "Students lose most of what they learn within days. Without systematic review, your best lessons disappear." },
      { icon: "clock", title: "No time to create reviews", desc: "You barely have time to plan new lessons. Creating review materials for every past topic? Impossible." },
      { icon: "matching", title: "Review feels random", desc: "When you do review, it's based on gut feeling — not data. You don't know what each student actually remembers." },
    ],
    solutionTitle: "Clasloop makes retention automatic",
    solutionSub: "5 minutes at the start and end of each class. That's all it takes.",
    howTitle: "How it works",
    steps: [
      { num: "01", title: "Teach your class normally", desc: "After your lesson, type the topic and key points. Takes 30 seconds.", icon: "book" },
      { num: "02", title: "AI generates the questions", desc: "Clasloop creates review questions instantly — multiple choice, adapted to your grade level and language.", icon: "brain" },
      { num: "03", title: "Students review in class", desc: "Run a 3-minute warmup or exit ticket. Students join with a PIN from their phones. Like Kahoot, but for memory.", icon: "pin" },
      { num: "04", title: "The system remembers what they forget", desc: "Clasloop tracks retention per topic, per student. It tells you exactly what to review and when.", icon: "brain" },
    ],
    featuresTitle: "Built for how classrooms actually work",
    features: [
      { icon: "warmup", title: "Warmups & Exit Tickets", desc: "Start or end any class with a quick review. Students join with a PIN — no app download needed." },
      { icon: "chart", title: "Retention Dashboard", desc: "See which topics your class is forgetting. Get AI suggestions for what to review today." },
      { icon: "target", title: "Student Self-Study", desc: "Students see their own weak topics and practice on their own. XP, levels, and collectible characters keep them motivated." },
      { icon: "globe", title: "3 Languages from Day One", desc: "Full support for English, Spanish, and Korean. The AI generates questions in whatever language you teach." },
      { icon: "book", title: "Community Decks", desc: "Share your review decks with other teachers. Find ready-made content for your grade and subject." },
      { icon: "science", title: "Science-Backed", desc: "Built on spaced repetition — the most proven method for long-term memory. Used by medical students worldwide." },
    ],
    teacherView: "Teacher's view",
    studentView: "Student's view",
    pricingTitle: "Simple pricing",
    pricingSub: "Free during beta. After launch:",
    plans: [
      { name: "Free", price: "$0", period: "/forever", desc: "For individual teachers getting started", features: ["3 sessions per week", "Up to 30 students", "Community decks", "Basic analytics"] },
      { name: "Pro", price: "$7", period: "/month", desc: "For teachers who want full control", features: ["Unlimited sessions", "Up to 50 students", "Full retention dashboard", "Upload your own materials", "Priority AI generation"], badge: "Popular" },
      { name: "School", price: "$3", period: "/student/year", desc: "For entire schools and districts", features: ["All Pro features", "Unlimited students", "School-wide analytics", "Director dashboard", "Dedicated onboarding"] },
    ],
    finalTitle: "Your students deserve to remember what you teach.",
    finalSub: "Join the beta and be one of the first teachers to use Clasloop.",
    finalCta: "Get early access — it's free",
    footer: "Made with ♾ for teachers everywhere",
    emailPlaceholder: "Your email address",
    joinBeta: "Join beta",
    comingSoon: "Launching 2026",
  },
  es: {
    nav: ["Cómo funciona", "Funciones", "Precios"],
    hero: "Tus alumnos olvidan el 70% de lo que enseñas en una semana.",
    heroSub: "Clasloop soluciona eso. Repetición espaciada integrada en tu rutina diaria — warmups, exit tickets y estudio autónomo, todo con IA.",
    cta: "Acceso anticipado",
    ctaSub: "Gratis durante la beta · Sin tarjeta de crédito",
    problemTitle: "El problema que todo profesor conoce",
    problems: [
      { icon: "chart", title: "La curva del olvido es real", desc: "Los estudiantes pierden la mayoría de lo que aprenden en días. Sin repaso sistemático, tus mejores clases desaparecen." },
      { icon: "clock", title: "No hay tiempo para crear repasos", desc: "Apenas tienes tiempo para planificar clases nuevas. ¿Crear material de repaso para cada tema pasado? Imposible." },
      { icon: "matching", title: "El repaso es aleatorio", desc: "Cuando repasas, es por intuición — no por datos. No sabes qué recuerda realmente cada alumno." },
    ],
    solutionTitle: "Clasloop hace la retención automática",
    solutionSub: "5 minutos al inicio y final de cada clase. Es todo lo que necesitas.",
    howTitle: "Cómo funciona",
    steps: [
      { num: "01", title: "Da tu clase normalmente", desc: "Después de la lección, escribe el tema y puntos clave. Toma 30 segundos.", icon: "book" },
      { num: "02", title: "La IA genera las preguntas", desc: "Clasloop crea preguntas de repaso al instante — opción múltiple, adaptadas a tu grado e idioma.", icon: "brain" },
      { num: "03", title: "Los alumnos repasan en clase", desc: "Lanza un warmup o exit ticket de 3 minutos. Los alumnos entran con un PIN desde sus celulares.", icon: "pin" },
      { num: "04", title: "El sistema recuerda lo que ellos olvidan", desc: "Clasloop rastrea la retención por tema y por alumno. Te dice exactamente qué repasar y cuándo.", icon: "brain" },
    ],
    featuresTitle: "Diseñado para cómo funcionan las aulas realmente",
    features: [
      { icon: "warmup", title: "Warmups y Exit Tickets", desc: "Inicia o termina cualquier clase con un repaso rápido. Los alumnos entran con un PIN — sin descargar app." },
      { icon: "chart", title: "Panel de Retención", desc: "Ve qué temas está olvidando tu clase. Recibe sugerencias de IA sobre qué repasar hoy." },
      { icon: "target", title: "Estudio Autónomo", desc: "Los alumnos ven sus temas débiles y practican por su cuenta. XP, niveles y personajes coleccionables los motivan." },
      { icon: "globe", title: "3 Idiomas desde el Día Uno", desc: "Soporte completo en inglés, español y coreano. La IA genera preguntas en el idioma que enseñes." },
      { icon: "book", title: "Decks de Comunidad", desc: "Comparte tus decks con otros profesores. Encuentra contenido listo para tu grado y materia." },
      { icon: "science", title: "Basado en Ciencia", desc: "Construido sobre repetición espaciada — el método más probado para memoria a largo plazo." },
    ],
    teacherView: "Vista del profesor",
    studentView: "Vista del estudiante",
    pricingTitle: "Precios simples",
    pricingSub: "Gratis durante la beta. Después del lanzamiento:",
    plans: [
      { name: "Gratis", price: "$0", period: "/siempre", desc: "Para profesores que empiezan", features: ["3 sesiones por semana", "Hasta 30 estudiantes", "Decks de comunidad", "Analytics básicos"] },
      { name: "Pro", price: "$7", period: "/mes", desc: "Para profesores que quieren control total", features: ["Sesiones ilimitadas", "Hasta 50 estudiantes", "Dashboard de retención completo", "Sube tu propio material", "Generación IA prioritaria"], badge: "Popular" },
      { name: "Escuela", price: "$3", period: "/alumno/año", desc: "Para escuelas y distritos", features: ["Todo de Pro", "Estudiantes ilimitados", "Analytics a nivel escuela", "Dashboard del director", "Onboarding dedicado"] },
    ],
    finalTitle: "Tus alumnos merecen recordar lo que enseñas.",
    finalSub: "Únete a la beta y sé de los primeros profesores en usar Clasloop.",
    finalCta: "Acceso anticipado — es gratis",
    footer: "Hecho con ♾ para profesores de todo el mundo",
    emailPlaceholder: "Tu correo electrónico",
    joinBeta: "Unirse a beta",
    comingSoon: "Lanzamiento 2026",
  },
  ko: {
    nav: ["사용법", "기능", "가격"],
    hero: "학생들은 배운 내용의 70%를 일주일 안에 잊습니다.",
    heroSub: "Clasloop이 해결합니다. 매일 수업에 녹아든 간격 반복 — 워밍업, 마무리 퀴즈, 자기주도 학습, 모두 AI로 구동됩니다.",
    cta: "얼리 액세스",
    ctaSub: "베타 기간 무료 · 카드 불필요",
    problemTitle: "모든 교사가 아는 문제",
    problems: [
      { icon: "chart", title: "망각 곡선은 현실입니다", desc: "학생들은 며칠 안에 배운 내용 대부분을 잊습니다. 체계적 복습 없이는 최고의 수업도 사라집니다." },
      { icon: "clock", title: "복습 자료 만들 시간이 없습니다", desc: "새 수업 준비도 빠듯한데, 과거 주제마다 복습 자료를 만드는 건 불가능합니다." },
      { icon: "matching", title: "복습이 무작위입니다", desc: "복습할 때 감에 의존하지, 데이터에 기반하지 않습니다. 각 학생이 실제로 뭘 기억하는지 모릅니다." },
    ],
    solutionTitle: "Clasloop이 기억을 자동화합니다",
    solutionSub: "매 수업 시작과 끝에 5분. 그것만으로 충분합니다.",
    howTitle: "사용법",
    steps: [
      { num: "01", title: "평소처럼 수업하세요", desc: "수업 후 주제와 핵심 포인트를 입력하세요. 30초면 됩니다.", icon: "book" },
      { num: "02", title: "AI가 문제를 생성합니다", desc: "Clasloop이 즉시 복습 문제를 만듭니다 — 학년과 언어에 맞춘 객관식.", icon: "brain" },
      { num: "03", title: "학생들이 수업 중 복습합니다", desc: "3분짜리 워밍업이나 마무리 퀴즈를 시작하세요. 학생들은 PIN으로 휴대폰에서 참여합니다.", icon: "pin" },
      { num: "04", title: "시스템이 잊는 것을 기억합니다", desc: "Clasloop이 주제별, 학생별 기억률을 추적합니다. 정확히 무엇을 언제 복습할지 알려줍니다.", icon: "brain" },
    ],
    featuresTitle: "실제 교실에 맞게 설계되었습니다",
    features: [
      { icon: "warmup", title: "워밍업 & 마무리 퀴즈", desc: "빠른 복습으로 수업을 시작하거나 마무리하세요. PIN으로 참여 — 앱 다운로드 불필요." },
      { icon: "chart", title: "기억률 대시보드", desc: "어떤 주제를 잊고 있는지 확인하세요. 오늘 복습할 내용을 AI가 제안합니다." },
      { icon: "target", title: "자기주도 학습", desc: "학생이 약한 주제를 보고 스스로 연습합니다. XP, 레벨, 수집 캐릭터가 동기를 부여합니다." },
      { icon: "globe", title: "3개국어 지원", desc: "영어, 스페인어, 한국어 완벽 지원. AI가 수업 언어로 문제를 생성합니다." },
      { icon: "book", title: "커뮤니티 덱", desc: "다른 교사와 복습 덱을 공유하세요. 학년과 과목에 맞는 콘텐츠를 찾아보세요." },
      { icon: "science", title: "과학적 기반", desc: "간격 반복 위에 구축 — 장기 기억을 위한 가장 검증된 방법입니다." },
    ],
    teacherView: "교사 화면",
    studentView: "학생 화면",
    pricingTitle: "간단한 가격",
    pricingSub: "베타 기간 무료. 출시 후:",
    plans: [
      { name: "무료", price: "$0", period: "/영구", desc: "시작하는 교사를 위해", features: ["주 3회 세션", "최대 30명", "커뮤니티 덱", "기본 분석"] },
      { name: "프로", price: "$7", period: "/월", desc: "전체 기능을 원하는 교사를 위해", features: ["무제한 세션", "최대 50명", "전체 기억률 대시보드", "자료 업로드", "우선 AI 생성"], badge: "인기" },
      { name: "학교", price: "$3", period: "/학생/년", desc: "학교 및 교육청을 위해", features: ["프로 전체 기능", "무제한 학생", "학교 전체 분석", "교장 대시보드", "전담 온보딩"] },
    ],
    finalTitle: "학생들은 당신이 가르치는 것을 기억할 자격이 있습니다.",
    finalSub: "베타에 참여하고 Clasloop을 가장 먼저 사용하세요.",
    finalCta: "얼리 액세스 — 무료",
    footer: "전 세계 교사를 위해 ♾ 로 만들었습니다",
    emailPlaceholder: "이메일 주소",
    joinBeta: "베타 참여",
    comingSoon: "2026년 출시",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html{font-size:16px;scroll-behavior:smooth}
  body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  a{color:inherit;text-decoration:none}

  @keyframes fi{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

  .reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
  .reveal.visible{opacity:1;transform:translateY(0)}

  input[type="email"]{
    font-family:'DM Sans',sans-serif;background:${C.bg};border:1.5px solid ${C.border};
    color:${C.text};padding:14px 18px;border-radius:10px;font-size:15px;outline:none;
    transition:border-color .15s,box-shadow .15s;width:100%;
  }
  input[type="email"]:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input[type="email"]::placeholder{color:${C.textMuted}}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
`;

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Section({ children, id, style = {} }) {
  const ref = useReveal();
  return <section ref={ref} id={id} className="reveal" style={{ padding: "80px 24px", maxWidth: 1080, margin: "0 auto", ...style }}>{children}</section>;
}

function LangSw({ lang, setLang }) {
  return (
    <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
      {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
        <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, boxShadow: lang === c ? "0 1px 3px rgba(0,0,0,.06)" : "none" }}>{l}</button>
      ))}
    </div>
  );
}

function EmailCapture({ d }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderRadius: 10, background: C.greenSoft, color: C.green, fontWeight: 500, fontSize: 15 }}>
      ✓ {email} — {d.lang === "en" ? "You're on the list!" : d.lang === "es" ? "¡Estás en la lista!" : "등록 완료!"}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 10, maxWidth: 440, width: "100%" }}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={d.emailPlaceholder} style={{ flex: 1 }} />
      <button onClick={() => email.includes("@") && setSent(true)} style={{
        padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600,
        background: C.accent, color: "#fff", whiteSpace: "nowrap",
        opacity: email.includes("@") ? 1 : .5,
      }}>{d.joinBeta}</button>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");
  const d = { ...t[lang], lang };

  return (
    <>
      <style>{css}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(255,255,255,.85)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", gap: 20 }}>
              {d.nav.map((n, i) => (
                <a key={i} href={`#s${i}`} style={{ fontSize: 13, fontWeight: 500, color: C.textSecondary, transition: "color .15s" }}
                  onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.textSecondary}>{n}</a>
              ))}
            </div>
            <LangSw lang={lang} setLang={setLang} />
            <a href="#final" style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: C.accent, color: "#fff",
            }}>{d.cta}</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px", textAlign: "center",
        background: `radial-gradient(ellipse at 50% 20%, ${C.accentSoft}, ${C.bg} 70%)`,
      }}>
        <div style={{ animation: "fi .6s ease-out both" }}>
          <div style={{
            display: "inline-block", padding: "6px 14px", borderRadius: 20,
            background: C.greenSoft, color: C.green, fontSize: 13, fontWeight: 600,
            marginBottom: 24,
          }}>{d.comingSoon}</div>
          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(36px, 5.5vw, 64px)",
            fontWeight: 400, lineHeight: 1.15, maxWidth: 720, margin: "0 auto 24px",
            letterSpacing: "-.02em",
          }}>{d.hero}</h1>
          <p style={{
            fontSize: "clamp(16px, 2vw, 19px)", color: C.textSecondary,
            maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.6,
          }}>{d.heroSub}</p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <EmailCapture d={d} />
            <p style={{ fontSize: 13, color: C.textMuted }}>{d.ctaSub}</p>
          </div>
        </div>

        {/* Floating preview mockup */}
        <div style={{
          marginTop: 56, animation: "fi .6s ease-out .3s both",
          background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
          boxShadow: "0 20px 60px rgba(0,0,0,.08)", padding: 20, maxWidth: 560, width: "100%",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
            <span style={{ marginLeft: 8, fontSize: 12, color: C.textMuted }}>clasloop.com</span>
          </div>
          <div style={{ background: C.bgSoft, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.textMuted }}>{lang === "en" ? "Suggested for today" : lang === "es" ? "Sugerido para hoy" : "오늘 추천 복습"}</span>
            </div>
            {[
              { topic: lang === "en" ? "Photosynthesis" : lang === "es" ? "Fotosíntesis" : "광합성", ret: 45, col: C.red },
              { topic: lang === "en" ? "Cell Division" : lang === "es" ? "División Celular" : "세포 분열", ret: 38, col: C.red },
              { topic: lang === "en" ? "Linear Functions" : lang === "es" ? "Funciones Lineales" : "일차함수", ret: 61, col: C.orange },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: C.bg, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.topic}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 60, height: 4, background: C.bgSoft, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${item.ret}%`, height: "100%", background: item.col, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: item.col }}>{item.ret}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <Section style={{ background: C.bgSoft, padding: "80px 24px", maxWidth: "100%", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, textAlign: "center", marginBottom: 48, letterSpacing: "-.01em" }}>{d.problemTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {d.problems.map((p, i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28 }}>
                <span style={{ fontSize: 32, display: "block", marginBottom: 14 }}><CIcon name={p.icon} size={28} inline /></span>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Solution ── */}
      <Section>
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, marginBottom: 12, letterSpacing: "-.01em" }}>{d.solutionTitle}</h2>
          <p style={{ fontSize: 17, color: C.textSecondary, lineHeight: 1.6 }}>{d.solutionSub}</p>
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section id="s0" style={{ paddingTop: 0 }}>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, textAlign: "center", marginBottom: 48, letterSpacing: "-.01em" }}>{d.howTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {d.steps.map((s, i) => (
            <div key={i} style={{ padding: 28, borderRadius: 14, background: C.bgSoft, border: `1px solid ${C.border}`, position: "relative" }}>
              <span style={{ fontSize: 40, fontFamily: "'Instrument Serif',serif", color: C.accent, opacity: .3, position: "absolute", top: 16, right: 20, fontWeight: 400 }}>{s.num}</span>
              <span style={{ fontSize: 32, display: "block", marginBottom: 14 }}><CIcon name={s.icon} size={28} inline /></span>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Features ── */}
      <Section id="s1" style={{ background: C.bgSoft, padding: "80px 24px", maxWidth: "100%", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, textAlign: "center", marginBottom: 48, letterSpacing: "-.01em" }}>{d.featuresTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {d.features.map((f, i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}><CIcon name={f.icon} size={20} inline /></span>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Pricing ── */}
      <Section id="s2">
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, textAlign: "center", marginBottom: 8, letterSpacing: "-.01em" }}>{d.pricingTitle}</h2>
        <p style={{ fontSize: 15, color: C.textSecondary, textAlign: "center", marginBottom: 40 }}>{d.pricingSub}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {d.plans.map((p, i) => (
            <div key={i} style={{
              background: C.bg, borderRadius: 14, padding: 28, position: "relative",
              border: p.badge ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              boxShadow: p.badge ? "0 8px 24px rgba(35,131,226,.1)" : "none",
            }}>
              {p.badge && <span style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                padding: "4px 14px", borderRadius: 20, background: C.accent, color: "#fff",
                fontSize: 12, fontWeight: 600,
              }}>{p.badge}</span>}
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{p.name}</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>{p.desc}</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{p.price}</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>{p.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.textSecondary }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: C.greenSoft, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <section id="final" style={{
        padding: "100px 24px", textAlign: "center",
        background: `linear-gradient(180deg, ${C.bg}, ${C.accentSoft})`,
      }}>
        <h2 style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 400,
          maxWidth: 600, margin: "0 auto 16px", lineHeight: 1.2, letterSpacing: "-.01em",
        }}>{d.finalTitle}</h2>
        <p style={{ fontSize: 16, color: C.textSecondary, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>{d.finalSub}</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <EmailCapture d={d} />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "32px 24px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: C.textMuted }}>{d.footer}</p>
        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>© 2026 Clasloop</p>
      </footer>
    </>
  );
}
