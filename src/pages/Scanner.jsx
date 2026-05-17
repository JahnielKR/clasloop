// ─────────────────────────────────────────────────────────────────────────────
// Scanner — escaneo de hojas de respuesta con ML Kit (PR 57).
//
// Reescritura completa del PR 49. Antes:
//   - OpenCV.js + jsQR en JS puro (~8MB)
//   - Pipeline frágil: adaptive threshold + blob detection + perspective
//   - Cámara web preview con marco guía manual
//
// Ahora:
//   - ML Kit nativo (DocumentScanner + BarcodeScanner)
//   - Detección de hoja + perspective correction automático por Google
//   - Solo escanea en native (web muestra banner "Descargá la app")
//
// Stages:
//   pickDeck       → selector de deck del profe
//   webFallback    → si no es native, banner con links de descarga
//   scanning       → loader mientras ML Kit + sampleBubbles corren
//   reviewUncertain → si hay burbujas dudosas (confidence < 0.3),
//                     mostrar zoom de cada una con tap para confirmar
//   result         → score + foto con overlay verde/rojo +
//                    detalle pregunta por pregunta
//                    Botones: Guardar y siguiente | Terminar
//   scanError      → error de scan (cancelado, no QR, etc)
//
// Save flow (al confirmar result):
//   1. Upload foto a Supabase storage bucket 'scan-images'
//   2. Insert row en tabla 'scans' con answers_json
//   3. Reset al stage scanning para la siguiente hoja
//
// Toda la lógica de ML Kit + sampling vive en src/lib/scanner-mlkit.js.
// Este archivo es solo UI + state machine.

