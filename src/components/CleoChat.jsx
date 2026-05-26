// ─── CleoChat ────────────────────────────────────────────────────────────────
// In-app help bot: a floating Cleo button (bottom-right) that opens a small chat
// panel where logged-in teachers ask how Clasloop works / where things are. The
// same mascot from onboarding + the landing guide. Talks to /api/cleo-chat
// (Gemini Flash, grounded server-side). Conversation lives only in local state —
// nothing is persisted.
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Cleo from "./Cleo";
import { C } from "./tokens";
import { CIcon } from "./Icons";
import { useT } from "../i18n";
import { supabase } from "../lib/supabase";
import { useTourActive } from "../onboarding/TourContext";
import { detectTourIntent } from "../onboarding/chatTourIntent";
import { resolveTourRoute } from "../onboarding/tourRoutes";
import { useUserIdle } from "../hooks/useUserIdle";
import { IDLE_TIMING } from "./Cleo/motion/idle";
import { pathToPage } from "../routes";
import { executeCleoAction } from "../lib/cleo-actions";
import { SUPPORTED_FILES } from "../lib/ai";
import CleoActionCard from "./CleoActionCard";

// Light page/entity context sent with each message so Cleo can tailor help and
// resolve "this class". We parse the current URL here (CleoChat is mounted at
// the app root, outside any param'd route, so useParams would be empty).
function readContext(pathname) {
  const ctx = {};
  const page = pathToPage(pathname);
  if (page) ctx.page = page;
  const cls = pathname.match(/^\/classes\/([^/]+)/);
  if (cls) ctx.classId = cls[1];
  return ctx;
}

const css = `
  @keyframes clc-pop  { from { opacity:0; transform:translateY(12px) scale(.96) } to { opacity:1; transform:none } }
  @keyframes clc-bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-3px) } }
  @keyframes clc-dot  { 0%,80%,100% { opacity:.3; transform:translateY(0) } 40% { opacity:1; transform:translateY(-3px) } }
  @keyframes clc-fab-in { from { opacity:0; transform:translateY(16px) scale(.8) } to { opacity:1; transform:translateY(0) scale(1) } }
  .clc-panel { animation: clc-pop .26s cubic-bezier(.16,1,.3,1) both; }
  /* The FAB glides up into the corner when it (re)appears — e.g. when a tour
     ends and Cleo "returns home". No fill-mode so the hover transform still works. */
  .clc-fab   { animation: clc-fab-in .4s cubic-bezier(.16,1,.3,1); transition: transform .15s, filter .15s; filter: drop-shadow(0 5px 8px rgba(20,66,94,0.28)); }
  .clc-fab:hover { transform: translateY(-2px); filter: drop-shadow(0 9px 14px rgba(20,66,94,0.34)); }
  /* The drop-shadow lives on the (static) button, NOT on the bobbing element: a
     filter on a transform-animated element forces the browser to rasterize it
     and move that bitmap to sub-pixel positions, which softens her edges as she
     floats. will-change keeps the continuous bob on a clean, high-quality layer. */
  .clc-fab-cleo { animation: clc-bob 3.2s ease-in-out infinite; will-change: transform; }
  /* While Cleo is asleep, stop the bob so she rests still (the Z's carry it). */
  .clc-fab-cleo--asleep { animation: none; will-change: auto; }
  .clc-dot { width:6px; height:6px; border-radius:50%; background:${C.textMuted}; display:inline-block; animation: clc-dot 1.2s infinite; }
  .clc-send:disabled { opacity:.5; cursor:default; }
  @media (max-width: 640px) {
    .clc-panel { width: calc(100vw - 20px) !important; height: calc(100dvh - 90px) !important; right: 10px !important; bottom: 80px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .clc-panel, .clc-fab-cleo { animation: none !important; }
    .clc-fab { animation: none !important; transition: none !important; }
    .clc-dot { animation: none !important; opacity:.6 !important; }
  }
`;

