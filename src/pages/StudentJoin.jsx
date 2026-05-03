import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B", border: "#E8E8E4",
};
const MONO = "'JetBrains Mono', monospace";
const OPT_C = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];
const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

const i18n = {
  en: {
    joinSession: "Join Session", sessionPin: "Session PIN", yourName: "Your name",
    namePlaceholder: "Enter your name", join: "Join",
    notFound: "Session not found. Check the PIN.", youreIn: "You're in!",
    waitingFor: "Waiting for", toStart: "to start...", pin: "PIN",
    of: "of", correct: "Correct!", incorrect: "Incorrect",
    seeResults: "See results", next: "Next",
    sessionComplete: "Session Complete", greatJob: "Great job!",
    keepPracticing: "Keep practicing!", correctLabel: "correct", incorrectLabel: "incorrect",
    joinAnother: "Join another session", noQuestions: "No questions available",
    timeUp: "Time's up!",
  },
  es: {
    joinSession: "Unirse a Sesión", sessionPin: "PIN de Sesión", yourName: "Tu nombre",
    namePlaceholder: "Escribe tu nombre", join: "Unirse",
    notFound: "Sesión no encontrada. Verifica el PIN.", youreIn: "¡Estás dentro!",
    waitingFor: "Esperando que", toStart: "empiece...", pin: "PIN",
    of: "de", correct: "¡Correcto!", incorrect: "Incorrecto",
    seeResults: "Ver resultados", next: "Siguiente",
    sessionComplete: "Sesión Completa", greatJob: "¡Buen trabajo!",
    keepPracticing: "¡Sigue practicando!", correctLabel: "correctas", incorrectLabel: "incorrectas",
    joinAnother: "Unirse a otra sesión", noQuestions: "No hay preguntas",
    timeUp: "¡Tiempo!",
  },
  ko: {
    joinSession: "세션 참여", sessionPin: "세션 PIN", yourName: "이름",
    namePlaceholder: "이름을 입력하세요", join: "참여",
    notFound: "세션을 찾을 수 없습니다. PIN을 확인하세요.", youreIn: "참여 완료!",
    waitingFor: "", toStart: "시작 대기 중...", pin: "PIN",
    of: "/", correct: "정답!", incorrect: "오답",
    seeResults: "결과 보기", next: "다음",
    sessionComplete: "세션 완료", greatJob: "잘했어요!",
    keepPracticing: "계속 연습하세요!", correctLabel: "정답", incorrectLabel: "오답",
    joinAnother: "다른 세션 참여", noQuestions: "문제가 없습니다",
    timeUp: "시간 초과!",
  },
};

