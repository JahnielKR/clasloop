import { useState } from "react";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7", pink: "#AD1A72",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B", border: "#E8E8E4",
  shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const OPT_C = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];

const i18n = {
  en: { pageTitle: "Activities", subtitle: "Keep every session fresh — pick the format that fits", tryIt: "Try it!", correct: "Correct!", incorrect: "Incorrect", next: "Next", checkAnswer: "Check", submit: "Submit", dragHint: "Tap to reorder", matchHint: "Tap pairs to match", fillHint: "Type the missing word", true: "True", false: "False", matched: "Matched!", complete: "Complete!", yourAnswer: "Your answer", correctAnswer: "Correct answer", pollResults: "Results", votes: "votes", selectMode: "Select a mode to try it", bestFor: "Best for", reset: "Reset", noRightAnswer: "No right answer", lang: "en" },
  es: { pageTitle: "Actividades", subtitle: "Mantén cada sesión fresca — elige el formato ideal", tryIt: "¡Pruébalo!", correct: "¡Correcto!", incorrect: "Incorrecto", next: "Siguiente", checkAnswer: "Verificar", submit: "Enviar", dragHint: "Toca para reordenar", matchHint: "Toca pares para emparejar", fillHint: "Escribe la palabra faltante", true: "Verdadero", false: "Falso", matched: "¡Emparejado!", complete: "¡Completo!", yourAnswer: "Tu respuesta", correctAnswer: "Respuesta correcta", pollResults: "Resultados", votes: "votos", selectMode: "Selecciona un modo para probarlo", bestFor: "Ideal para", reset: "Reiniciar", noRightAnswer: "Sin respuesta correcta", lang: "es" },
  ko: { pageTitle: "활동", subtitle: "매 세션을 신선하게 — 수업에 맞는 형식을 선택하세요", tryIt: "체험하기!", correct: "정답!", incorrect: "오답", next: "다음", checkAnswer: "확인", submit: "제출", dragHint: "탭하여 순서 변경", matchHint: "쌍을 탭하여 매칭", fillHint: "빈칸에 단어를 입력하세요", true: "참", false: "거짓", matched: "매칭!", complete: "완료!", yourAnswer: "내 답", correctAnswer: "정답", pollResults: "결과", votes: "표", selectMode: "모드를 선택하여 체험하세요", bestFor: "추천", reset: "초기화", noRightAnswer: "정답 없음", lang: "ko" },
};

