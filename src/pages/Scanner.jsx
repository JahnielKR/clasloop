// ─────────────────────────────────────────────────────────────────────────────
// Scanner — pantalla del profesor para escanear hojas de respuestas (PR 47)
// e identificar las respuestas marcadas por los estudiantes (PR 49 MVP).
//
// Flujo:
//   stage="pickDeck" → selector de deck (decks del profe activo)
//   stage="capture"  → cámara en vivo, marco guía, botón "Capturar"
//   stage="process"  → loader, corre OpenCV + jsQR
//   stage="result"   → score grande + detalle pregunta por pregunta
//                       (botón "Siguiente hoja" vuelve a stage="capture",
//                        "Terminar" cierra y vuelve al stage 1 con resumen)
//
// Lo que NO hace (PR 49 MVP):
//   - No guarda en DB (el profe ve resultado, anota en su lista física,
//     y pasa a la siguiente)
//   - No identifica al estudiante (el profe lo tiene en su planilla,
//     escanea las hojas en el orden que él va anotando)
//   - No batch (una hoja a la vez)
//   - No permite editar/crop la captura (si sale mal, vuelve a capturar)
//
// Solo profe puede acceder (PAGE_TO_ROUTE + TEACHER_ONLY_PAGES en routes.js).
// La carga de OpenCV.js (~8MB) y jsQR (~30KB) es lazy: empieza recién al
// entrar a stage="capture" y muestra un loader si todavía no terminó al
// momento de capturar.

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../components/tokens";

