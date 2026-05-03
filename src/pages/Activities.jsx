import { CIcon } from "../components/Icons";
import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7", pink: "#AD1A72", pinkSoft: "#FDEEF6",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4",
};
const MONO = "'JetBrains Mono', monospace";
const OPT_C = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];

const i18n = {
  en: {
    title: "Activity Types",
    subtitle: "Keep every session fresh — pick the format that fits your class",
    tryIt: "Try it!",
    correct: "Correct!",
    incorrect: "Incorrect",
    next: "Next →",
    checkAnswer: "Check",
    submit: "Submit",
    dragHint: "Tap to reorder",
    matchHint: "Tap pairs to match",
    fillHint: "Type the missing word",
    true: "True",
    false: "False",
    streak: "Streak",
    timeBonus: "Time bonus",
    points: "pts",
    matched: "Matched!",
    complete: "Complete!",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    pollResults: "Results",
    votes: "votes",
    selectMode: "Select a mode to try it",
    bestFor: "Best for",
  },
  es: {
    title: "Tipos de Actividad",
    subtitle: "Mantén cada sesión fresca — elige el formato ideal para tu clase",
    tryIt: "¡Pruébalo!",
    correct: "¡Correcto!",
    incorrect: "Incorrecto",
    next: "Siguiente →",
    checkAnswer: "Verificar",
    submit: "Enviar",
    dragHint: "Toca para reordenar",
    matchHint: "Toca pares para emparejar",
    fillHint: "Escribe la palabra faltante",
    true: "Verdadero",
    false: "Falso",
    streak: "Racha",
    timeBonus: "Bonus de tiempo",
    points: "pts",
    matched: "¡Emparejado!",
    complete: "¡Completo!",
    yourAnswer: "Tu respuesta",
    correctAnswer: "Respuesta correcta",
    pollResults: "Resultados",
    votes: "votos",
    selectMode: "Selecciona un modo para probarlo",
    bestFor: "Ideal para",
  },
  ko: {
    title: "활동 유형",
    subtitle: "매 세션을 신선하게 — 수업에 맞는 형식을 선택하세요",
    tryIt: "체험하기!",
    correct: "정답!",
    incorrect: "오답",
    next: "다음 →",
    checkAnswer: "확인",
    submit: "제출",
    dragHint: "탭하여 순서 변경",
    matchHint: "쌍을 탭하여 매칭",
    fillHint: "빈칸에 단어를 입력하세요",
    true: "참",
    false: "거짓",
    streak: "연속",
    timeBonus: "시간 보너스",
    points: "점",
    matched: "매칭!",
    complete: "완료!",
    yourAnswer: "내 답",
    correctAnswer: "정답",
    pollResults: "결과",
    votes: "표",
    selectMode: "모드를 선택하여 체험하세요",
    bestFor: "추천",
  },
};

