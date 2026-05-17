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
import { processScanFrame, loadOpenCV } from "../lib/scanner-cv";

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
    searchPlaceholder: "Search your decks…",
    emptySearch: "No matches. Try a different search.",
    startBtn: "Start scanning",
    captureHelp: "Hold the sheet flat. Align the four corners inside the frame.",
    captureBtn: "Capture",
    backBtn: "Back",
    cancelBtn: "Cancel",
    permissionDenied: "Camera permission denied. Please allow camera access in your browser settings.",
    cameraError: "Couldn't open the camera. Try a different device or browser.",
    loadingScanner: "Loading scanner…",
    loadingScannerFirstTime: "Loading scanner…  First time may take 10–15 seconds.",
    processing: "Processing…",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetail: "Detail",
    nextSheetBtn: "Next sheet",
    finishBtn: "Finish",
    retryBtn: "Try again",
    errTitle: "Couldn't read this sheet",
    errNoFiducials: "I couldn't find the four corner marks of the answer sheet. Make sure the whole sheet is visible, well-lit, and flat.",
    errQrNotFound: "I couldn't read the QR code at the bottom. Make sure the sheet isn't cropped.",
    errWrongDeck: "This sheet belongs to a different deck. Pick the right deck and try again.",
    errOpenCvFailed: "Scanner failed to load. Check your internet connection and try again.",
    errNoQuestions: "This deck has no MCQ or T/F questions to scan.",
    errUnexpected: "Something went wrong. Try capturing the sheet again.",
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
    searchPlaceholder: "Buscá en tus decks…",
    emptySearch: "Sin resultados. Probá con otra búsqueda.",
    startBtn: "Empezar a escanear",
    captureHelp: "Mantené la hoja plana. Alineá las cuatro esquinas dentro del marco.",
    captureBtn: "Capturar",
    backBtn: "Volver",
    cancelBtn: "Cancelar",
    permissionDenied: "Permiso de cámara denegado. Habilitalo en la configuración del navegador.",
    cameraError: "No se pudo abrir la cámara. Probá con otro dispositivo o navegador.",
    loadingScanner: "Cargando escáner…",
    loadingScannerFirstTime: "Cargando escáner…  La primera vez puede tardar 10–15 segundos.",
    processing: "Procesando…",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetail: "Detalle",
    nextSheetBtn: "Siguiente hoja",
    finishBtn: "Terminar",
    retryBtn: "Intentar de nuevo",
    errTitle: "No pude leer esta hoja",
    errNoFiducials: "No encontré las cuatro marcas de las esquinas. Asegurate de que toda la hoja esté visible, bien iluminada y plana.",
    errQrNotFound: "No pude leer el QR de abajo. Asegurate de que la hoja no esté cortada.",
    errWrongDeck: "Esta hoja pertenece a otro deck. Elegí el deck correcto y probá de nuevo.",
    errOpenCvFailed: "El escáner no pudo cargar. Revisá la conexión a internet y probá de nuevo.",
    errNoQuestions: "Este deck no tiene preguntas MCQ ni V/F para escanear.",
    errUnexpected: "Algo falló. Probá capturando la hoja de nuevo.",
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
    searchPlaceholder: "덱 검색…",
    emptySearch: "결과 없음. 다른 검색어를 시도해보세요.",
    startBtn: "스캔 시작",
    captureHelp: "종이를 평평하게 두고 네 모서리를 프레임 안에 맞추세요.",
    captureBtn: "캡처",
    backBtn: "뒤로",
    cancelBtn: "취소",
    permissionDenied: "카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.",
    cameraError: "카메라를 열 수 없습니다. 다른 기기나 브라우저를 사용해보세요.",
    loadingScanner: "스캐너 로딩 중…",
    loadingScannerFirstTime: "스캐너 로딩 중…  처음에는 10-15초 정도 걸릴 수 있습니다.",
    processing: "처리 중…",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetail: "상세",
    nextSheetBtn: "다음 답안지",
    finishBtn: "완료",
    retryBtn: "다시 시도",
    errTitle: "답안지를 읽을 수 없습니다",
    errNoFiducials: "답안지의 네 모서리 표시를 찾을 수 없습니다. 종이 전체가 보이고 조명이 충분하며 평평한지 확인하세요.",
    errQrNotFound: "하단의 QR 코드를 읽을 수 없습니다. 종이가 잘리지 않았는지 확인하세요.",
    errWrongDeck: "이 답안지는 다른 덱에 속합니다. 올바른 덱을 선택하고 다시 시도하세요.",
    errOpenCvFailed: "스캐너 로딩 실패. 인터넷 연결을 확인하고 다시 시도하세요.",
    errNoQuestions: "이 덱에는 스캔할 MCQ나 T/F 문제가 없습니다.",
    errUnexpected: "오류가 발생했습니다. 답안지를 다시 캡처해보세요.",
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
        .select("id, title, language, created_at")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false });
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

    // PR 49.4: NO cargamos OpenCV acá. En iPhone (Safari/WebKit) la
    // carga de OpenCV.js (~8MB WASM) bloquea el main thread mientras
    // getUserMedia está activo, congelando la UI. Movido a handleCapture
    // donde se carga DESPUÉS de parar el stream.

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
      // Also clear video element srcObject to release the camera fully
      if (videoRef.current) {
        try { videoRef.current.srcObject = null; } catch {}
      }
    };
  }, [stage, t]);

  // Error from CV pipeline (shown to user in process/result stage).
  const [processError, setProcessError] = useState(null);
  // Sub-state del stage="process" para mostrar mensaje contextual.
  // null | "loadingOpenCV" | "processing"
  const [processSubState, setProcessSubState] = useState(null);

  const handleCapture = async () => {
    if (!videoRef.current || !streamRef.current) return;
    // Snapshot the current frame to a canvas
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // PR 49.4: Stop the camera + clear srcObject BEFORE loading OpenCV.
    // En iPhone (WebKit) la carga del WASM bloquea el main thread y si
    // getUserMedia sigue activo, congela todo. Liberar acá la GPU/cámara
    // y dejar paso libre al runtime.
    streamRef.current.getTracks().forEach(tk => tk.stop());
    streamRef.current = null;
    try { video.srcObject = null; } catch {}

    setStage("process");
    setProcessError(null);
    setProcessSubState("loadingOpenCV");

    try {
      // PR 49.4: Cargar OpenCV.js AHORA (no antes). En la primera
      // captura puede tardar 5-15s en cel. Después queda cacheado.
      await loadOpenCV();

      // Dar un tick al browser para que pinte el loader actualizado
      // antes de empezar el procesamiento pesado.
      setProcessSubState("processing");
      await new Promise(r => setTimeout(r, 50));

      const result = await processScanFrame(canvas, selectedDeck);

      if (!result.ok) {
        setProcessError({
          code: result.code,
          message: result.message,
        });
        setStage("processError");
        setProcessSubState(null);
        return;
      }

      setCurrentResult(result);
      setResults(prev => [...prev, result]);
      setStage("result");
      setProcessSubState(null);
    } catch (err) {
      console.error("[scanner] CV pipeline threw:", err);
      setProcessError({
        code: err?.message?.includes("OpenCV") ? "opencv_failed" : "unexpected",
        message: err?.message || "Unexpected error",
      });
      setStage("processError");
      setProcessSubState(null);
    }
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
          onPickDeck={(deckId) => {
            setSelectedDeckId(deckId);
            // load + advance: hacemos el fetch del deck completo (con
            // questions/answer key) antes de pasar a capture. Si falla
            // mostramos el error sin cambiar de stage.
            (async () => {
              const fullDeck = await loadDeckFull(deckId);
              if (!fullDeck) return;
              setSelectedDeck(fullDeck);
              setStage("capture");
            })();
          }}
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
        <ProcessStage t={t} subState={processSubState} />
      )}

      {stage === "processError" && processError && (
        <ProcessErrorStage
          t={t}
          error={processError}
          onRetry={() => {
            setProcessError(null);
            setStage("capture");
          }}
          onCancel={handleBackToStart}
        />
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

function PickDeckStage({ t, decks, onPickDeck }) {
  const [search, setSearch] = useState("");

  if (decks === null) {
    return <p style={{ color: C.textSecondary }}>{t.pickDeckLoading}</p>;
  }
  if (decks.length === 0) {
    return <p style={{ color: C.textSecondary }}>{t.pickDeckEmpty}</p>;
  }

  // Filter case-insensitive por título
  const q = search.trim().toLowerCase();
  const filtered = q
    ? decks.filter(d => (d.title || "").toLowerCase().includes(q))
    : decks;

  return (
    <div style={{ maxWidth: 540 }}>
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

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t.searchPlaceholder}
        autoFocus
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.bg,
          fontSize: 13.5,
          fontFamily: "inherit",
          color: C.text,
          marginBottom: 14,
          outline: "none",
          transition: "border-color .12s ease",
          boxSizing: "border-box",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
      />

      {/* Results list */}
      {filtered.length === 0 ? (
        <div style={{
          padding: "32px 16px",
          textAlign: "center",
          color: C.textMuted,
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          {t.emptySearch}
        </div>
      ) : (
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          maxHeight: "60vh", overflowY: "auto",
          // Padding right para que la scrollbar no pegue contra los cards
          paddingRight: 4,
        }}>
          {filtered.map(deck => (
            <button
              key={deck.id}
              onClick={() => onPickDeck(deck.id)}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "border-color .12s ease, background .12s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.bgSoft || C.bgAlt || C.bg;
                e.currentTarget.style.borderColor = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.bg;
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600, color: C.text,
                  lineHeight: 1.3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {deck.title || "Untitled"}
                </div>
                {deck.language && (
                  <div style={{
                    fontSize: 11, color: C.textMuted,
                    marginTop: 2,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}>
                    {deck.language}
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 18, color: C.textMuted, lineHeight: 1,
                marginLeft: 4,
              }}>›</div>
            </button>
          ))}
        </div>
      )}
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

function ProcessStage({ t, subState }) {
  const msg = subState === "loadingOpenCV"
    ? t.loadingScannerFirstTime
    : t.processing;
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{
        width: 50, height: 50, borderRadius: "50%",
        border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`,
        margin: "0 auto 20px",
        animation: "cl-scanner-spin 0.8s linear infinite",
      }} />
      <p style={{ color: C.textSecondary, fontSize: 14, margin: 0, lineHeight: 1.5 }}>{msg}</p>
      <style>{`@keyframes cl-scanner-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProcessErrorStage({ t, error, onRetry, onCancel }) {
  // Map error codes to user-friendly messages
  const msgByCode = {
    no_fiducials: t.errNoFiducials,
    qr_not_found: t.errQrNotFound,
    wrong_deck: t.errWrongDeck,
    opencv_failed: t.errOpenCvFailed,
    no_questions: t.errNoQuestions,
    unexpected: t.errUnexpected,
  };
  const userMsg = msgByCode[error.code] || t.errUnexpected;

  return (
    <div style={{
      maxWidth: 540, margin: "0 auto",
      padding: 24,
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 36, marginBottom: 12,
      }}>⚠</div>
      <h2 style={{
        fontSize: 18, fontWeight: 700, color: C.text, margin: 0, marginBottom: 8,
      }}>
        {t.errTitle}
      </h2>
      <p style={{
        fontSize: 14, color: C.textSecondary, margin: 0, marginBottom: 20,
        lineHeight: 1.5,
      }}>
        {userMsg}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={onCancel} style={btnSecondary}>{t.cancelBtn}</button>
        <button onClick={onRetry} style={btnPrimary}>{t.retryBtn}</button>
      </div>
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