// ─── i18n ───────────────────────────────────────────────────────────────────
const I18N = {
  en: {
    pageTitle: "Scanner",
    pageSubtitle: "Scan student answer sheets and see the score instantly.",
    pickDeckLabel: "Choose a deck",
    pickDeckHelp: "Pick the deck whose answer sheet you'll be scanning.",
    pickDeckLoading: "Loading your decks…",
    pickDeckEmpty: "You don't have any decks yet.",
    pickDeckPlaceholder: "— select a deck —",
    startBtn: "Start scanning",
    captureHelp: "Hold the sheet flat. Align the four corners inside the frame.",
    captureBtn: "Capture",
    backBtn: "Back",
    cancelBtn: "Cancel",
    permissionDenied: "Camera permission denied. Please allow camera access in your browser settings.",
    cameraError: "Couldn't open the camera. Try a different device or browser.",
    loadingScanner: "Loading scanner…",
    processing: "Processing…",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetail: "Detail",
    nextSheetBtn: "Next sheet",
    finishBtn: "Finish",
    summary: (n) => `You scanned ${n} ${n === 1 ? "sheet" : "sheets"}.`,
    backToStart: "Back to start",
  },
  es: {
    pageTitle: "Escáner",
    pageSubtitle: "Escaneá las hojas de respuestas y mirá el puntaje al instante.",
    pickDeckLabel: "Elegí un deck",
    pickDeckHelp: "Seleccioná el deck cuya hoja de respuestas vas a escanear.",
    pickDeckLoading: "Cargando tus decks…",
    pickDeckEmpty: "Todavía no tenés ningún deck.",
    pickDeckPlaceholder: "— elegí un deck —",
    startBtn: "Empezar a escanear",
    captureHelp: "Mantené la hoja plana. Alineá las cuatro esquinas dentro del marco.",
    captureBtn: "Capturar",
    backBtn: "Volver",
    cancelBtn: "Cancelar",
    permissionDenied: "Permiso de cámara denegado. Habilitalo en la configuración del navegador.",
    cameraError: "No se pudo abrir la cámara. Probá con otro dispositivo o navegador.",
    loadingScanner: "Cargando escáner…",
    processing: "Procesando…",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetail: "Detalle",
    nextSheetBtn: "Siguiente hoja",
    finishBtn: "Terminar",
    summary: (n) => `Escaneaste ${n} ${n === 1 ? "hoja" : "hojas"}.`,
    backToStart: "Volver al inicio",
  },
  ko: {
    pageTitle: "스캐너",
    pageSubtitle: "답안지를 스캔하고 즉시 점수를 확인하세요.",
    pickDeckLabel: "덱 선택",
    pickDeckHelp: "스캔할 답안지의 덱을 선택하세요.",
    pickDeckLoading: "덱 로딩 중…",
    pickDeckEmpty: "아직 덱이 없습니다.",
    pickDeckPlaceholder: "— 덱 선택 —",
    startBtn: "스캔 시작",
    captureHelp: "종이를 평평하게 두고 네 모서리를 프레임 안에 맞추세요.",
    captureBtn: "캡처",
    backBtn: "뒤로",
    cancelBtn: "취소",
    permissionDenied: "카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.",
    cameraError: "카메라를 열 수 없습니다. 다른 기기나 브라우저를 사용해보세요.",
    loadingScanner: "스캐너 로딩 중…",
    processing: "처리 중…",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetail: "상세",
    nextSheetBtn: "다음 답안지",
    finishBtn: "완료",
    summary: (n) => `${n}장의 답안지를 스캔했습니다.`,
    backToStart: "처음으로",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Scanner({ lang = "en", profile, onOpenMobileMenu }) {
  const t = I18N[lang] || I18N.en;

  // Stage machine: pickDeck → capture → process → result → (next | finish)
  const [stage, setStage] = useState("pickDeck");

  // ─── Stage: pickDeck ──────────────────────────────────────────────────────
  const [decks, setDecks] = useState(null); // null = loading, [] = empty
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [selectedDeck, setSelectedDeck] = useState(null); // full deck with questions

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from("decks")
        .select("id, title, language, updated_at")
        .eq("teacher_id", profile.id)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[scanner] decks fetch failed:", error);
        setDecks([]);
        return;
      }
      setDecks(data || []);
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  // Load the full deck (with questions + answer key) when the user picks one.
  // This happens BEFORE entering capture stage so we have the answer key
  // ready to grade against later.
  const loadDeckFull = async (deckId) => {
    const { data, error } = await supabase
      .from("decks")
      .select("id, title, language, questions")
      .eq("id", deckId)
      .single();
    if (error || !data) {
      console.error("[scanner] full deck fetch failed:", error);
      return null;
    }
    return data;
  };

  const handleStartScanning = async () => {
    if (!selectedDeckId) return;
    const fullDeck = await loadDeckFull(selectedDeckId);
    if (!fullDeck) return;
    setSelectedDeck(fullDeck);
    setStage("capture");
  };

  // ─── Stage: capture ───────────────────────────────────────────────────────
  // Cam preview + capture button. CV pipeline NOT wired yet — capture
  // triggers a fake "process" stage that just times out and returns to
  // capture. (Will be wired in the next step of the PR.)

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState(null);

  // Sheets scanned so far (for the final summary). Each entry is a result
  // object from the CV pipeline.
  const [results, setResults] = useState([]);
  // The result of the most recent capture, shown in stage="result".
  const [currentResult, setCurrentResult] = useState(null);

  useEffect(() => {
    if (stage !== "capture") return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // back camera on phones
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(tk => tk.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamError(null);
      } catch (err) {
        console.error("[scanner] getUserMedia failed:", err);
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          setCamError(t.permissionDenied);
        } else {
          setCamError(t.cameraError);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(tk => tk.stop());
        streamRef.current = null;
      }
    };
  }, [stage, t]);

  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;
    // Snapshot the current frame to a canvas
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop the camera — we have our frame now.
    streamRef.current.getTracks().forEach(tk => tk.stop());
    streamRef.current = null;

    setStage("process");

    // TEMP (will be replaced by real CV pipeline):
    // Wait a beat then show a fake result so we can validate the UI flow
    // before wiring OpenCV.
    setTimeout(() => {
      const fakeResult = {
        score: 12,
        total: 15,
        answers: [
          { qNum: 1, marked: "A", correct: "A", isRight: true },
          { qNum: 2, marked: "B", correct: "B", isRight: true },
          { qNum: 3, marked: "C", correct: "A", isRight: false },
          { qNum: 4, marked: "D", correct: "D", isRight: true },
          { qNum: 5, marked: null, correct: "B", isRight: false },
        ],
      };
      setCurrentResult(fakeResult);
      setResults(prev => [...prev, fakeResult]);
      setStage("result");
    }, 1200);
  };

  // ─── Stage: result ────────────────────────────────────────────────────────
  const handleNextSheet = () => {
    setCurrentResult(null);
    setStage("capture");
  };

  const handleFinish = () => {
    setCurrentResult(null);
    setStage("summary");
  };

  // ─── Stage: summary ───────────────────────────────────────────────────────
  const handleBackToStart = () => {
    setResults([]);
    setCurrentResult(null);
    setSelectedDeck(null);
    setSelectedDeckId("");
    setStage("pickDeck");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px 32px 40px", maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0, marginBottom: 4 }}>
          {t.pageTitle}
        </h1>
        <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>
          {t.pageSubtitle}
        </p>
      </div>

      {stage === "pickDeck" && (
        <PickDeckStage
          t={t}
          decks={decks}
          selectedDeckId={selectedDeckId}
          setSelectedDeckId={setSelectedDeckId}
          onStart={handleStartScanning}
        />
      )}

      {stage === "capture" && (
        <CaptureStage
          t={t}
          videoRef={videoRef}
          camError={camError}
          onCapture={handleCapture}
          onCancel={() => setStage("pickDeck")}
        />
      )}

      {stage === "process" && (
        <ProcessStage t={t} />
      )}

      {stage === "result" && currentResult && (
        <ResultStage
          t={t}
          result={currentResult}
          onNext={handleNextSheet}
          onFinish={handleFinish}
        />
      )}

      {stage === "summary" && (
        <SummaryStage
          t={t}
          count={results.length}
          onBack={handleBackToStart}
        />
      )}
    </div>
  );
}

// ─── Sub-components per stage ───────────────────────────────────────────────