const MODES = [
  {
    id: "mcq", icon: "mcq", color: C.accent,
    name: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" },
    desc: { en: "Classic 4-option questions. Fast, familiar, effective.", es: "Preguntas clásicas de 4 opciones. Rápido y efectivo.", ko: "클래식 4지선다. 빠르고 효과적." },
    best: { en: "Quick fact checks, vocabulary, dates", es: "Verificación rápida de datos, vocabulario, fechas", ko: "빠른 팩트 체크, 어휘, 날짜" },
  },
  {
    id: "tf", icon: "truefalse", color: C.green,
    name: { en: "True or False", es: "Verdadero o Falso", ko: "참 거짓" },
    desc: { en: "Simple binary questions. Great for misconception checks.", es: "Preguntas binarias. Ideal para verificar conceptos erróneos.", ko: "간단한 이진 질문. 오개념 확인에 좋습니다." },
    best: { en: "Concept verification, myth-busting", es: "Verificación de conceptos, desmitificación", ko: "개념 확인, 오류 파악" },
  },
  {
    id: "fill", icon: "fillblank", color: C.orange,
    name: { en: "Fill in the Blank", es: "Completar el Espacio", ko: "빈칸 채우기" },
    desc: { en: "Students type the answer. Tests deeper recall than recognition.", es: "Los alumnos escriben la respuesta. Evalúa recuerdo profundo.", ko: "학생이 직접 답을 입력. 인식보다 깊은 기억력 테스트." },
    best: { en: "Key terms, formulas, definitions", es: "Términos clave, fórmulas, definiciones", ko: "핵심 용어, 공식, 정의" },
  },
  {
    id: "order", icon: "ordering", color: C.purple,
    name: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" },
    desc: { en: "Drag items into the correct sequence. Perfect for processes.", es: "Arrastra elementos al orden correcto. Perfecto para procesos.", ko: "올바른 순서로 배열하세요. 과정 학습에 완벽." },
    best: { en: "Timelines, steps, procedures", es: "Cronologías, pasos, procedimientos", ko: "타임라인, 단계, 절차" },
  },
  {
    id: "match", icon: "matching", color: C.pink,
    name: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" },
    desc: { en: "Connect related items. Great for vocabulary and associations.", es: "Conecta elementos relacionados. Ideal para vocabulario.", ko: "관련 항목을 연결하세요. 어휘와 연관 학습에 좋습니다." },
    best: { en: "Vocabulary, cause-effect, translations", es: "Vocabulario, causa-efecto, traducciones", ko: "어휘, 인과관계, 번역" },
  },
  {
    id: "poll", icon: "poll", color: C.yellow,
    name: { en: "Quick Poll", es: "Encuesta Rápida", ko: "빠른 투표" },
    desc: { en: "No right answer — gather opinions. Sparks class discussion.", es: "Sin respuesta correcta — recopila opiniones. Genera discusión.", ko: "정답 없이 의견을 모으세요. 수업 토론을 유발합니다." },
    best: { en: "Warmup discussions, exit reflections, debates", es: "Discusiones de warmup, reflexiones de salida", ko: "워밍업 토론, 마무리 성찰, 토론" },
  },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  input{font-family:'DM Sans',sans-serif;background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:11px 14px;border-radius:8px;font-size:15px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input::placeholder{color:${C.textMuted}}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
  .fi{animation:fi .3s ease-out both}
  .f1{animation:fi .3s ease-out .05s both}
  .f2{animation:fi .3s ease-out .1s both}
`;

const Logo = ({ s = 20 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s + 4, height: s + 4, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s * .6} height={s * .6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <span style={{ fontSize: s * .75, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted }}>{l}</button>
    ))}
  </div>
);

const Btn = ({ children, v = "primary", onClick, disabled, style = {}, full }) => {
  const base = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? .4 : 1, pointerEvents: disabled ? "none" : "auto" };
  const vs = { primary: { background: C.accent, color: "#fff" }, secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` }, success: { background: C.greenSoft, color: C.green } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
};

const Feedback = ({ ok, d }) => (
  <div style={{
    display: "inline-block", padding: "8px 16px", borderRadius: 8,
    background: ok ? C.greenSoft : C.redSoft, color: ok ? C.green : C.red,
    fontSize: 14, fontWeight: 600, animation: ok ? "pop .3s ease-out" : "shake .4s ease-out",
  }}>
    {ok ? "✓ " + d.correct : "✗ " + d.incorrect}
  </div>
);

// ─── MCQ Demo ───────────────────────────────────────
const MCQDemo = ({ d }) => {
  const [sel, setSel] = useState(null);
  const [show, setShow] = useState(false);
  const q = { q: { en: "What year did the French Revolution begin?", es: "¿En qué año comenzó la Revolución Francesa?", ko: "프랑스 혁명은 몇 년에 시작되었나요?" }, opts: ["1776", "1789", "1804", "1815"], correct: 1 };
  const pick = (i) => { if (show) return; setSel(i); setShow(true); };
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 24, lineHeight: 1.4 }}>{q.q[d.lang]}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {q.opts.map((o, i) => {
          let bg = OPT_C[i], op = 1;
          if (show) { bg = i === q.correct ? C.green : i === sel ? C.red : "#ccc"; op = i === q.correct || i === sel ? 1 : .3; }
          return <button key={i} onClick={() => pick(i)} disabled={show} style={{ padding: "16px", borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#fff", background: bg, opacity: op, minHeight: 56, transition: "all .2s" }}>{o}</button>;
        })}
      </div>
      {show && <div style={{ textAlign: "center", marginTop: 16 }}><Feedback ok={sel === q.correct} d={d} /></div>}
    </div>
  );
};

