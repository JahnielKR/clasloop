// ─── CleoChat ────────────────────────────────────────────────────────────────
// In-app help bot: a floating Cleo button (bottom-right) that opens a small chat
// panel where logged-in teachers ask how Clasloop works / where things are. The
// same mascot from onboarding + the landing guide. Talks to /api/cleo-chat
// (Gemini Flash, grounded server-side). Conversation lives only in local state —
// nothing is persisted.
import { useState, useRef, useEffect } from "react";
import Cleo from "./Cleo";
import { C } from "./tokens";
import { CIcon } from "./Icons";
import { useT } from "../i18n";
import { supabase } from "../lib/supabase";
import { useTourActive } from "../onboarding/TourContext";

const css = `
  @keyframes clc-pop  { from { opacity:0; transform:translateY(12px) scale(.96) } to { opacity:1; transform:none } }
  @keyframes clc-bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-3px) } }
  @keyframes clc-dot  { 0%,80%,100% { opacity:.3; transform:translateY(0) } 40% { opacity:1; transform:translateY(-3px) } }
  @keyframes clc-fab-in { from { opacity:0; transform:translateY(16px) scale(.8) } to { opacity:1; transform:translateY(0) scale(1) } }
  .clc-panel { animation: clc-pop .26s cubic-bezier(.16,1,.3,1) both; }
  /* The FAB glides up into the corner when it (re)appears — e.g. when a tour
     ends and Cleo "returns home". No fill-mode so the hover transform still works. */
  .clc-fab   { animation: clc-fab-in .4s cubic-bezier(.16,1,.3,1); transition: transform .15s, box-shadow .15s; }
  .clc-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(35,131,226,0.34); }
  .clc-fab-cleo { animation: clc-bob 3.2s ease-in-out infinite; }
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

export default function CleoChat({ lang = "en" }) {
  const t = useT("cleoChat", lang);
  // Hide this FAB while a guided tour is on screen — there's only one Cleo, and
  // she's "out" giving the tour. She glides back into this corner when it ends.
  const tourActive = useTourActive();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "model", text: t.greeting, ui: true }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

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
    if (!text || loading) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("no_session");
      const payload = next.filter((m) => !m.ui).map((m) => ({ role: m.role, text: m.text }));
      const resp = await fetch("/api/cleo-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: payload, lang }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "request_failed");
      const reply = (data.reply || "").trim();
      setMessages((m) => [...m, { role: "model", text: reply || t.blocked }]);
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
            position: "fixed", bottom: 22, right: 22, zIndex: 45,
            width: 60, height: 60, borderRadius: "50%",
            background: C.bg, border: `1px solid ${C.border}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
            cursor: "pointer", display: "grid", placeItems: "center",
            padding: 0,
          }}
        >
          <span className="clc-fab-cleo" style={{ display: "block" }}><Cleo size={42} /></span>
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
                <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
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

          {/* Input */}
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.border}` }}>
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
              disabled={!input.trim() || loading}
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
      )}
    </>
  );
}
