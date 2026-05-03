import { CIcon } from "../components/Icons";
import { useState } from "react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  accentDark: "#1B6EC2", green: "#0F7B6C", greenSoft: "#EEFBF5",
  orange: "#D9730D", orangeSoft: "#FFF3E0", red: "#E03E3E", redSoft: "#FDECEC",
  purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";

const AVATARS = [
  { id: "fox", emoji: "🦊" }, { id: "cat", emoji: "🐱" }, { id: "dog", emoji: "🐶" },
  { id: "panda", emoji: "🐼" }, { id: "bunny", emoji: "🐰" }, { id: "bear", emoji: "🐻" },
  { id: "owl", emoji: "🦉" }, { id: "penguin", emoji: "🐧" }, { id: "koala", emoji: "🐨" },
];

const i18n = {
  en: {
    welcome: "Welcome to Clasloop",
    welcomeSub: "Let's get you set up in 60 seconds",
    iAmTeacher: "I'm a Teacher",
    iAmStudent: "I'm a Student",
    // Teacher flow
    createAccount: "Create your account",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    namePlaceholder: "Your full name",
    emailPlaceholder: "you@school.edu",
    passwordPlaceholder: "At least 8 characters",
    continue: "Continue",
    setupClass: "Set up your first class",
    setupClassSub: "You can add more classes later",
    className: "Class name",
    classNamePlaceholder: "e.g. 8th Grade History, Period 2",
    grade: "Grade",
    subject: "Subject",
    selectGrade: "Select...",
    selectSubject: "Select...",
    subjects: ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "PE", "Other"],
    grades: ["6th", "7th", "8th", "9th", "10th", "11th", "12th"],
    quickTour: "Quick tour",
    tourTitle1: "Create a session in seconds",
    tourDesc1: "After your lesson, type the topic. Our AI generates review questions instantly.",
    tourTitle2: "Students join with a PIN",
    tourDesc2: "Launch a warmup or exit ticket. Students answer from their phones — no app download.",
    tourTitle3: "Track what they remember",
    tourDesc3: "Your dashboard shows retention per topic. It tells you what to review and when.",
    skip: "Skip tour",
    next: "Next",
    letsGo: "Let's go!",
    allSet: "You're all set!",
    allSetSub: "Your class is ready. Create your first session to get started.",
    goToDashboard: "Go to Dashboard",
    step: "Step",
    of: "of",
    or: "or",
    continueGoogle: "Continue with Google",
    // Student flow
    joinClass: "Join your class",
    joinClassSub: "Enter the code your teacher gave you",
    classCode: "Class code",
    classCodePlaceholder: "e.g. HIST-8A",
    yourName: "Your name",
    yourNamePlaceholder: "What should we call you?",
    chooseAvatar: "Choose your character",
    chooseAvatarSub: "You'll unlock more as you level up!",
    welcomeStudent: "Welcome aboard!",
    welcomeStudentSub: "You're now part of",
    yourTeacher: "Your teacher",
    startLearning: "Start learning",
    avatarSelected: "Great choice!",
    back: "Back",
    alreadyAccount: "Already have an account?",
    signIn: "Sign in",
    termsText: "By continuing, you agree to our Terms and Privacy Policy",
  },
  es: {
    welcome: "Bienvenido a Clasloop",
    welcomeSub: "Te configuramos en 60 segundos",
    iAmTeacher: "Soy Profesor",
    iAmStudent: "Soy Estudiante",
    createAccount: "Crea tu cuenta",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    password: "Contraseña",
    namePlaceholder: "Tu nombre completo",
    emailPlaceholder: "tu@escuela.edu",
    passwordPlaceholder: "Mínimo 8 caracteres",
    continue: "Continuar",
    setupClass: "Configura tu primera clase",
    setupClassSub: "Puedes agregar más clases después",
    className: "Nombre de la clase",
    classNamePlaceholder: "ej. Historia 8° Grado, Grupo A",
    grade: "Grado",
    subject: "Materia",
    selectGrade: "Seleccionar...",
    selectSubject: "Seleccionar...",
    subjects: ["Matemáticas", "Ciencias", "Historia", "Lengua", "Geografía", "Arte", "Música", "Ed. Física", "Otra"],
    grades: ["6°", "7°", "8°", "9°", "10°", "11°", "12°"],
    quickTour: "Tour rápido",
    tourTitle1: "Crea una sesión en segundos",
    tourDesc1: "Después de tu clase, escribe el tema. Nuestra IA genera preguntas de repaso al instante.",
    tourTitle2: "Los alumnos entran con un PIN",
    tourDesc2: "Lanza un warmup o exit ticket. Los alumnos responden desde sus celulares — sin descargar app.",
    tourTitle3: "Rastrea lo que recuerdan",
    tourDesc3: "Tu panel muestra la retención por tema. Te dice qué repasar y cuándo.",
    skip: "Saltar tour",
    next: "Siguiente",
    letsGo: "¡Empecemos!",
    allSet: "¡Todo listo!",
    allSetSub: "Tu clase está lista. Crea tu primera sesión para comenzar.",
    goToDashboard: "Ir al Panel",
    step: "Paso",
    of: "de",
    or: "o",
    continueGoogle: "Continuar con Google",
    joinClass: "Únete a tu clase",
    joinClassSub: "Ingresa el código que te dio tu profesor",
    classCode: "Código de clase",
    classCodePlaceholder: "ej. HIST-8A",
    yourName: "Tu nombre",
    yourNamePlaceholder: "¿Cómo te llamamos?",
    chooseAvatar: "Elige tu personaje",
    chooseAvatarSub: "¡Desbloquearás más subiendo de nivel!",
    welcomeStudent: "¡Bienvenido a bordo!",
    welcomeStudentSub: "Ahora eres parte de",
    yourTeacher: "Tu profesor/a",
    startLearning: "Empezar a aprender",
    avatarSelected: "¡Buena elección!",
    back: "Atrás",
    alreadyAccount: "¿Ya tienes cuenta?",
    signIn: "Iniciar sesión",
    termsText: "Al continuar, aceptas nuestros Términos y Política de Privacidad",
  },
  ko: {
    welcome: "Clasloop에 오신 것을 환영합니다",
    welcomeSub: "60초 안에 설정을 완료하세요",
    iAmTeacher: "교사입니다",
    iAmStudent: "학생입니다",
    createAccount: "계정 만들기",
    fullName: "이름",
    email: "이메일",
    password: "비밀번호",
    namePlaceholder: "전체 이름",
    emailPlaceholder: "you@school.edu",
    passwordPlaceholder: "8자 이상",
    continue: "계속",
    setupClass: "첫 번째 수업 설정",
    setupClassSub: "나중에 더 추가할 수 있습니다",
    className: "수업 이름",
    classNamePlaceholder: "예: 중2 역사, 2반",
    grade: "학년",
    subject: "과목",
    selectGrade: "선택...",
    selectSubject: "선택...",
    subjects: ["수학", "과학", "역사", "국어", "지리", "미술", "음악", "체육", "기타"],
    grades: ["중1", "중2", "중3", "고1", "고2", "고3", "대1"],
    quickTour: "퀵 투어",
    tourTitle1: "몇 초 만에 세션 만들기",
    tourDesc1: "수업 후 주제를 입력하세요. AI가 즉시 복습 문제를 생성합니다.",
    tourTitle2: "PIN으로 학생 참여",
    tourDesc2: "워밍업이나 마무리 퀴즈를 시작하세요. 학생들은 휴대폰으로 참여합니다.",
    tourTitle3: "기억률을 추적하세요",
    tourDesc3: "대시보드에서 주제별 기억률을 확인하세요. 무엇을 언제 복습할지 알려줍니다.",
    skip: "건너뛰기",
    next: "다음",
    letsGo: "시작하기!",
    allSet: "준비 완료!",
    allSetSub: "수업이 준비되었습니다. 첫 번째 세션을 만들어보세요.",
    goToDashboard: "대시보드로",
    step: "단계",
    of: "/",
    or: "또는",
    continueGoogle: "Google로 계속",
    joinClass: "수업 참여",
    joinClassSub: "선생님이 준 코드를 입력하세요",
    classCode: "수업 코드",
    classCodePlaceholder: "예: HIST-8A",
    yourName: "이름",
    yourNamePlaceholder: "뭐라고 부를까요?",
    chooseAvatar: "캐릭터를 선택하세요",
    chooseAvatarSub: "레벨이 오르면 더 많이 잠금 해제됩니다!",
    welcomeStudent: "환영합니다!",
    welcomeStudentSub: "이제 다음 수업의 일원입니다:",
    yourTeacher: "담당 선생님",
    startLearning: "학습 시작",
    avatarSelected: "좋은 선택!",
    back: "뒤로",
    alreadyAccount: "이미 계정이 있나요?",
    signIn: "로그인",
    termsText: "계속하면 이용약관 및 개인정보 처리방침에 동의합니다",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  input,select{font-family:'DM Sans',sans-serif;background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:11px 14px;border-radius:8px;font-size:14px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus,select:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input::placeholder{color:${C.textMuted}}
  select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
  @keyframes check{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
  .fi{animation:fi .35s ease-out both}
  .f1{animation:fi .35s ease-out .06s both}
  .f2{animation:fi .35s ease-out .12s both}
  .f3{animation:fi .35s ease-out .18s both}
  .pop{animation:pop .4s cubic-bezier(.34,1.56,.64,1) both}
`;

// ─── Primitives ─────────────────────────────────────
const Logo = ({ s = 24 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s + 4, height: s + 4, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s * .6} height={s * .6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <span style={{ fontSize: s * .75, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const Btn = ({ children, v = "primary", onClick, disabled, style = {}, full }) => {
  const base = { padding: "11px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: full ? "100%" : "auto", opacity: disabled ? .4 : 1, pointerEvents: disabled ? "none" : "auto" };
  const vs = {
    primary: { background: C.accent, color: "#fff" },
    secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.textSecondary, padding: "8px 4px" },
    google: { background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontWeight: 500 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
};

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, boxShadow: lang === c ? C.shadow : "none" }}>{l}</button>
    ))}
  </div>
);

const Steps = ({ current, total }) => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i === current ? 24 : 8, height: 8, borderRadius: 4,
        background: i === current ? C.accent : i < current ? C.green : C.border,
        transition: "all .3s ease",
      }} />
    ))}
  </div>
);

const Shell = ({ children, lang, setLang, step, total, onBack }) => (
  <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && <Btn v="ghost" onClick={onBack} style={{ padding: "6px 0", fontSize: 13 }}>←</Btn>}
        <Logo s={20} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {total && <span style={{ fontSize: 12, color: C.textMuted }}>{step + 1}/{total}</span>}
        <LangSw lang={lang} setLang={setLang} />
      </div>
    </div>
    {total && <div style={{ padding: "12px 24px 0" }}><Steps current={step} total={total} /></div>}
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      {children}
    </div>
  </div>
);

// ─── Screens ────────────────────────────────────────

const RoleSelect = ({ d, setRole }) => (
  <div style={{ textAlign: "center", maxWidth: 400, width: "100%" }}>
    <div className="fi" style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><Logo s={32} /></div>
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, fontWeight: 400, marginBottom: 8, letterSpacing: "-.01em" }}>{d.welcome}</h1>
      <p style={{ color: C.textSecondary, fontSize: 15 }}>{d.welcomeSub}</p>
    </div>
    <div className="f1" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Btn full onClick={() => setRole("teacher")} style={{ padding: "16px 24px", fontSize: 16 }}>
        <CIcon name="teacher" size={18} inline /> {d.iAmTeacher}
      </Btn>
      <Btn v="secondary" full onClick={() => setRole("student")} style={{ padding: "16px 24px", fontSize: 16 }}>
        <CIcon name="student" size={18} inline /> {d.iAmStudent}
      </Btn>
    </div>
    <p className="f2" style={{ marginTop: 24, fontSize: 13, color: C.textMuted }}>
      {d.alreadyAccount} <span style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}>{d.signIn}</span>
    </p>
  </div>
);

// ── Teacher Flow ──

const TeacherRegister = ({ d, onNext, onBack }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const valid = name.trim() && email.includes("@") && pass.length >= 8;

  return (
    <div style={{ maxWidth: 400, width: "100%" }}>
      <h2 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400, marginBottom: 4, letterSpacing: "-.01em" }}>{d.createAccount}</h2>
      <p className="fi" style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}><CIcon name="teacher" size={14} inline /> {d.iAmTeacher}</p>

      <div className="f1" style={{ marginBottom: 16 }}>
        <Btn v="google" full style={{ padding: "12px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {d.continueGoogle}
        </Btn>
      </div>

      <div className="f1" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 12, color: C.textMuted }}>{d.or}</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      <div className="f2" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.fullName}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={d.namePlaceholder} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.email}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={d.emailPlaceholder} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.password}</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder={d.passwordPlaceholder} />
        </div>
      </div>

      <div className="f3" style={{ marginTop: 20 }}>
        <Btn full onClick={() => onNext({ name, email })} disabled={!valid}>{d.continue}</Btn>
        <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 10, lineHeight: 1.4 }}>{d.termsText}</p>
      </div>
    </div>
  );
};

const TeacherClassSetup = ({ d, onNext, onBack }) => {
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const valid = className.trim() && grade && subject;

  return (
    <div style={{ maxWidth: 400, width: "100%" }}>
      <h2 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400, marginBottom: 4, letterSpacing: "-.01em" }}>{d.setupClass}</h2>
      <p className="fi" style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}>{d.setupClassSub}</p>

      <div className="f1" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.className}</label>
          <input value={className} onChange={e => setClassName(e.target.value)} placeholder={d.classNamePlaceholder} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.grade}</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}><option value="">{d.selectGrade}</option>{d.grades.map(g => <option key={g}>{g}</option>)}</select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.subject}</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}><option value="">{d.selectSubject}</option>{d.subjects.map(s => <option key={s}>{s}</option>)}</select>
          </div>
        </div>
      </div>

      <div className="f2" style={{ marginTop: 20, padding: 16, borderRadius: 10, background: C.accentSoft, border: `1px solid ${C.accent}22` }}>
        <p style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>
          <CIcon name="lightbulb" size={14} inline /> {d.lang === "en" ? "Your students will join with code:" : d.lang === "es" ? "Tus alumnos se unirán con el código:" : "학생들이 참여할 코드:"}
          <span style={{ fontFamily: MONO, fontWeight: 700, marginLeft: 6, fontSize: 15 }}>
            {subject ? subject.slice(0, 4).toUpperCase() : "SUBJ"}-{grade ? grade.replace(/[^0-9]/g, "") : "0"}A
          </span>
        </p>
      </div>

      <div className="f2" style={{ marginTop: 20 }}>
        <Btn full onClick={() => onNext({ className, grade, subject })} disabled={!valid}>{d.continue}</Btn>
      </div>
    </div>
  );
};

const TeacherTour = ({ d, onNext, onSkip }) => {
  const [step, setStep] = useState(0);
  const slides = [
    { icon: "book", title: d.tourTitle1, desc: d.tourDesc1, color: C.accent, colorSoft: C.accentSoft },
    { icon: "pin", title: d.tourTitle2, desc: d.tourDesc2, color: C.green, colorSoft: C.greenSoft },
    { icon: "brain", title: d.tourTitle3, desc: d.tourDesc3, color: C.purple, colorSoft: C.purpleSoft },
  ];
  const s = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
      <p className="fi" style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
        {d.quickTour} · {step + 1}/{slides.length}
      </p>

      <div className="pop" key={step} style={{
        width: 80, height: 80, borderRadius: 20, margin: "0 auto 24px",
        background: s.colorSoft, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36,
      }}>
        {s.icon}
      </div>

      <h2 className="fi" key={`t${step}`} style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, fontWeight: 400, marginBottom: 10, letterSpacing: "-.01em" }}>
        {s.title}
      </h2>
      <p className="f1" key={`d${step}`} style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.6, marginBottom: 32, maxWidth: 360, margin: "0 auto 32px" }}>
        {s.desc}
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <Steps current={step} total={slides.length} />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {!isLast && <Btn v="ghost" onClick={onSkip}>{d.skip}</Btn>}
        <Btn onClick={() => isLast ? onNext() : setStep(step + 1)}>
          {isLast ? d.letsGo : d.next} →
        </Btn>
      </div>
    </div>
  );
};

const TeacherComplete = ({ d, teacher, classInfo, onFinish }) => (
  <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
    <div className="pop" style={{
      width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
      background: C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, animation: "check .5s ease-out .2s both" }} />
      </svg>
    </div>

    <h2 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontWeight: 400, marginBottom: 8 }}>{d.allSet}</h2>
    <p className="f1" style={{ color: C.textSecondary, fontSize: 15, marginBottom: 28 }}>{d.allSetSub}</p>

    <div className="f2" style={{
      padding: 20, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`,
      textAlign: "left", marginBottom: 24, boxShadow: C.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}><CIcon name="book" size={16} inline /></div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{classInfo.className}</div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>{classInfo.grade} · {classInfo.subject}</div>
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderRadius: 8, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: C.textSecondary }}>
          {d.lang === "en" ? "Student code" : d.lang === "es" ? "Código" : "학생 코드"}
        </span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: C.accent }}>
          {classInfo.subject.slice(0, 4).toUpperCase()}-{classInfo.grade.replace(/[^0-9]/g, "")}A
        </span>
      </div>
    </div>

    <Btn full onClick={onFinish} style={{ padding: "14px" }}>{d.goToDashboard} →</Btn>
  </div>
);