function PickDeckStage({ t, decks, selectedDeckId, setSelectedDeckId, onStart }) {
  if (decks === null) {
    return <p style={{ color: C.textSecondary }}>{t.pickDeckLoading}</p>;
  }
  if (decks.length === 0) {
    return <p style={{ color: C.textSecondary }}>{t.pickDeckEmpty}</p>;
  }
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 24, maxWidth: 540,
    }}>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.4,
        marginBottom: 6,
      }}>
        {t.pickDeckLabel}
      </label>
      <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 12px" }}>
        {t.pickDeckHelp}
      </p>
      <select
        value={selectedDeckId}
        onChange={e => setSelectedDeckId(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bg, color: C.text,
          fontSize: 14, fontFamily: "inherit",
          marginBottom: 16,
        }}
      >
        <option value="">{t.pickDeckPlaceholder}</option>
        {decks.map(d => (
          <option key={d.id} value={d.id}>{d.title || "Untitled"}</option>
        ))}
      </select>
      <button
        onClick={onStart}
        disabled={!selectedDeckId}
        style={{
          padding: "10px 16px", borderRadius: 8,
          border: "none",
          background: selectedDeckId ? C.accent : C.border,
          color: selectedDeckId ? "#fff" : C.textMuted,
          fontSize: 14, fontWeight: 600,
          cursor: selectedDeckId ? "pointer" : "not-allowed",
          fontFamily: "inherit",
        }}
      >
        {t.startBtn}
      </button>
    </div>
  );
}

function CaptureStage({ t, videoRef, camError, onCapture, onCancel }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>
        {t.captureHelp}
      </p>
      {camError ? (
        <div style={{
          padding: 20, borderRadius: 12,
          background: C.bgAlt, color: C.text, textAlign: "center",
        }}>
          <p style={{ margin: 0, marginBottom: 16 }}>{camError}</p>
          <button onClick={onCancel} style={btnSecondary}>{t.backBtn}</button>
        </div>
      ) : (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", maxHeight: "60vh" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", display: "block", maxHeight: "60vh", objectFit: "cover" }}
          />
          {/* Overlay guide frame */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              width: "80%", aspectRatio: "210 / 297",
              border: "2px dashed rgba(255,255,255,0.7)",
              borderRadius: 8,
            }} />
          </div>
        </div>
      )}
      {!camError && (
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center" }}>
          <button onClick={onCancel} style={btnSecondary}>{t.cancelBtn}</button>
          <button onClick={onCapture} style={btnPrimary}>{t.captureBtn}</button>
        </div>
      )}
    </div>
  );
}

function ProcessStage({ t }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{
        width: 50, height: 50, borderRadius: "50%",
        border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`,
        margin: "0 auto 20px",
        animation: "cl-scanner-spin 0.8s linear infinite",
      }} />
      <p style={{ color: C.textSecondary, fontSize: 14, margin: 0 }}>{t.processing}</p>
      <style>{`@keyframes cl-scanner-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultStage({ t, result, onNext, onFinish }) {
  const pct = Math.round((result.score / result.total) * 100);
  const scoreColor = pct >= 70 ? "#2EA043" : pct >= 50 ? "#D97706" : "#DC2626";
  return (
    <div>
      {/* Score grande */}
      <div style={{
        textAlign: "center", padding: "30px 20px",
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
          {t.resultScore(result.score, result.total)}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: C.textSecondary }}>
          {pct}%
        </div>
      </div>

      {/* Detalle por pregunta */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {t.resultDetail}
      </h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 8, marginBottom: 24,
      }}>
        {result.answers.map(a => (
          <div key={a.qNum} style={{
            padding: "8px 10px", borderRadius: 8,
            background: a.isRight ? "rgba(46,160,67,0.08)" : "rgba(220,38,38,0.08)",
            border: `1px solid ${a.isRight ? "rgba(46,160,67,0.3)" : "rgba(220,38,38,0.3)"}`,
            fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>
              #{a.qNum}
            </div>
            <div style={{ color: C.textSecondary }}>
              {a.marked ? `${a.marked}` : "—"}
              {!a.isRight && <span style={{ color: C.textMuted }}> · {a.correct}</span>}
              <span style={{ marginLeft: 4 }}>{a.isRight ? "✓" : "✗"}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={onFinish} style={btnSecondary}>{t.finishBtn}</button>
        <button onClick={onNext} style={btnPrimary}>{t.nextSheetBtn}</button>
      </div>
    </div>
  );
}

function SummaryStage({ t, count, onBack }) {
  return (
    <div style={{
      textAlign: "center", padding: "40px 20px",
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
    }}>
      <p style={{ fontSize: 18, color: C.text, marginBottom: 24 }}>
        {t.summary(count)}
      </p>
      <button onClick={onBack} style={btnPrimary}>{t.backToStart}</button>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────
const btnPrimary = {
  padding: "10px 20px", borderRadius: 8, border: "none",
  background: C.accent, color: "#fff", fontWeight: 600, fontSize: 14,
  cursor: "pointer", fontFamily: "inherit",
};
const btnSecondary = {
  padding: "10px 20px", borderRadius: 8,
  border: `1px solid ${C.border}`, background: "transparent",
  color: C.text, fontWeight: 600, fontSize: 14,
  cursor: "pointer", fontFamily: "inherit",
};