const css = `
  .sj-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sj-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .sj-btn:active { transform: translateY(0) scale(.97); }
  .sj-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .sj-option { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sj-option:hover { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .sj-option:active { transform: scale(.96); }
  .sj-input { transition: border-color .15s, box-shadow .15s; }
  .sj-input:hover { border-color: #2383E266 !important; }
  .sj-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes popIn { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
  @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .fade-up { animation: fadeUp .35s ease-out both; }
  .pop-in { animation: popIn .3s ease-out both; }
  .bounce { animation: bounce .5s ease; }
  .shake { animation: shake .4s ease; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "11px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };

export default function StudentJoin({ lang: pageLang = "en" }) {
  const [step, setStep] = useState("join");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [resultAnim, setResultAnim] = useState("");

  const l = pageLang || "en";
  const t = i18n[l] || i18n.en;

  // Listen for session status changes
  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel(`student-session:${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => { setSession(payload.new); if (payload.new.status === "active" && step === "waiting") setStep("quiz"); }
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.id, step]);

  // Timer
  useEffect(() => {
    if (step !== "quiz" || showResult || timeLeft <= 0) return;
    const tm = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(tm);
  }, [timeLeft, showResult, step]);

  useEffect(() => {
    if (timeLeft === 0 && !showResult && step === "quiz") handleSelect(-1);
  }, [timeLeft, showResult, step]);

  useEffect(() => {
    setTimeLeft(15); setSelected(null); setShowResult(false); setResultAnim("");
  }, [current]);

  const handleJoin = async () => {
    if (pin.length !== 6 || !name.trim()) return;
    setError("");
    const { data: sess, error: findErr } = await supabase.from("sessions").select("*").eq("pin", pin).in("status", ["lobby", "active"]).single();
    if (findErr || !sess) { setError(t.notFound); return; }
    const { data: part, error: joinErr } = await supabase.from("session_participants").insert({ session_id: sess.id, student_name: name.trim() }).select().single();
    if (joinErr) {
      if (joinErr.code === "23505") {
        const { data: existing } = await supabase.from("session_participants").select("*").eq("session_id", sess.id).eq("student_name", name.trim()).single();
        setParticipant(existing);
      } else { setError(joinErr.message); return; }
    } else { setParticipant(part); }
    setSession(sess);
    setStep(sess.status === "active" ? "quiz" : "waiting");
  };

  const handleSelect = async (idx) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    const questions = session.questions || [];
    const q = questions[current];
    const isCorrect = idx === q?.correct;
    setResultAnim(isCorrect ? "bounce" : "shake");
    setAnswers(prev => [...prev, idx]);
    if (participant) {
      await supabase.from("responses").insert({
        session_id: session.id, participant_id: participant.id,
        question_index: current, answer: idx,
        is_correct: isCorrect, time_taken_ms: (15 - timeLeft) * 1000,
      });
    }
  };

  const handleNext = () => {
    if (current + 1 >= (session?.questions || []).length) setStep("results");
    else setCurrent(c => c + 1);
  };

  // ── Join ──
  if (step === "join") return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", marginBottom: 12 }}><LogoMark size={48} /></div>
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 24, fontWeight: 700 }}>{t.joinSession}</h1>
        </div>
        <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, animationDelay: ".1s" }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <CIcon name="warning" size={14} inline /> {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.sessionPin}</label>
              <input className="sj-input" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                style={{ ...inp, textAlign: "center", fontSize: 32, fontFamily: MONO, fontWeight: 700, letterSpacing: ".15em", padding: 16 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.yourName}</label>
              <input className="sj-input" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} style={inp}
                onKeyDown={e => e.key === "Enter" && handleJoin()} />
            </div>
            <button className="sj-btn" onClick={handleJoin} disabled={pin.length !== 6 || !name.trim()} style={{
              width: "100%", padding: 14, borderRadius: 10, fontSize: 16, fontWeight: 600,
              background: pin.length === 6 && name.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
              color: "#fff", opacity: pin.length === 6 && name.trim() ? 1 : 0.4,
            }}>{t.join}</button>
          </div>
        </div>
      </div>
    </>
  );

  // ── Waiting ──
  if (step === "waiting") return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div className="fade-up">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 2s infinite" }}>
            <CIcon name="clock" size={30} inline />
          </div>
          <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{t.youreIn}</h2>
          <p style={{ color: C.textSecondary, fontSize: 15 }}>{t.waitingFor} <strong>{session.topic}</strong> {t.toStart}</p>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>{t.pin}: {session.pin}</p>
          <div style={{ marginTop: 24, display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s infinite ${i * .2}s` }} />)}
          </div>
        </div>
      </div>
    </>
  );

  // ── Quiz ──
  if (step === "quiz") {
    const questions = session?.questions || [];
    const q = questions[current];
    if (!q) return <><style>{css}</style><p style={{ textAlign: "center", padding: 40, color: C.textMuted }}>{t.noQuestions}</p></>;
    const isLast = current === questions.length - 1;
    const isCorrect = selected === q.correct;
    const pct = timeLeft > 0 ? (timeLeft / 15) * 100 : 0;
    const timerCol = pct > 50 ? C.green : pct > 25 ? C.orange : C.red;

    return (
      <>
        <style>{css}</style>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>
              {current + 1} {t.of} {questions.length}
            </span>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: `conic-gradient(${timerCol} ${pct}%, ${C.bgSoft} ${pct}%)`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: MONO, color: timerCol }}>{timeLeft}</div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ width: "100%", height: 4, background: C.bgSoft, borderRadius: 4, marginBottom: 28 }}>
            <div style={{ width: `${((current + 1) / questions.length) * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, transition: "width .4s ease" }} />
          </div>

          {/* Question */}
          <div className="fade-up" key={current}>
            <h2 style={{ fontSize: 20, fontWeight: 600, textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>{q.q}</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {q.options.map((o, i) => {
                let bg = OPT_C[i], op = 1;
                if (showResult) { bg = i === q.correct ? C.green : i === selected ? C.red : "#ccc"; op = i === q.correct || i === selected ? 1 : .3; }
                return (
                  <button key={i} className="sj-option" onClick={() => handleSelect(i)} disabled={showResult} style={{
                    padding: "18px 14px", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff",
                    background: bg, opacity: op, lineHeight: 1.3, minHeight: 64,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: showResult ? "default" : "pointer",
                  }}>{o}</button>
                );
              })}
            </div>

            {showResult && (
              <div className={`pop-in ${resultAnim}`} style={{ textAlign: "center", marginTop: 24 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
                  background: isCorrect ? C.greenSoft : C.redSoft,
                  color: isCorrect ? C.green : C.red, fontSize: 15, fontWeight: 600, marginBottom: 16,
                }}>
                  <CIcon name={isCorrect ? "check" : "cross"} size={16} inline />
                  {isCorrect ? t.correct : t.incorrect}
                </div>
                <br />
                <button className="sj-btn" onClick={handleNext} style={{
                  padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  {isLast ? t.seeResults : t.next}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Results ──
  if (step === "results") {
    const questions = session?.questions || [];
    const correct = answers.filter((a, i) => a === questions[i]?.correct).length;
    const pct = Math.round((correct / questions.length) * 100);

    return (
      <>
        <style>{css}</style>
        <div style={{ maxWidth: 400, margin: "0 auto", padding: "50px 20px", textAlign: "center" }}>
          <div className="fade-up" style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div className="pop-in" style={{ width: 80, height: 80, borderRadius: "50%", background: retCol(pct) + "14", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: `3px solid ${retCol(pct)}33` }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: retCol(pct), fontFamily: MONO }}>{pct}%</span>
            </div>
            <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{t.sessionComplete}</h2>
            <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 20 }}>
              {pct >= 70 ? t.greatJob : t.keepPracticing}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 32, padding: "16px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.green, fontFamily: MONO }}>{correct}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{t.correctLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.red, fontFamily: MONO }}>{questions.length - correct}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{t.incorrectLabel}</div>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>
              {questions.map((q, i) => (
                <div key={i} style={{
                  width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: answers[i] === q.correct ? C.greenSoft : C.redSoft,
                  color: answers[i] === q.correct ? C.green : C.red,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</div>
              ))}
            </div>
          </div>

          <button className="sj-btn sj-btn-secondary" onClick={() => { setStep("join"); setPin(""); setName(""); setAnswers([]); setCurrent(0); setSession(null); }} style={{
            marginTop: 20, padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
          }}>{t.joinAnother}</button>
        </div>
      </>
    );
  }

  return null;
}