import { useState, useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "../lib/supabase";
import { C } from "../components/tokens";
import {
  scanDocument,
  readQRFromImage,
  sampleBubbles,
  updateAnswer,
} from "../lib/scanner-mlkit";

// ─── i18n ───────────────────────────────────────────────────────────────────
const I18N = {
  en: {
    pageTitle: "Scanner",
    pageSubtitle: "Scan student answer sheets and see the score instantly.",
    // pickDeck
    pickDeckLabel: "Choose a deck",
    pickDeckHelp: "Pick the deck whose answer sheet you'll be scanning.",
    pickDeckLoading: "Loading your decks…",
    pickDeckEmpty: "You don't have any decks yet.",
    searchPlaceholder: "Search your decks…",
    emptySearch: "No matches. Try a different search.",
    startBtn: "Start scanning",
    questionsLabel: (n) => `${n} ${n === 1 ? "question" : "questions"}`,
    // webFallback
    webTitle: "Scanner runs on the app",
    webSubtitle: "Download the Clasloop app on your phone or tablet to scan answer sheets.",
    webAndroid: "Get it on Android",
    webIos: "Coming soon on iOS",
    // scanning
    scanningLabel: "Open camera…",
    samplingLabel: "Reading answers…",
    // reviewUncertain
    reviewTitle: "Quick review",
    reviewSubtitle: (n) => `I'm unsure about ${n} ${n === 1 ? "bubble" : "bubbles"}. Tap to confirm.`,
    reviewSkip: "Skip review",
    reviewDone: "Continue",
    questionLabel: (n) => `Question ${n}`,
    detectedAs: "Detected as",
    chooseAnswer: "Choose answer",
    noAnswer: "(blank)",
    // result
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetailLabel: "Per-question detail",
    saveAndNext: "Save and scan next",
    saveAndFinish: "Save and finish",
    finishNoSave: "Finish without saving",
    saving: "Saving…",
    // scanError
    errCancelled: "Scan cancelled.",
    errNoQR: "Could not read the QR code on this sheet.",
    errWrongDeck: "This sheet belongs to a different deck.",
    errNotNative: "Scanner only works on the mobile app.",
    errNoQuestions: "This deck has no MCQ or T/F questions to scan.",
    errUnsupported: "Document scanner isn't supported on this device. Try on a phone or tablet with Google Play Services.",
    errUnexpected: "Something went wrong. Try again.",
    retryBtn: "Try again",
    backBtn: "Back",
    cancelBtn: "Cancel",
    // Misc
    summary: (n) => `You scanned ${n} ${n === 1 ? "sheet" : "sheets"}.`,
    backToStart: "Back to start",
  },
  es: {
    pageTitle: "Escáner",
    pageSubtitle: "Escaneá las hojas de respuestas y mirá el puntaje al instante.",
    pickDeckLabel: "Elegí un deck",
    pickDeckHelp: "Seleccioná el deck cuya hoja vas a escanear.",
    pickDeckLoading: "Cargando tus decks…",
    pickDeckEmpty: "Todavía no tenés ningún deck.",
    searchPlaceholder: "Buscá en tus decks…",
    emptySearch: "Sin resultados. Probá con otra búsqueda.",
    startBtn: "Empezar a escanear",
    questionsLabel: (n) => `${n} ${n === 1 ? "pregunta" : "preguntas"}`,
    webTitle: "El escáner corre en la app",
    webSubtitle: "Descargá la app de Clasloop en tu celular o tablet para escanear hojas.",
    webAndroid: "Conseguilo en Android",
    webIos: "Pronto en iOS",
    scanningLabel: "Abriendo cámara…",
    samplingLabel: "Leyendo respuestas…",
    reviewTitle: "Revisión rápida",
    reviewSubtitle: (n) => `Tengo dudas con ${n} ${n === 1 ? "burbuja" : "burbujas"}. Tocá para confirmar.`,
    reviewSkip: "Saltear revisión",
    reviewDone: "Continuar",
    questionLabel: (n) => `Pregunta ${n}`,
    detectedAs: "Detecté",
    chooseAnswer: "Elegí respuesta",
    noAnswer: "(en blanco)",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetailLabel: "Detalle por pregunta",
    saveAndNext: "Guardar y escanear otra",
    saveAndFinish: "Guardar y terminar",
    finishNoSave: "Terminar sin guardar",
    saving: "Guardando…",
    errCancelled: "Escaneo cancelado.",
    errNoQR: "No pude leer el código QR de esta hoja.",
    errWrongDeck: "Esta hoja es de otro deck.",
    errNotNative: "El escáner solo funciona en la app móvil.",
    errNoQuestions: "Este deck no tiene preguntas MCQ ni V/F para escanear.",
    errUnsupported: "El escáner de documentos no es compatible con este dispositivo. Probá en un celular o tablet con Google Play Services.",
    errUnexpected: "Algo salió mal. Intentá de nuevo.",
    retryBtn: "Reintentar",
    backBtn: "Volver",
    cancelBtn: "Cancelar",
    summary: (n) => `Escaneaste ${n} ${n === 1 ? "hoja" : "hojas"}.`,
    backToStart: "Volver al inicio",
  },
  ko: {
    pageTitle: "스캐너",
    pageSubtitle: "답안지를 스캔하고 즉시 점수를 확인하세요.",
    pickDeckLabel: "덱 선택",
    pickDeckHelp: "스캔할 답안지의 덱을 선택하세요.",
    pickDeckLoading: "덱 불러오는 중…",
    pickDeckEmpty: "아직 덱이 없습니다.",
    searchPlaceholder: "덱 검색…",
    emptySearch: "결과 없음. 다른 검색어를 시도하세요.",
    startBtn: "스캔 시작",
    questionsLabel: (n) => `${n}문제`,
    webTitle: "스캐너는 앱에서 실행됩니다",
    webSubtitle: "답안지를 스캔하려면 폰이나 태블릿에 Clasloop 앱을 다운로드하세요.",
    webAndroid: "Android에서 받기",
    webIos: "iOS 출시 예정",
    scanningLabel: "카메라 여는 중…",
    samplingLabel: "답안 읽는 중…",
    reviewTitle: "빠른 검토",
    reviewSubtitle: (n) => `${n}개의 답안이 불확실합니다. 탭하여 확인하세요.`,
    reviewSkip: "건너뛰기",
    reviewDone: "계속",
    questionLabel: (n) => `문제 ${n}`,
    detectedAs: "감지됨",
    chooseAnswer: "답안 선택",
    noAnswer: "(비어있음)",
    resultScore: (n, total) => `${n} / ${total}`,
    resultDetailLabel: "문제별 상세",
    saveAndNext: "저장하고 다음",
    saveAndFinish: "저장하고 종료",
    finishNoSave: "저장하지 않고 종료",
    saving: "저장 중…",
    errCancelled: "스캔 취소됨.",
    errNoQR: "QR 코드를 읽을 수 없습니다.",
    errWrongDeck: "이 답안지는 다른 덱입니다.",
    errNotNative: "스캐너는 모바일 앱에서만 작동합니다.",
    errNoQuestions: "이 덱에는 스캔할 MCQ나 O/X 문제가 없습니다.",
    errUnsupported: "이 기기에서는 문서 스캐너가 지원되지 않습니다. Google Play 서비스가 설치된 폰이나 태블릿에서 시도하세요.",
    errUnexpected: "문제가 발생했습니다. 다시 시도하세요.",
    retryBtn: "다시 시도",
    backBtn: "뒤로",
    cancelBtn: "취소",
    summary: (n) => `${n}장을 스캔했습니다.`,
    backToStart: "처음으로",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Scanner({ lang = "en", profile, onOpenMobileMenu }) {
  const t = I18N[lang] || I18N.en;
  const isNative = Capacitor.isNativePlatform();

  // Stage machine
  const [stage, setStage] = useState(() => isNative ? "pickDeck" : "webFallback");

  // Decks loaded for the profile
  const [decks, setDecks] = useState(null); // null = loading, [] = empty
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Scan results history (for the "summary" at finish)
  const [scanCount, setScanCount] = useState(0);

  // Current scan data
  const [currentScan, setCurrentScan] = useState(null);
  //   = { imageUri, answers, score, total }
  const [scanError, setScanError] = useState(null);
  const [scanningSubState, setScanningSubState] = useState("scanning");
  //   = "scanning" | "sampling"
  const [saving, setSaving] = useState(false);

  // ─── Load decks for the teacher ────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from("decks")
        .select("id, title, language, created_at, questions")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[scanner] decks fetch failed:", error);
        setDecks([]);
        return;
      }
      // Filter to decks that have at least 1 MCQ or TF
      const eligible = (data || []).filter(d => {
        const qs = d.questions || [];
        return qs.some(q => q.type === "mcq" || q.type === "tf");
      });
      setDecks(eligible);
    })();
    return () => { cancelled = true; };
  }, [profile?.id, isNative]);

  // ─── Action: pick deck and start scanning ──────────────────────────────
  const handleStartScanning = async (deck) => {
    setSelectedDeck(deck);
    setStage("scanning");
    setScanningSubState("scanning");
    await runScan(deck);
  };

  // ─── Core: scan + sample ───────────────────────────────────────────────
  const runScan = async (deck) => {
    try {
      // 1. Open ML Kit document scanner
      setScanningSubState("scanning");
      const imageUri = await scanDocument();

      // 2. Validate QR matches the deck
      const scannedDeckId = await readQRFromImage(imageUri);
      if (scannedDeckId === null) {
        setScanError({ key: "errNoQR" });
        setStage("scanError");
        return;
      }
      if (scannedDeckId !== deck.id) {
        setScanError({ key: "errWrongDeck" });
        setStage("scanError");
        return;
      }

      // 3. Sample bubbles
      setScanningSubState("sampling");
      const result = await sampleBubbles(imageUri, deck);

      // 4. Decide next stage: review uncertain if any, else result
      const uncertain = result.answers.filter(a => a.is_uncertain);
      setCurrentScan({
        imageUri,
        answers: result.answers,
        score: result.score,
        total: result.total,
      });

      if (uncertain.length > 0) {
        setStage("reviewUncertain");
      } else {
        setStage("result");
      }
    } catch (err) {
      console.error("[scanner] scan error:", err);
      // Detect known error types
      const msg = String(err?.message || err);
      let errKey = "errUnexpected";
      if (msg.toLowerCase().includes("cancel")) errKey = "errCancelled";
      else if (msg.toLowerCase().includes("unsupported")) errKey = "errUnsupported";
      else if (msg.includes("Too many scannable")) errKey = "errNoQuestions";
      setScanError({ key: errKey, raw: msg });
      setStage("scanError");
    }
  };

  // ─── Action: user confirms an uncertain bubble ─────────────────────────
  const handleConfirmAnswer = (questionId, newMarked) => {
    if (!currentScan) return;
    const updated = updateAnswer(currentScan.answers, questionId, newMarked);
    setCurrentScan({
      ...currentScan,
      answers: updated.answers,
      score: updated.score,
    });
  };

  const handleFinishReview = () => setStage("result");

  // ─── Action: save scan to DB ───────────────────────────────────────────
  const handleSave = async ({ andContinue }) => {
    if (!currentScan || !selectedDeck) return;
    setSaving(true);
    try {
      // 1. Upload image to storage
      const scanId = crypto.randomUUID();
      const imagePath = `${profile.id}/${scanId}.jpg`;

      // Fetch the image as blob (the URI from ML Kit is a file:// URI)
      const url = currentScan.imageUri.startsWith("file://") || currentScan.imageUri.startsWith("/")
        ? Capacitor.convertFileSrc(currentScan.imageUri)
        : currentScan.imageUri;
      const imgRes = await fetch(url);
      const blob = await imgRes.blob();

      const { error: uploadErr } = await supabase.storage
        .from("scan-images")
        .upload(imagePath, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadErr) {
        console.error("[scanner] upload failed:", uploadErr);
        // Continue without image — better to save score than nothing
      }

      // 2. Insert row in scans table
      const { error: insertErr } = await supabase.from("scans").insert({
        id: scanId,
        teacher_id: profile.id,
        deck_id: selectedDeck.id,
        score: currentScan.score,
        total: currentScan.total,
        answers_json: currentScan.answers,
        image_path: uploadErr ? null : imagePath,
      });

      if (insertErr) {
        console.error("[scanner] insert failed:", insertErr);
        alert("Error saving scan. " + insertErr.message);
        setSaving(false);
        return;
      }

      setScanCount(n => n + 1);
      setCurrentScan(null);

      if (andContinue) {
        // Re-scan with same deck
        setStage("scanning");
        await runScan(selectedDeck);
      } else {
        // Finish — back to deck picker
        setStage("pickDeck");
        setSelectedDeck(null);
      }
    } catch (err) {
      console.error("[scanner] save error:", err);
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinishNoSave = () => {
    setCurrentScan(null);
    setStage("pickDeck");
    setSelectedDeck(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'Outfit',sans-serif",
          fontSize: 28, fontWeight: 600, margin: 0, marginBottom: 6,
          color: C.text,
        }}>
          {t.pageTitle}
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
          {t.pageSubtitle}
        </p>
        {scanCount > 0 && (
          <p style={{ fontSize: 13, color: C.accent, margin: "6px 0 0", fontWeight: 500 }}>
            {t.summary(scanCount)}
          </p>
        )}
      </div>

      {stage === "webFallback" && <WebFallbackStage t={t} />}

      {stage === "pickDeck" && (
        <PickDeckStage
          t={t}
          decks={decks}
          onPickDeck={handleStartScanning}
        />
      )}

      {stage === "scanning" && (
        <ScanningStage t={t} subState={scanningSubState} />
      )}

      {stage === "reviewUncertain" && currentScan && (
        <ReviewUncertainStage
          t={t}
          deck={selectedDeck}
          answers={currentScan.answers}
          onConfirm={handleConfirmAnswer}
          onDone={handleFinishReview}
        />
      )}

      {stage === "result" && currentScan && (
        <ResultStage
          t={t}
          deck={selectedDeck}
          imageUri={currentScan.imageUri}
          answers={currentScan.answers}
          score={currentScan.score}
          total={currentScan.total}
          saving={saving}
          onSaveAndNext={() => handleSave({ andContinue: true })}
          onSaveAndFinish={() => handleSave({ andContinue: false })}
          onFinishNoSave={handleFinishNoSave}
        />
      )}

      {stage === "scanError" && scanError && (
        <ScanErrorStage
          t={t}
          errorKey={scanError.key}
          rawMessage={scanError.raw}
          onRetry={() => {
            setScanError(null);
            if (selectedDeck) {
              setStage("scanning");
              runScan(selectedDeck);
            } else {
              setStage("pickDeck");
            }
          }}
          onBack={() => {
            setScanError(null);
            setStage("pickDeck");
            setSelectedDeck(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function WebFallbackStage({ t }) {
  return (
    <div style={{
      padding: 32, borderRadius: 16, background: C.bgSoft,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
      <h2 style={{
        fontFamily: "'Outfit',sans-serif",
        fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 8,
        color: C.text,
      }}>
        {t.webTitle}
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, margin: 0, marginBottom: 24, lineHeight: 1.5 }}>
        {t.webSubtitle}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <button
          disabled
          style={{
            padding: "12px 24px", borderRadius: 10,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 14, fontWeight: 600,
            background: C.border, color: C.textMuted,
            border: "none", cursor: "default",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>🤖</span>
          {t.webAndroid} — Coming soon
        </button>
        <button
          disabled
          style={{
            padding: "12px 24px", borderRadius: 10,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 14, fontWeight: 600,
            background: C.border, color: C.textMuted,
            border: "none", cursor: "default",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>🍎</span>
          {t.webIos}
        </button>
      </div>
    </div>
  );
}

function PickDeckStage({ t, decks, onPickDeck }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!decks) return null;
    const q = search.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter(d => (d.title || "").toLowerCase().includes(q));
  }, [decks, search]);

  if (decks === null) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: C.textMuted }}>
        {t.pickDeckLoading}
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: C.textMuted }}>
        {t.pickDeckEmpty}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontFamily: "'Outfit',sans-serif",
        fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 6,
        color: C.text,
      }}>
        {t.pickDeckLabel}
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 16 }}>
        {t.pickDeckHelp}
      </p>

      <input
        type="text"
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: "100%", padding: "12px 16px",
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 14,
          borderRadius: 10, border: `1px solid ${C.border}`,
          background: C.bg, color: C.text,
          boxSizing: "border-box", marginBottom: 14,
        }}
      />

      {filtered && filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
          {t.emptySearch}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(deck => {
            const qs = deck.questions || [];
            const scanCount = qs.filter(q => q.type === "mcq" || q.type === "tf").length;
            return (
              <button
                key={deck.id}
                onClick={() => onPickDeck(deck)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 10,
                  background: C.bg, border: `1px solid ${C.border}`,
                  cursor: "pointer", textAlign: "left",
                  fontFamily: "'DM Sans',sans-serif",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    {deck.title || "Untitled"}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {t.questionsLabel(scanCount)}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: C.accent }}>→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScanningStage({ t, subState }) {
  const label = subState === "sampling" ? t.samplingLabel : t.scanningLabel;
  return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{
        width: 48, height: 48,
        margin: "0 auto 20px",
        border: `4px solid ${C.bgSoft}`,
        borderTopColor: C.accent,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <div style={{ fontSize: 14, color: C.textMuted, fontFamily: "'DM Sans',sans-serif" }}>
        {label}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ReviewUncertainStage({ t, deck, answers, onConfirm, onDone }) {
  const uncertain = useMemo(
    () => answers.filter(a => a.is_uncertain),
    [answers]
  );

  // When user confirms one, it's no longer in `uncertain` (we re-derive
  // from `answers`), so this list auto-shrinks. When it hits 0, show
  // "all done" CTA.
  return (
    <div>
      <h2 style={{
        fontFamily: "'Outfit',sans-serif",
        fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 4,
        color: C.text,
      }}>
        {t.reviewTitle}
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20 }}>
        {t.reviewSubtitle(uncertain.length)}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {uncertain.map(ans => {
          const q = deck.questions.find(dq => dq.id === ans.question_id);
          const choices = q?.type === "tf" ? ["T", "F"] : ["A", "B", "C", "D"];
          return (
            <div
              key={ans.question_id}
              style={{
                padding: 16, borderRadius: 12,
                background: C.bgSoft, border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
                {t.questionLabel(ans.qNum)} · {t.detectedAs}: <strong>{ans.marked || t.noAnswer}</strong>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
                {t.chooseAnswer}:
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {choices.map(letter => (
                  <button
                    key={letter}
                    onClick={() => onConfirm(ans.question_id, letter)}
                    style={{
                      flex: "1 1 60px",
                      padding: "10px 12px", borderRadius: 8,
                      background: C.bg, border: `2px solid ${C.border}`,
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: 16, fontWeight: 600, color: C.text,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    {letter}
                  </button>
                ))}
                <button
                  onClick={() => onConfirm(ans.question_id, null)}
                  style={{
                    flex: "1 1 80px",
                    padding: "10px 12px", borderRadius: 8,
                    background: C.bg, border: `2px solid ${C.border}`,
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 13, color: C.textMuted,
                    cursor: "pointer",
                  }}
                >
                  {t.noAnswer}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onDone}
          style={{
            flex: 1, padding: 14, borderRadius: 10,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 15, fontWeight: 600,
            background: C.accent, color: "#fff",
            border: "none", cursor: "pointer",
          }}
        >
          {t.reviewDone}
        </button>
      </div>
    </div>
  );
}

function ResultStage({
  t, deck, imageUri, answers, score, total,
  saving, onSaveAndNext, onSaveAndFinish, onFinishNoSave,
}) {
  // Convert the file:// URI to a webview-displayable URL
  const imgSrc = useMemo(() => {
    if (!imageUri) return null;
    if (imageUri.startsWith("file://") || imageUri.startsWith("/")) {
      return Capacitor.convertFileSrc(imageUri);
    }
    return imageUri;
  }, [imageUri]);

  const isPerfect = score === total;
  const scoreColor = isPerfect ? "#22c55e" : score >= total * 0.7 ? "#fbbf24" : "#ef4444";

  return (
    <div>
      {/* Big score */}
      <div style={{
        padding: 24, borderRadius: 16,
        background: scoreColor + "12",
        border: `2px solid ${scoreColor}`,
        textAlign: "center", marginBottom: 20,
      }}>
        <div style={{
          fontFamily: "'Outfit',sans-serif",
          fontSize: 56, fontWeight: 700, color: scoreColor,
          lineHeight: 1, marginBottom: 4,
        }}>
          {t.resultScore(score, total)}
        </div>
        <div style={{ fontSize: 13, color: C.textMuted }}>
          {Math.round((score / total) * 100)}%
        </div>
      </div>

      {/* Scanned image preview */}
      {imgSrc && (
        <div style={{
          marginBottom: 20, borderRadius: 12, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          <img
            src={imgSrc}
            alt="Scanned answer sheet"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      )}

      {/* Per-question detail */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontFamily: "'Outfit',sans-serif",
          fontSize: 14, fontWeight: 600, color: C.textMuted,
          margin: 0, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1,
        }}>
          {t.resultDetailLabel}
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
          gap: 8,
        }}>
          {answers.map(ans => {
            const bg = ans.is_correct ? "#22c55e22" : (ans.marked === null ? "#94a3b822" : "#ef444422");
            const border = ans.is_correct ? "#22c55e" : (ans.marked === null ? "#94a3b8" : "#ef4444");
            const color = ans.is_correct ? "#16a34a" : (ans.marked === null ? "#64748b" : "#dc2626");
            return (
              <div
                key={ans.question_id}
                style={{
                  padding: "8px 6px", borderRadius: 8,
                  background: bg, border: `1.5px solid ${border}`,
                  textAlign: "center", fontFamily: "'DM Sans',sans-serif",
                }}
                title={`Correct: ${ans.correct || "?"}, Marked: ${ans.marked || "blank"}`}
              >
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>
                  {ans.qNum}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>
                  {ans.marked || "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={onSaveAndNext}
          disabled={saving}
          style={{
            padding: 14, borderRadius: 10,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 15, fontWeight: 600,
            background: saving ? C.bgSoft : C.accent,
            color: saving ? C.textMuted : "#fff",
            border: "none", cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? t.saving : t.saveAndNext}
        </button>
        <button
          onClick={onSaveAndFinish}
          disabled={saving}
          style={{
            padding: 12, borderRadius: 10,
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14, fontWeight: 500,
            background: "transparent", color: C.text,
            border: `1px solid ${C.border}`,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {t.saveAndFinish}
        </button>
        <button
          onClick={onFinishNoSave}
          disabled={saving}
          style={{
            padding: 10, borderRadius: 10,
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 13, fontWeight: 500,
            background: "transparent", color: C.textMuted,
            border: "none", cursor: saving ? "default" : "pointer",
          }}
        >
          {t.finishNoSave}
        </button>
      </div>
    </div>
  );
}

function ScanErrorStage({ t, errorKey, rawMessage, onRetry, onBack }) {
  const msg = t[errorKey] || t.errUnexpected;
  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <h2 style={{
        fontFamily: "'Outfit',sans-serif",
        fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 8,
        color: C.text,
      }}>
        {msg}
      </h2>
      {rawMessage && (
        <p style={{ fontSize: 11, color: C.textMuted, margin: "8px 0 24px", fontFamily: "monospace" }}>
          {rawMessage}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          onClick={onRetry}
          style={{
            padding: "12px 24px", borderRadius: 10,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 14, fontWeight: 600,
            background: C.accent, color: "#fff",
            border: "none", cursor: "pointer",
          }}
        >
          {t.retryBtn}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px", borderRadius: 10,
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14, fontWeight: 500,
            background: "transparent", color: C.text,
            border: `1px solid ${C.border}`,
            cursor: "pointer",
          }}
        >
          {t.backBtn}
        </button>
      </div>
    </div>
  );
}