const MODES = [
  { id: "mcq", icon: "mcq", color: C.accent, name: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" }, desc: { en: "Classic 4-option questions. Fast, familiar, effective.", es: "Preguntas clásicas de 4 opciones. Rápido y efectivo.", ko: "클래식 4지선다. 빠르고 효과적." }, best: { en: "Quick fact checks, vocabulary, dates", es: "Verificación rápida de datos, vocabulario", ko: "빠른 팩트 체크, 어휘, 날짜" } },
  { id: "tf", icon: "truefalse", color: C.green, name: { en: "True or False", es: "Verdadero o Falso", ko: "참 거짓" }, desc: { en: "Simple binary questions. Great for misconception checks.", es: "Preguntas binarias. Ideal para conceptos erróneos.", ko: "간단한 이진 질문. 오개념 확인에 좋습니다." }, best: { en: "Concept verification, myth-busting", es: "Verificación de conceptos", ko: "개념 확인, 오류 파악" } },
  { id: "fill", icon: "fillblank", color: C.orange, name: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" }, desc: { en: "Students type the answer. Tests deeper recall.", es: "Los alumnos escriben la respuesta.", ko: "학생이 직접 답을 입력." }, best: { en: "Key terms, formulas, definitions", es: "Términos clave, fórmulas", ko: "핵심 용어, 공식, 정의" } },
  { id: "order", icon: "ordering", color: C.purple, name: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" }, desc: { en: "Arrange items in correct sequence.", es: "Arrastra elementos al orden correcto.", ko: "올바른 순서로 배열하세요." }, best: { en: "Timelines, steps, procedures", es: "Cronologías, pasos", ko: "타임라인, 단계, 절차" } },
  { id: "match", icon: "matching", color: C.pink, name: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" }, desc: { en: "Connect related items.", es: "Conecta elementos relacionados.", ko: "관련 항목을 연결하세요." }, best: { en: "Vocabulary, cause-effect, translations", es: "Vocabulario, causa-efecto", ko: "어휘, 인과관계, 번역" } },
  { id: "poll", icon: "poll", color: C.yellow, name: { en: "Quick Poll", es: "Encuesta Rápida", ko: "빠른 투표" }, desc: { en: "No right answer — gather opinions.", es: "Sin respuesta correcta — recopila opiniones.", ko: "정답 없이 의견을 모으세요." }, best: { en: "Warmup discussions, exit reflections", es: "Discusiones de warmup", ko: "워밍업 토론, 마무리 성찰" } },
];

const css = `
  .ac-mode { transition: all .2s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; text-align: left; }
  .ac-mode:hover { background: #E8F0FE !important; border-color: #2383E244 !important; }
  .ac-mode:active { transform: scale(.98); }
  .ac-option { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ac-option:hover { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .ac-option:active { transform: scale(.96); }
  .ac-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ac-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .ac-btn:active { transform: translateY(0) scale(.97); }
  .ac-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .ac-order { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; text-align: left; }
  .ac-order:hover { border-color: #2383E244 !important; background: #FAFBFF !important; }
  .ac-match { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ac-match:hover { border-color: #2383E244 !important; transform: scale(1.02); }
  .ac-poll { transition: all .2s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; text-align: left; width: 100%; }
  .ac-poll:hover { border-color: #2383E244 !important; }
  .ac-input { transition: border-color .15s, box-shadow .15s; }
  .ac-input:hover { border-color: #2383E266 !important; }
  .ac-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .ac-lang { transition: all .12s ease; cursor: pointer; }
  .ac-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-4px); } 40%,80% { transform: translateX(4px); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
  .pop-in { animation: popIn .3s ease-out; }
`;

const Feedback = ({ ok, d }) => (
  <div className="pop-in" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: ok ? C.greenSoft : C.redSoft, color: ok ? C.green : C.red, fontSize: 14, fontWeight: 600, animation: ok ? "popIn .3s ease-out" : "shake .4s ease-out" }}>
    <CIcon name={ok ? "check" : "cross"} size={14} inline /> {ok ? d.correct : d.incorrect}
  </div>
);

function PageHeader({ title, icon, lang, setLang }) {
  return (
    <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", margin: "-28px -20px 24px -20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name={icon} size={28} />
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3 }}>
          {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
            <button key={c} className="ac-lang" onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Demos ──────────────────────────────────────────
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
          return <button key={i} className="ac-option" onClick={() => pick(i)} disabled={show} style={{ padding: 16, borderRadius: 10, fontSize: 15, fontWeight: 600, color: "#fff", background: bg, opacity: op, minHeight: 56 }}>{o}</button>;
        })}
      </div>
      {show && <div style={{ textAlign: "center", marginTop: 16 }}><Feedback ok={sel === q.correct} d={d} /></div>}
    </div>
  );
};

const TFDemo = ({ d }) => {
  const [sel, setSel] = useState(null);
  const [show, setShow] = useState(false);
  const q = { q: { en: "The Bastille was a church.", es: "La Bastilla era una iglesia.", ko: "바스티유는 교회였다." }, correct: false };
  const pick = (v) => { if (show) return; setSel(v); setShow(true); };
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 24, lineHeight: 1.4 }}>{q.q[d.lang]}</h3>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {[true, false].map(v => {
          const isC = v === q.correct;
          let bg = v ? C.green : C.red, op = 1;
          if (show) { bg = isC ? C.green : sel === v ? C.red : "#ccc"; op = isC || sel === v ? 1 : .3; }
          return <button key={String(v)} className="ac-option" onClick={() => pick(v)} disabled={show} style={{ flex: 1, maxWidth: 180, padding: 20, borderRadius: 12, fontSize: 18, fontWeight: 700, color: "#fff", background: bg, opacity: op }}>{v ? d.true : d.false}</button>;
        })}
      </div>
      {show && <div style={{ textAlign: "center", marginTop: 16 }}><Feedback ok={sel === q.correct} d={d} /></div>}
    </div>
  );
};

