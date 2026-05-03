import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, WaitingInline, CheckInline, XInline } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B", border: "#E8E8E4",
};
const MONO = "'JetBrains Mono', monospace";
const OPT_C = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];

const Btn = ({ children, v = "primary", onClick, disabled, style = {}, full }) => {
  const base = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? .4 : 1, pointerEvents: disabled ? "none" : "auto", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" };
  const vs = { primary: { background: C.accent, color: "#fff" }, secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
};

const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

export default function StudentJoin() {
  const [step, setStep] = useState("join"); // join | waiting | quiz | results
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

  const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "11px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };

  // Listen for session status changes (lobby → active)
  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel(`student-session:${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          setSession(payload.new);
          if (payload.new.status === "active" && step === "waiting") {
            setStep("quiz");
          }
        }
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.id, step]);

  // Timer
  useEffect(() => {
    if (step !== "quiz" || showResult || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, showResult, step]);

  useEffect(() => {
    if (timeLeft === 0 && !showResult && step === "quiz") handleSelect(-1);
  }, [timeLeft, showResult, step]);

  // Reset timer on new question
  useEffect(() => {
    setTimeLeft(15); setSelected(null); setShowResult(false);
  }, [current]);

  const handleJoin = async () => {
    if (pin.length !== 6 || !name.trim()) return;
    setError("");
    
    const { data: sess, error: findErr } = await supabase.from("sessions").select("*").eq("pin", pin).in("status", ["lobby", "active"]).single();
    if (findErr || !sess) { setError("Session not found. Check the PIN."); return; }

    const { data: part, error: joinErr } = await supabase.from("session_participants").insert({ session_id: sess.id, student_name: name.trim() }).select().single();
    if (joinErr) {
      if (joinErr.code === "23505") {
        const { data: existing } = await supabase.from("session_participants").select("*").eq("session_id", sess.id).eq("student_name", name.trim()).single();
        setParticipant(existing);
      } else { setError(joinErr.message); return; }
    } else {
      setParticipant(part);
    }

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

    setAnswers(prev => [...prev, idx]);

    // Save to database
    if (participant) {
      await supabase.from("responses").insert({
        session_id: session.id, participant_id: participant.id,
        question_index: current, answer: idx,
        is_correct: isCorrect, time_taken_ms: (15 - timeLeft) * 1000,
      });
    }
  };

  const handleNext = () => {
    const questions = session?.questions || [];
    if (current + 1 >= questions.length) {
      setStep("results");
    } else {
      setCurrent(c => c + 1);
    }
  };

  // ── Join Screen ──
  if (step === "join") return (
    <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ display: "inline-flex", marginBottom: 10 }}>
          <LogoMark size={44} />
        </div>
        <h1 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700 }}>Join Session</h1>
      </div>
      <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
        {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>Session PIN</label>
            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
              style={{ ...inp, textAlign: "center", fontSize: 28, fontFamily: MONO, fontWeight: 700, letterSpacing: ".15em", padding: 14 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>Your name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" style={inp}
              onKeyDown={e => e.key === "Enter" && handleJoin()} />
          </div>
          <Btn full onClick={handleJoin} disabled={pin.length !== 6 || !name.trim()}>Join</Btn>
        </div>
      </div>
    </div>
  );

  // ── Waiting Screen ──
  if (step === "waiting") return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 2s infinite" }}>
        <WaitingInline size={32}/>
      </div>
      <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 600, marginBottom: 6 }}>You're in!</h2>
      <p style={{ color: C.textSecondary, fontSize: 14 }}>Waiting for {session.topic} to start...</p>
      <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8 }}>PIN: {session.pin}</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  // ── Quiz Screen ──
  if (step === "quiz") {
    const questions = session?.questions || [];
    const q = questions[current];
    if (!q) return <p style={{ textAlign: "center", padding: 40, color: C.textMuted }}>No questions</p>;
    const isLast = current === questions.length - 1;
    const isCorrect = selected === q.correct;

    const pct = timeLeft > 0 ? (timeLeft / 15) * 100 : 0;
    const timerCol = pct > 50 ? C.green : pct > 25 ? C.orange : C.red;

    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: C.textSecondary }}>{current + 1} of {questions.length}</span>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `conic-gradient(${timerCol} ${pct}%, ${C.bgSoft} ${pct}%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: MONO, color: timerCol }}>{timeLeft}</div>
          </div>
        </div>

        <div style={{ width: "100%", height: 3, background: C.bgSoft, borderRadius: 3, marginBottom: 28 }}>
          <div style={{ width: `${((current + 1) / questions.length) * 100}%`, height: "100%", borderRadius: 3, background: C.accent, transition: "width .3s" }} />
        </div>

        <h2 style={{ fontSize: 19, fontWeight: 600, textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>{q.q}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {q.options.map((o, i) => {
            let bg = OPT_C[i], op = 1;
            if (showResult) { bg = i === q.correct ? C.green : i === selected ? C.red : "#ccc"; op = i === q.correct || i === selected ? 1 : .3; }
            return <button key={i} onClick={() => handleSelect(i)} disabled={showResult} style={{
              padding: "16px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff",
              background: bg, opacity: op, transition: "all .2s", lineHeight: 1.3, minHeight: 60,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: showResult ? "default" : "pointer", fontFamily: "'Outfit',sans-serif",
            }}>{o}</button>;
          })}
        </div>

        {showResult && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{
              display: "inline-block", padding: "8px 16px", borderRadius: 8,
              background: isCorrect ? C.greenSoft : C.redSoft,
              color: isCorrect ? C.green : C.red, fontSize: 14, fontWeight: 600, marginBottom: 14,
            }}>{isCorrect ? "Correct!" : "Incorrect"}</span>
            <br />
            <Btn onClick={handleNext}>{isLast ? "See results" : "Next →"}</Btn>
          </div>
        )}
      </div>
    );
  }

  // ── Results Screen ──
  if (step === "results") {
    const questions = session?.questions || [];
    const correct = answers.filter((a, i) => a === questions[i]?.correct).length;
    const pct = Math.round((correct / questions.length) * 100);

    return (
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: retCol(pct) + "14", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: retCol(pct), fontFamily: MONO }}>{pct}%</span>
          </div>
          <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Session Complete</h2>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16 }}>{pct >= 70 ? "Great job!" : "Keep practicing!"}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.green, fontFamily: MONO }}>{correct}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>correct</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.red, fontFamily: MONO }}>{questions.length - correct}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>incorrect</div>
            </div>
          </div>
        </div>
        <Btn v="secondary" onClick={() => { setStep("join"); setPin(""); setName(""); setAnswers([]); setCurrent(0); setSession(null); }} style={{ marginTop: 16 }}>Join another session</Btn>
      </div>
    );
  }

  return null;
}