// ─── True/False Demo ────────────────────────────────
const TFDemo = ({ d }) => {
  const [sel, setSel] = useState(null);
  const [show, setShow] = useState(false);
  const q = { q: { en: "The Bastille was a church.", es: "La Bastilla era una iglesia.", ko: "바스티유는 교회였다." }, correct: false };
  const pick = (v) => { if (show) return; setSel(v); setShow(true); };
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 24, lineHeight: 1.4 }}>{q.q[d.lang]}</h3>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {[true, false].map((v) => {
          const isCorrect = v === q.correct;
          let bg = v ? C.green : C.red;
          let op = 1;
          if (show) { bg = isCorrect ? C.green : sel === v ? C.red : "#ccc"; op = isCorrect || sel === v ? 1 : .3; }
          return (
            <button key={String(v)} onClick={() => pick(v)} disabled={show} style={{
              flex: 1, maxWidth: 180, padding: "20px", borderRadius: 12, fontSize: 18, fontWeight: 700,
              color: "#fff", background: bg, opacity: op, transition: "all .2s",
            }}>
              {v ? d.true : d.false}
            </button>
          );
        })}
      </div>
      {show && <div style={{ textAlign: "center", marginTop: 16 }}><Feedback ok={sel === q.correct} d={d} /></div>}
    </div>
  );
};

