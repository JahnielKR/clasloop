// src/pages/analytics/CleoAnalyst.jsx
//
// F5 Analytics Studio: vista chat "Analista Cleo" en /school/ask.
// El docente le pregunta cosas a Cleo sobre los datos de UNA clase;
// el endpoint /api/cleo-chat recibe context.analyticsClassId y agrega
// los KPIs + temas críticos + más falladas al system prompt server-side.
//
// UI: minimalista (no es CleoChat full). Header con selector de clase,
// hilo de mensajes, input de texto + send. Sin file upload, sin plan
// confirmation cards. i18n: useT("cleoAnalyst"); el chat usa el idioma de la UI.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { supabase } from "../../lib/supabase";
import { C } from "../../components/tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const ACCENT = C.purple;

export default function CleoAnalyst() {
  const lang = useLang();
  const t = useT("cleoAnalyst", lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClassId = searchParams.get("class") || null;

  const overviewQ = useAnalyticsOverview();
  const classes = overviewQ.data ?? [];
  const [classId, setClassId] = useState(initialClassId);
  const [messages, setMessages] = useState(() => [
    {
      role: "model",
      text: t.greeting,
      // ui: true marks this as a client-only greeting that must NOT be
      // sent to Gemini — its API rejects requests where the first turn
      // is role:"model". Mirrors the pattern in CleoChat.jsx.
      ui: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    if (initialClassId && !classId) setClassId(initialClassId);
  }, [initialClassId, classId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch("/api/cleo-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Filter out client-only ui messages (initial greeting). Gemini
          // requires the first turn to be role:"user"; including the
          // greeting causes every first send to fail with 502.
          messages: next
            .filter((m) => !m.ui)
            .map((m) => ({ role: m.role === "model" ? "model" : "user", text: m.text })),
          lang,
          context: { page: "analyticsAsk", analyticsClassId: classId || undefined },
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.reply) {
        setMessages((m) => [...m, { role: "model", text: data.reply }]);
      } else {
        setMessages((m) => [...m, { role: "model", text: t.errReply }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "model", text: t.errNetwork }]);
    } finally {
      setLoading(false);
    }
  }

  function handleClassChange(e) {
    const next = e.target.value || null;
    setClassId(next);
    if (next) setSearchParams({ class: next }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  return (
    <StudioShell view="ask" title={t.title}>
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t.classLabel}</span>
          <select
            value={classId || ""}
            onChange={handleClassChange}
            style={{ padding: "4px 8px", fontSize: 13, borderRadius: 6, border: `1px solid ${C.border}` }}
          >
            <option value="">{t.selectPlaceholder}</option>
            {classes.map((c) => (
              <option key={c.class_id} value={c.class_id}>{c.class_name || c.class_id}</option>
            ))}
          </select>
          {!classId && (
            <span style={{ fontSize: 12, color: C.textSecondary }}>
              {t.noClassHint}
            </span>
          )}
        </div>
        <div
          ref={threadRef}
          style={{
            flex: 1,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 12,
            overflowY: "auto",
            maxHeight: "60vh",
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? C.accent : C.purpleSoft,
                color: m.role === "user" ? "#fff" : C.text,
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "78%",
                fontSize: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.role === "model" && <b style={{ color: ACCENT }}>{t.cleoPrefix}</b>}
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", opacity: 0.55, fontSize: 13 }}>
              {t.thinking}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t.inputPlaceholder}
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 14,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              borderRadius: 8,
              border: "none",
              background: ACCENT,
              color: "#fff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}
          >
            {t.send}
          </button>
        </div>
      </div>
    </StudioShell>
  );
}