export default function CleoChat({ lang = "en", profile = null }) {
  const t = useT("cleoChat", lang);
  // Hide this FAB while a guided tour is on screen — there's only one Cleo, and
  // she's "out" giving the tour. She glides back into this corner when it ends.
  const tourActive = useTourActive();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "model", text: t.greeting, ui: true }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // A document the teacher attached for Cleo to build a deck from. Stays
  // client-side: only a filename note is sent to the chat API; the File itself
  // is handed to the create_deck executor on confirm.
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-picking the same file
    if (!f) return;
    if (f.size > SUPPORTED_FILES.maxSizeMB * 1024 * 1024) {
      setFileError((t.action?.fileTooBig || "That file is too big (max {mb} MB).").replace("{mb}", SUPPORTED_FILES.maxSizeMB));
      return;
    }
    setFileError("");
    setAttachedFile(f);
  };

  // Idle easter-eggs for the always-visible FAB: after a stretch of inactivity
  // Cleo plays with her bow, then dozes off (waking on the next activity). Off
  // while the panel is open (she's "working") or a tour is on (the FAB is hidden).
  const idleStage = useUserIdle({ enabled: !open && !tourActive, t1: IDLE_TIMING.playful, t2: IDLE_TIMING.asleep });

  // Keep the greeting localized if the language changes before first use.
  useEffect(() => {
    setMessages((m) => (m.length === 1 && m[0].ui ? [{ role: "model", text: t.greeting, ui: true }] : m));
  }, [t.greeting]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    const sentFile = attachedFile; // snapshot: the file as it was at send time
    if ((!text && !sentFile) || loading) return;

    // Tour request? Launch the matching guided tour instead of asking the AI.
    // Only on a plain text ask (a file attached means they want a deck, not a tour).
    if (text && !sentFile) {
      const tourId = detectTourIntent(text);
      if (tourId) {
        const url = resolveTourRoute(tourId);
        if (url) {
          setMessages((m) => [...m, { role: "user", text }, { role: "model", text: t.tourLaunch }]);
          setInput("");
          setOpen(false);
          navigate(url);
          return;
        }
      }
    }

    // The bubble shows the typed text + a file chip; the payload's last user
    // message also carries a note so Cleo knows a document is attached.
    const next = [...messages, { role: "user", text, fileName: sentFile?.name || null }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("no_session");
      const payload = next.filter((m) => !m.ui).map((m) => ({ role: m.role, text: m.text }));
      if (sentFile && payload.length) {
        const note = `\n\n[The teacher attached a document: "${sentFile.name}". If they want a deck/quiz, build it from this document (use create_deck with source="document").]`;
        const lastText = (text || `Make a deck from "${sentFile.name}".`) + note;
        payload[payload.length - 1] = { role: "user", text: lastText };
      }
      const resp = await fetch("/api/cleo-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: payload, lang, context: readContext(location.pathname) }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "request_failed");
      const reply = (data.reply || "").trim();
      const action = data.action || null;

      if (action && action.confirm === false) {
        // Read-only movement (navigate) — run it immediately, like a tour.
        if (reply) setMessages((m) => [...m, { role: "model", text: reply }]);
        await executeCleoAction(action, { navigate, profile, lang });
        setOpen(false);
      } else if (action) {
        // A write — show Cleo's sentence + a confirmation card under it. For
        // create_deck, freeze the attached file onto the message so the card
        // generates from exactly what was attached, then clear the composer.
        const msg = { role: "model", text: reply || t.action.confirmPrompt, action };
        if (action.type === "create_deck") {
          msg.file = sentFile;
          setAttachedFile(null);
        }
        setMessages((m) => [...m, msg]);
      } else {
        setMessages((m) => [...m, { role: "model", text: reply || t.blocked }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "model", text: t.error }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <style>{css}</style>

      {!open && !tourActive && (
        <button
          className="clc-fab"
          onClick={() => setOpen(true)}
          aria-label={t.openAria}
          style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 45,
            width: 64, height: 64,
            background: "transparent", border: "none", boxShadow: "none",
            cursor: "pointer", display: "grid", placeItems: "center",
            padding: 0,
          }}
        >
          <span className={`clc-fab-cleo${idleStage === "asleep" ? " clc-fab-cleo--asleep" : ""}`} style={{ display: "block" }}>
            <Cleo size={56} idle="playful" idleStage={idleStage} />
          </span>
        </button>
      )}

      {open && (
        <div
          className="clc-panel"
          role="dialog"
          aria-label={t.title}
          style={{
            position: "fixed", bottom: 22, right: 22, zIndex: 45,
            width: 370, height: 520, maxHeight: "80vh",
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18,
            boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", borderBottom: `1px solid ${C.border}`, background: C.bgSoft,
          }}>
            <Cleo size={34} expression={loading ? "thinking" : "happy"} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.title}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted }}>{t.subtitle}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.close}
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "transparent", color: C.textMuted, border: "none",
                cursor: "pointer", fontSize: 20, lineHeight: 1,
                display: "grid", placeItems: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => {
              const mine = m.role === "user";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  {(m.text || !m.fileName) && (
                    <div style={{
                      maxWidth: "82%", padding: "9px 13px", borderRadius: 14,
                      fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      background: mine ? C.accent : C.bgSoft,
                      color: mine ? "#fff" : C.text,
                      borderBottomRightRadius: mine ? 4 : 14,
                      borderBottomLeftRadius: mine ? 14 : 4,
                    }}>
                      {m.text}
                    </div>
                  )}
                  {m.fileName && (
                    <div style={{
                      marginTop: m.text ? 4 : 0, maxWidth: "82%",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", borderRadius: 10,
                      background: mine ? C.accent : C.bgSoft,
                      color: mine ? "#fff" : C.textMuted, fontSize: 12,
                    }}>
                      <span aria-hidden="true">📎</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.fileName}</span>
                    </div>
                  )}
                  {m.action && (
                    <CleoActionCard
                      action={m.action}
                      t={t.action}
                      onRun={(a) => executeCleoAction(a, { navigate, profile, lang, file: m.file })}
                      onNavigate={(to) => { setOpen(false); navigate(to); }}
                    />
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "11px 14px", borderRadius: 14, background: C.bgSoft, display: "inline-flex", gap: 4, alignItems: "center" }}>
                  <span className="clc-dot" style={{ animationDelay: "0s" }} />
                  <span className="clc-dot" style={{ animationDelay: ".15s" }} />
                  <span className="clc-dot" style={{ animationDelay: ".3s" }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {/* Attached document chip + any file error, above the input row */}
            {(attachedFile || fileError) && (
              <div style={{ padding: "10px 12px 0" }}>
                {attachedFile && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%",
                    padding: "6px 10px", borderRadius: 10,
                    background: C.accentSoft, border: `1px solid ${C.accent}33`,
                    color: C.text, fontSize: 12.5,
                  }}>
                    <span aria-hidden="true">📎</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 230 }}>{attachedFile.name}</span>
                    <button
                      onClick={() => { setAttachedFile(null); setFileError(""); }}
                      aria-label={t.action?.removeFile || "Remove file"}
                      style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
                    >×</button>
                  </div>
                )}
                {fileError && <p style={{ fontSize: 11.5, color: C.red, margin: "6px 0 0" }}>{fileError}</p>}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, padding: 12 }}>
              {/* Attach a document for Cleo to build a deck from */}
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_FILES.accept}
                onChange={pickFile}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label={t.action?.attach || "Attach a document"}
                title={t.action?.attach || "Attach a document"}
                style={{
                  flexShrink: 0, width: 42, borderRadius: 10,
                  background: attachedFile ? C.accentSoft : "transparent",
                  color: attachedFile ? C.accent : C.textMuted,
                  border: `1px solid ${C.border}`,
                  cursor: loading ? "default" : "pointer",
                  display: "grid", placeItems: "center", fontSize: 18,
                }}
              >📎</button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t.placeholder}
                maxLength={1000}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                  fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <button
                className="clc-send"
                onClick={send}
                disabled={(!input.trim() && !attachedFile) || loading}
                aria-label={t.send}
                style={{
                  flexShrink: 0, width: 42, borderRadius: 10,
                  background: C.accent, color: "#fff", border: "none",
                  cursor: "pointer", display: "grid", placeItems: "center",
                }}
              >
                <CIcon name="rocket" inline size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