// ── Student Flow ──

const StudentJoinClass = ({ d, onNext, onBack }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const valid = code.trim().length >= 3 && name.trim();

  return (
    <div style={{ maxWidth: 400, width: "100%" }}>
      <h2 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400, marginBottom: 4, letterSpacing: "-.01em" }}>{d.joinClass}</h2>
      <p className="fi" style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}>{d.joinClassSub}</p>

      <div className="f1" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.classCode}</label>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder={d.classCodePlaceholder}
            style={{ textAlign: "center", fontSize: 22, fontFamily: MONO, fontWeight: 700, letterSpacing: ".1em", padding: 14 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.yourName}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={d.yourNamePlaceholder} />
        </div>
      </div>

      <div className="f2" style={{ marginTop: 20 }}>
        <Btn full onClick={() => onNext({ code, name })} disabled={!valid}>{d.continue}</Btn>
      </div>
    </div>
  );
};

const StudentAvatar = ({ d, onNext, onBack }) => {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
      <h2 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400, marginBottom: 4 }}>{d.chooseAvatar}</h2>
      <p className="fi" style={{ color: C.textSecondary, fontSize: 14, marginBottom: 28 }}>{d.chooseAvatarSub}</p>

      <div className="f1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 300, margin: "0 auto 28px" }}>
        {AVATARS.map((av) => (
          <button key={av.id} onClick={() => setSelected(av.id)} style={{
            width: "100%", aspectRatio: "1", borderRadius: 16,
            background: selected === av.id ? C.accentSoft : C.bg,
            border: selected === av.id ? `2.5px solid ${C.accent}` : `1.5px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, transition: "all .15s",
            transform: selected === av.id ? "scale(1.08)" : "scale(1)",
            boxShadow: selected === av.id ? `0 4px 12px ${C.accent}22` : "none",
          }}>
            {av.emoji}
          </button>
        ))}
      </div>

      {selected && (
        <p className="pop" style={{ fontSize: 14, color: C.green, fontWeight: 500, marginBottom: 16 }}>
          {d.avatarSelected} {AVATARS.find(a => a.id === selected)?.emoji}
        </p>
      )}

      <Btn full onClick={() => onNext(selected)} disabled={!selected}>{d.continue}</Btn>
    </div>
  );
};

const StudentComplete = ({ d, studentInfo, avatar, onFinish }) => {
  const av = AVATARS.find(a => a.id === avatar);
  return (
    <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
      <div className="pop" style={{
        width: 88, height: 88, borderRadius: "50%", margin: "0 auto 20px",
        background: C.accentSoft, border: `3px solid ${C.accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
      }}>
        {av?.emoji || "🦊"}
      </div>

      <h2 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>
        {d.welcomeStudent}, {studentInfo.name}!
      </h2>
      <p className="f1" style={{ color: C.textSecondary, fontSize: 15, marginBottom: 24 }}>
        {d.welcomeStudentSub}
      </p>

      <div className="f2" style={{
        padding: 20, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`,
        marginBottom: 24, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}><CIcon name="book" size={16} inline /></div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {d.lang === "en" ? "8th Grade History" : d.lang === "es" ? "Historia 8° Grado" : "중2 역사"}
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary }}>{d.yourTeacher}: Ms. Johnson</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: C.purpleSoft, fontSize: 13, fontWeight: 600, color: C.purple }}>Lv.1</div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: C.orangeSoft, fontSize: 13, fontWeight: 600, color: C.orange }}>0 XP</div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: C.greenSoft, fontSize: 13, fontWeight: 600, color: C.green }}><CIcon name="fire" size={12} inline /> 0</div>
        </div>
      </div>

      <Btn full onClick={onFinish} style={{ padding: "14px" }}>{d.startLearning} →</Btn>
    </div>
  );
};

// ─── App ────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [scr, setScr] = useState("role");
  const [role, setRole] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [avatar, setAvatar] = useState(null);

  const d = { ...i18n[lang], lang };

  // Teacher steps: role → register → class → tour → complete
  // Student steps: role → joinClass → avatar → complete
  const teacherStep = scr === "tRegister" ? 0 : scr === "tClass" ? 1 : scr === "tTour" ? 2 : scr === "tComplete" ? 3 : null;
  const studentStep = scr === "sJoin" ? 0 : scr === "sAvatar" ? 1 : scr === "sComplete" ? 2 : null;

  const totalT = 4;
  const totalS = 3;

  return (
    <>
      <style>{css}</style>

      {scr === "role" && (
        <Shell lang={lang} setLang={setLang}>
          <RoleSelect d={d} setRole={r => { setRole(r); setScr(r === "teacher" ? "tRegister" : "sJoin"); }} />
        </Shell>
      )}

      {scr === "tRegister" && (
        <Shell lang={lang} setLang={setLang} step={teacherStep} total={totalT} onBack={() => setScr("role")}>
          <TeacherRegister d={d} onNext={data => { setTeacher(data); setScr("tClass"); }} onBack={() => setScr("role")} />
        </Shell>
      )}

      {scr === "tClass" && (
        <Shell lang={lang} setLang={setLang} step={teacherStep} total={totalT} onBack={() => setScr("tRegister")}>
          <TeacherClassSetup d={d} onNext={data => { setClassInfo(data); setScr("tTour"); }} onBack={() => setScr("tRegister")} />
        </Shell>
      )}

      {scr === "tTour" && (
        <Shell lang={lang} setLang={setLang} step={teacherStep} total={totalT} onBack={() => setScr("tClass")}>
          <TeacherTour d={d} onNext={() => setScr("tComplete")} onSkip={() => setScr("tComplete")} />
        </Shell>
      )}

      {scr === "tComplete" && (
        <Shell lang={lang} setLang={setLang} step={teacherStep} total={totalT}>
          <TeacherComplete d={d} teacher={teacher} classInfo={classInfo} onFinish={() => alert("→ Dashboard")} />
        </Shell>
      )}

      {scr === "sJoin" && (
        <Shell lang={lang} setLang={setLang} step={studentStep} total={totalS} onBack={() => setScr("role")}>
          <StudentJoinClass d={d} onNext={data => { setStudentInfo(data); setScr("sAvatar"); }} onBack={() => setScr("role")} />
        </Shell>
      )}

      {scr === "sAvatar" && (
        <Shell lang={lang} setLang={setLang} step={studentStep} total={totalS} onBack={() => setScr("sJoin")}>
          <StudentAvatar d={d} onNext={av => { setAvatar(av); setScr("sComplete"); }} onBack={() => setScr("sJoin")} />
        </Shell>
      )}

      {scr === "sComplete" && (
        <Shell lang={lang} setLang={setLang} step={studentStep} total={totalS}>
          <StudentComplete d={d} studentInfo={studentInfo} avatar={avatar} onFinish={() => alert("→ Student Dashboard")} />
        </Shell>
      )}
    </>
  );
}