// ─── Fill in the Blank Demo ─────────────────────────
const FillDemo = ({ d }) => {
  const [ans, setAns] = useState("");
  const [show, setShow] = useState(false);
  const q = { q: { en: "The process by which plants convert sunlight into energy is called _____.", es: "El proceso por el cual las plantas convierten la luz solar en energía se llama _____.", ko: "식물이 햇빛을 에너지로 전환하는 과정을 _____라고 합니다." }, correct: { en: "photosynthesis", es: "fotosíntesis", ko: "광합성" } };
  const correct = q.correct[d.lang];
  const isCorrect = ans.trim().toLowerCase() === correct.toLowerCase();
  const check = () => setShow(true);

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>{q.q[d.lang]}</h3>
      <div style={{ maxWidth: 340, margin: "0 auto" }}>
        <input
          value={ans} onChange={e => setAns(e.target.value)} placeholder={d.fillHint}
          disabled={show}
          onKeyDown={e => e.key === "Enter" && ans.trim() && check()}
          style={{ textAlign: "center", fontSize: 18, fontWeight: 600, padding: 14, marginBottom: 12 }}
        />
        {!show && <Btn full onClick={check} disabled={!ans.trim()}>{d.checkAnswer}</Btn>}
        {show && (
          <div style={{ textAlign: "center" }}>
            <Feedback ok={isCorrect} d={d} />
            {!isCorrect && <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>{d.correctAnswer}: <strong style={{ color: C.green }}>{correct}</strong></p>}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Ordering Demo ──────────────────────────────────
const OrderDemo = ({ d }) => {
  const correctOrder = [
    { en: "Causes: financial crisis & inequality", es: "Causas: crisis financiera y desigualdad", ko: "원인: 재정 위기와 불평등" },
    { en: "Storming of the Bastille (1789)", es: "Toma de la Bastilla (1789)", ko: "바스티유 습격 (1789)" },
    { en: "Declaration of Rights of Man", es: "Declaración de los Derechos del Hombre", ko: "인간과 시민의 권리 선언" },
    { en: "Execution of Louis XVI (1793)", es: "Ejecución de Luis XVI (1793)", ko: "루이 16세 처형 (1793)" },
    { en: "Rise of Napoleon", es: "Ascenso de Napoleón", ko: "나폴레옹의 부상" },
  ];
  const shuffle = (a) => [...a].sort(() => Math.random() - .5);
  const [items, setItems] = useState(() => shuffle([0, 1, 2, 3, 4]));
  const [selected, setSelected] = useState(null);
  const [show, setShow] = useState(false);

  const swap = (i) => {
    if (show) return;
    if (selected === null) { setSelected(i); return; }
    const n = [...items];
    [n[selected], n[i]] = [n[i], n[selected]];
    setItems(n);
    setSelected(null);
  };

  const isCorrect = items.every((v, i) => v === i);
  const check = () => setShow(true);

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 8, lineHeight: 1.4 }}>
        {d.lang === "en" ? "Put these events in order:" : d.lang === "es" ? "Ordena estos eventos:" : "이 사건들을 순서대로 배열하세요:"}
      </h3>
      <p style={{ textAlign: "center", fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{d.dragHint}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 400, margin: "0 auto" }}>
        {items.map((idx, pos) => {
          const isRight = show && idx === pos;
          const isWrong = show && idx !== pos;
          return (
            <button key={pos} onClick={() => swap(pos)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 8,
              background: selected === pos ? C.accentSoft : isRight ? C.greenSoft : isWrong ? C.redSoft : C.bg,
              border: `1.5px solid ${selected === pos ? C.accent : isRight ? C.green + "44" : isWrong ? C.red + "44" : C.border}`,
              textAlign: "left", fontSize: 14, fontWeight: 500,
              transition: "all .15s",
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: show ? (isRight ? C.green : C.red) : C.bgSoft,
                color: show ? "#fff" : C.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
              }}>{pos + 1}</span>
              {correctOrder[idx][d.lang]}
            </button>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        {!show && <Btn onClick={check}>{d.checkAnswer}</Btn>}
        {show && <Feedback ok={isCorrect} d={d} />}
      </div>
    </div>
  );
};

// ─── Matching Demo ──────────────────────────────────
const MatchDemo = ({ d }) => {
  const pairs = [
    { left: { en: "1789", es: "1789", ko: "1789" }, right: { en: "Storming of the Bastille", es: "Toma de la Bastilla", ko: "바스티유 습격" } },
    { left: { en: "1793", es: "1793", ko: "1793" }, right: { en: "Execution of Louis XVI", es: "Ejecución de Luis XVI", ko: "루이 16세 처형" } },
    { left: { en: "1799", es: "1799", ko: "1799" }, right: { en: "Napoleon takes power", es: "Napoleón toma el poder", ko: "나폴레옹 집권" } },
    { left: { en: "1804", es: "1804", ko: "1804" }, right: { en: "Napoleon becomes Emperor", es: "Napoleón se corona Emperador", ko: "나폴레옹 황제 즉위" } },
  ];

  const [shuffledRight] = useState(() => {
    const indices = pairs.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
    return indices;
  });

  const [selLeft, setSelLeft] = useState(null);
  const [selRight, setSelRight] = useState(null);
  const [matched, setMatched] = useState([]);

  const tryMatch = (side, idx) => {
    if (matched.includes(idx) && side === "left") return;
    if (matched.includes(shuffledRight[idx]) && side === "right") return;

    if (side === "left") {
      if (selRight !== null) {
        const rightIdx = shuffledRight[selRight];
        if (idx === rightIdx) { setMatched(p => [...p, idx]); }
        setSelLeft(null); setSelRight(null);
      } else { setSelLeft(idx); }
    } else {
      const rightIdx = shuffledRight[idx];
      if (selLeft !== null) {
        if (selLeft === rightIdx) { setMatched(p => [...p, rightIdx]); }
        setSelLeft(null); setSelRight(null);
      } else { setSelRight(idx); }
    }
  };

  const allMatched = matched.length === pairs.length;

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 8, lineHeight: 1.4 }}>
        {d.lang === "en" ? "Match the dates with events:" : d.lang === "es" ? "Empareja las fechas con los eventos:" : "날짜와 사건을 매칭하세요:"}
      </h3>
      <p style={{ textAlign: "center", fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{d.matchHint}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 440, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pairs.map((p, i) => {
            const isMatched = matched.includes(i);
            return (
              <button key={i} onClick={() => tryMatch("left", i)} style={{
                padding: "12px", borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: "center",
                background: isMatched ? C.greenSoft : selLeft === i ? C.accentSoft : C.bg,
                border: `1.5px solid ${isMatched ? C.green + "44" : selLeft === i ? C.accent : C.border}`,
                color: isMatched ? C.green : C.text,
                opacity: isMatched ? .6 : 1,
                fontFamily: MONO,
              }}>{p.left[d.lang]}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {shuffledRight.map((origIdx, displayIdx) => {
            const isMatched = matched.includes(origIdx);
            return (
              <button key={displayIdx} onClick={() => tryMatch("right", displayIdx)} style={{
                padding: "12px", borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: "center",
                background: isMatched ? C.greenSoft : selRight === displayIdx ? C.accentSoft : C.bg,
                border: `1.5px solid ${isMatched ? C.green + "44" : selRight === displayIdx ? C.accent : C.border}`,
                color: isMatched ? C.green : C.text,
                opacity: isMatched ? .6 : 1,
                lineHeight: 1.3,
              }}>{pairs[origIdx].right[d.lang]}</button>
            );
          })}
        </div>
      </div>
      {allMatched && (
        <div style={{ textAlign: "center", marginTop: 16, animation: "pop .3s ease-out" }}>
          <span style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: C.greenSoft, color: C.green, fontSize: 14, fontWeight: 600 }}>✓ {d.complete}</span>
        </div>
      )}
    </div>
  );
};

// ─── Poll Demo ──────────────────────────────────────
const PollDemo = ({ d }) => {
  const q = { q: { en: "What was the most important cause of the French Revolution?", es: "¿Cuál fue la causa más importante de la Revolución Francesa?", ko: "프랑스 혁명의 가장 중요한 원인은?" } };
  const opts = [
    { en: "Economic inequality", es: "Desigualdad económica", ko: "경제적 불평등" },
    { en: "Weak monarchy", es: "Monarquía débil", ko: "약한 왕정" },
    { en: "Enlightenment ideas", es: "Ideas de la Ilustración", ko: "계몽사상" },
    { en: "Food shortages", es: "Escasez de alimentos", ko: "식량 부족" },
  ];
  const fakeVotes = [42, 18, 28, 12];
  const [voted, setVoted] = useState(null);
  const total = fakeVotes.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: C.yellowSoft, color: C.yellow, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
        <CIcon name="poll" size={14} inline /> {d.lang === "en" ? "No right answer" : d.lang === "es" ? "Sin respuesta correcta" : "정답 없음"}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 20, lineHeight: 1.4 }}>{q.q[d.lang]}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
        {opts.map((o, i) => {
          const pct = Math.round((fakeVotes[i] / total) * 100);
          const isVoted = voted === i;
          return (
            <button key={i} onClick={() => setVoted(i)} style={{
              position: "relative", padding: "14px 16px", borderRadius: 10, textAlign: "left",
              background: C.bg, border: `1.5px solid ${isVoted ? OPT_C[i] : C.border}`,
              overflow: "hidden", transition: "all .2s",
            }}>
              {voted !== null && (
                <div style={{
                  position: "absolute", top: 0, left: 0, bottom: 0,
                  width: `${pct}%`, background: OPT_C[i] + "14",
                  transition: "width .5s ease",
                }} />
              )}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: isVoted ? 600 : 500, color: isVoted ? OPT_C[i] : C.text }}>{o[d.lang]}</span>
                {voted !== null && (
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: OPT_C[i] }}>{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {voted !== null && (
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.textMuted }}>{total} {d.votes}</p>
      )}
    </div>
  );
};

// ─── Demo Map ───────────────────────────────────────
const DEMOS = { mcq: MCQDemo, tf: TFDemo, fill: FillDemo, order: OrderDemo, match: MatchDemo, poll: PollDemo };

// ─── Main App ───────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [active, setActive] = useState(null);
  const [demoKey, setDemoKey] = useState(0);
  const d = { ...i18n[lang], lang };

  const selectMode = (id) => { setActive(id); setDemoKey(k => k + 1); };
  const DemoComponent = active ? DEMOS[active] : null;
  const activeMode = MODES.find(m => m.id === active);

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        {/* Nav */}
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
          <Logo />
          <LangSw lang={lang} setLang={setLang} />
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px" }}>
          {/* Header */}
          <div className="fi" style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, fontWeight: 400, marginBottom: 6, letterSpacing: "-.01em" }}>{d.title}</h1>
            <p style={{ fontSize: 15, color: C.textSecondary }}>{d.subtitle}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
            {/* Mode list */}
            <div className="f1" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {MODES.map((m) => (
                <button key={m.id} onClick={() => selectMode(m.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 10, textAlign: "left",
                  background: active === m.id ? C.bg : "transparent",
                  border: `1.5px solid ${active === m.id ? m.color + "44" : "transparent"}`,
                  boxShadow: active === m.id ? `0 2px 8px ${m.color}11` : "none",
                  transition: "all .15s",
                }}>
                  <span style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: active === m.id ? m.color + "14" : C.bgSoft,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: active === m.id ? m.color : C.text }}>{m.name[lang]}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, lineHeight: 1.3 }}>{m.desc[lang]}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Demo area */}
            <div className="f2" style={{
              background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`,
              padding: 28, minHeight: 400,
              display: "flex", flexDirection: "column",
              boxShadow: "0 4px 16px rgba(0,0,0,.04)",
            }}>
              {!active ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted }}>
                  <span style={{ fontSize: 40, marginBottom: 12 }}><CIcon name="levelup" size={32} inline />/span>
                  <p style={{ fontSize: 15 }}>{d.selectMode}</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}><CIcon name={activeMode.icon} size={16} inline />/span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: activeMode.color }}>{activeMode.name[lang]}</span>
                    </div>
                    <Btn v="secondary" onClick={() => setDemoKey(k => k + 1)} style={{ fontSize: 12, padding: "6px 12px" }}>↻ {d.lang === "en" ? "Reset" : d.lang === "es" ? "Reiniciar" : "초기화"}</Btn>
                  </div>

                  <div style={{ padding: "6px 12px", borderRadius: 6, background: activeMode.color + "0a", marginBottom: 16, fontSize: 12, color: activeMode.color }}>
                    <CIcon name="lightbulb" size={14} inline /> {d.bestFor}: {activeMode.best[lang]}
                  </div>

                  <div key={demoKey} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <DemoComponent d={d} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