const FillDemo = ({ d }) => {
  const [ans, setAns] = useState("");
  const [show, setShow] = useState(false);
  const q = { q: { en: "The process by which plants convert sunlight into energy is called _____.", es: "El proceso por el cual las plantas convierten la luz solar en energía se llama _____.", ko: "식물이 햇빛을 에너지로 전환하는 과정을 _____라고 합니다." }, correct: { en: "photosynthesis", es: "fotosíntesis", ko: "광합성" } };
  const correct = q.correct[d.lang];
  const isC = ans.trim().toLowerCase() === correct.toLowerCase();
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>{q.q[d.lang]}</h3>
      <div style={{ maxWidth: 340, margin: "0 auto" }}>
        <input className="ac-input" value={ans} onChange={e => setAns(e.target.value)} placeholder={d.fillHint} disabled={show} onKeyDown={e => e.key === "Enter" && ans.trim() && setShow(true)} style={{ fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 14, borderRadius: 8, fontSize: 18, fontWeight: 600, width: "100%", outline: "none", textAlign: "center", marginBottom: 12 }} />
        {!show && <button className="ac-btn" onClick={() => setShow(true)} disabled={!ans.trim()} style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 14, fontWeight: 600, background: ans.trim() ? C.accent : C.border, color: "#fff", opacity: ans.trim() ? 1 : .4 }}>{d.checkAnswer}</button>}
        {show && (
          <div style={{ textAlign: "center" }}>
            <Feedback ok={isC} d={d} />
            {!isC && <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>{d.correctAnswer}: <strong style={{ color: C.green }}>{correct}</strong></p>}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderDemo = ({ d }) => {
  const items = [
    { en: "Causes: financial crisis & inequality", es: "Causas: crisis financiera y desigualdad", ko: "원인: 재정 위기와 불평등" },
    { en: "Storming of the Bastille (1789)", es: "Toma de la Bastilla (1789)", ko: "바스티유 습격 (1789)" },
    { en: "Declaration of Rights of Man", es: "Declaración de los Derechos del Hombre", ko: "인간과 시민의 권리 선언" },
    { en: "Execution of Louis XVI (1793)", es: "Ejecución de Luis XVI (1793)", ko: "루이 16세 처형 (1793)" },
    { en: "Rise of Napoleon", es: "Ascenso de Napoleón", ko: "나폴레옹의 부상" },
  ];
  const [order, setOrder] = useState(() => [...Array(5).keys()].sort(() => Math.random() - .5));
  const [sel, setSel] = useState(null);
  const [show, setShow] = useState(false);
  const swap = (i) => { if (show) return; if (sel === null) { setSel(i); return; } const n = [...order]; [n[sel], n[i]] = [n[i], n[sel]]; setOrder(n); setSel(null); };
  const isC = order.every((v, i) => v === i);
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>{d.lang === "en" ? "Put these events in order:" : d.lang === "es" ? "Ordena estos eventos:" : "이 사건들을 순서대로 배열하세요:"}</h3>
      <p style={{ textAlign: "center", fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{d.dragHint}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 400, margin: "0 auto" }}>
        {order.map((idx, pos) => {
          const ok = show && idx === pos, bad = show && idx !== pos;
          return (
            <button key={pos} className="ac-order" onClick={() => swap(pos)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, width: "100%",
              background: sel === pos ? C.accentSoft : ok ? C.greenSoft : bad ? C.redSoft : C.bg,
              border: `1.5px solid ${sel === pos ? C.accent : ok ? C.green + "44" : bad ? C.red + "44" : C.border}`, fontSize: 14, fontWeight: 500,
            }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: show ? (ok ? C.green : C.red) : C.bgSoft, color: show ? "#fff" : C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{pos + 1}</span>
              {items[idx][d.lang]}
            </button>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        {!show && <button className="ac-btn" onClick={() => setShow(true)} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: C.accent, color: "#fff" }}>{d.checkAnswer}</button>}
        {show && <Feedback ok={isC} d={d} />}
      </div>
    </div>
  );
};

const MatchDemo = ({ d }) => {
  const pairs = [
    { left: { en: "1789", es: "1789", ko: "1789" }, right: { en: "Storming of the Bastille", es: "Toma de la Bastilla", ko: "바스티유 습격" } },
    { left: { en: "1793", es: "1793", ko: "1793" }, right: { en: "Execution of Louis XVI", es: "Ejecución de Luis XVI", ko: "루이 16세 처형" } },
    { left: { en: "1799", es: "1799", ko: "1799" }, right: { en: "Napoleon takes power", es: "Napoleón toma el poder", ko: "나폴레옹 집권" } },
    { left: { en: "1804", es: "1804", ko: "1804" }, right: { en: "Napoleon becomes Emperor", es: "Napoleón se corona Emperador", ko: "나폴레옹 황제 즉위" } },
  ];
  const [shuf] = useState(() => { const a = pairs.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
  const [selL, setSelL] = useState(null);
  const [selR, setSelR] = useState(null);
  const [matched, setMatched] = useState([]);
  const tryM = (side, idx) => {
    if (side === "left") { if (matched.includes(idx)) return; if (selR !== null) { if (idx === shuf[selR]) setMatched(p => [...p, idx]); setSelL(null); setSelR(null); } else setSelL(idx); }
    else { if (matched.includes(shuf[idx])) return; if (selL !== null) { if (selL === shuf[idx]) setMatched(p => [...p, shuf[idx]]); setSelL(null); setSelR(null); } else setSelR(idx); }
  };
  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>{d.lang === "en" ? "Match the dates with events:" : d.lang === "es" ? "Empareja las fechas con los eventos:" : "날짜와 사건을 매칭하세요:"}</h3>
      <p style={{ textAlign: "center", fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{d.matchHint}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 440, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pairs.map((p, i) => { const m = matched.includes(i); return <button key={i} className="ac-match" onClick={() => tryM("left", i)} style={{ padding: 12, borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: "center", background: m ? C.greenSoft : selL === i ? C.accentSoft : C.bg, border: `1.5px solid ${m ? C.green + "44" : selL === i ? C.accent : C.border}`, color: m ? C.green : C.text, opacity: m ? .6 : 1, fontFamily: MONO }}>{p.left[d.lang]}</button>; })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {shuf.map((oi, di) => { const m = matched.includes(oi); return <button key={di} className="ac-match" onClick={() => tryM("right", di)} style={{ padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: "center", background: m ? C.greenSoft : selR === di ? C.accentSoft : C.bg, border: `1.5px solid ${m ? C.green + "44" : selR === di ? C.accent : C.border}`, color: m ? C.green : C.text, opacity: m ? .6 : 1, lineHeight: 1.3 }}>{pairs[oi].right[d.lang]}</button>; })}
        </div>
      </div>
      {matched.length === pairs.length && (
        <div style={{ textAlign: "center", marginTop: 16 }}><Feedback ok={true} d={{ ...d, correct: d.complete }} /></div>
      )}
    </div>
  );
};

const PollDemo = ({ d }) => {
  const q = { q: { en: "What was the most important cause of the French Revolution?", es: "¿Cuál fue la causa más importante de la Revolución Francesa?", ko: "프랑스 혁명의 가장 중요한 원인은?" } };
  const opts = [{ en: "Economic inequality", es: "Desigualdad económica", ko: "경제적 불평등" }, { en: "Weak monarchy", es: "Monarquía débil", ko: "약한 왕정" }, { en: "Enlightenment ideas", es: "Ideas de la Ilustración", ko: "계몽사상" }, { en: "Food shortages", es: "Escasez de alimentos", ko: "식량 부족" }];
  const fakeVotes = [42, 18, 28, 12]; const total = 100;
  const [voted, setVoted] = useState(null);
  return (
    <div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: C.yellowSoft, color: C.yellow, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
        <CIcon name="poll" size={12} inline /> {d.noRightAnswer}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, textAlign: "center", marginBottom: 20, lineHeight: 1.4 }}>{q.q[d.lang]}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
        {opts.map((o, i) => {
          const pct = Math.round((fakeVotes[i] / total) * 100);
          return (
            <button key={i} className="ac-poll" onClick={() => setVoted(i)} style={{ position: "relative", padding: "14px 16px", borderRadius: 10, background: C.bg, border: `1.5px solid ${voted === i ? OPT_C[i] : C.border}`, overflow: "hidden" }}>
              {voted !== null && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: OPT_C[i] + "14", transition: "width .5s ease" }} />}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: voted === i ? 600 : 500, color: voted === i ? OPT_C[i] : C.text }}>{o[d.lang]}</span>
                {voted !== null && <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: OPT_C[i] }}>{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      {voted !== null && <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.textMuted }}>{total} {d.votes}</p>}
    </div>
  );
};

const DEMOS = { mcq: MCQDemo, tf: TFDemo, fill: FillDemo, order: OrderDemo, match: MatchDemo, poll: PollDemo };

// ─── Main ───────────────────────────────────────────
export default function Activities({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [active, setActive] = useState(null);
  const [demoKey, setDemoKey] = useState(0);
  const d = { ...i18n[l], lang: l };
  const selectMode = (id) => { setActive(id); setDemoKey(k => k + 1); };
  const Demo = active ? DEMOS[active] : null;
  const am = MODES.find(m => m.id === active);

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={d.pageTitle} icon="matching" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 24 }}>{d.subtitle}</p>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
          {/* Mode list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MODES.map(m => (
              <button key={m.id} className="ac-mode" onClick={() => selectMode(m.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, width: "100%",
                background: active === m.id ? C.bg : "transparent",
                border: `1.5px solid ${active === m.id ? m.color + "44" : "transparent"}`,
                boxShadow: active === m.id ? `0 2px 8px ${m.color}11` : "none",
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: active === m.id ? m.color + "14" : C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CIcon name={m.icon} size={18} inline />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active === m.id ? m.color : C.text }}>{m.name[l]}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, lineHeight: 1.3 }}>{m.desc[l]}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Demo area */}
          <div style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, minHeight: 400, display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,.04)" }}>
            {!active ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted }}>
                <CIcon name="levelup" size={36} />
                <p style={{ fontSize: 15, marginTop: 12 }}>{d.selectMode}</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CIcon name={am.icon} size={20} inline />
                    <span style={{ fontSize: 15, fontWeight: 600, color: am.color }}>{am.name[l]}</span>
                  </div>
                  <button className="ac-btn ac-btn-secondary" onClick={() => setDemoKey(k => k + 1)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 4 }}>
                    <CIcon name="refresh" size={12} inline /> {d.reset}
                  </button>
                </div>
                <div style={{ padding: "6px 12px", borderRadius: 6, background: am.color + "0a", marginBottom: 16, fontSize: 12, color: am.color, display: "flex", alignItems: "center", gap: 6 }}>
                  <CIcon name="lightbulb" size={14} inline /> {d.bestFor}: {am.best[l]}
                </div>
                <div key={demoKey} className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Demo d={d} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
