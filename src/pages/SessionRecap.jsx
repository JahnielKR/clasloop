// ─── SessionRecap ──────────────────────────────────────────────────────
//
// Post-session recap screen for the teacher. Shown after they hit
// "End session" in SessionFlow. Displays:
//
//   1. Session header (deck title, section, meta)
//   2. SessionInsightBar (PR 13 — appears above the leaderboard when
//      the Edge Function finishes the weak-points analysis)
//   3. Leaderboard (all participants sorted by score)
//   4. Footer actions (back to sessions, see per-question details)
//
// URL: /sessions/:sessionId/recap
//
// We fetch session + deck + participants + responses on mount and
// compute the leaderboard in JS. No realtime — the data is frozen.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { C, MONO } from "../components/tokens";
import { ROUTES, buildRoute } from "../routes";
import PageHeader from "../components/PageHeader";
import SectionBadge from "../components/SectionBadge";
import SessionInsightBar from "../components/SessionInsightBar";

const i18n = {
  en: {
    pageTitle: "Session results",
    summary: "{n} students · {q} questions",
    avgLabel: "average",
    topPctLabel: "above 85%",
    leaderboardTitle: "Results",
    backToSessions: "Back to sessions",
    viewDetails: "Per-question details",
    loading: "Loading results…",
    notFound: "Session not found.",
    notAuthorized: "You don't own this session.",
  },
  es: {
    pageTitle: "Resultados de la sesión",
    summary: "{n} estudiantes · {q} preguntas",
    avgLabel: "promedio",
    topPctLabel: "sobre 85%",
    leaderboardTitle: "Resultados",
    backToSessions: "Volver a sesiones",
    viewDetails: "Detalles por pregunta",
    loading: "Cargando resultados…",
    notFound: "Sesión no encontrada.",
    notAuthorized: "No sos dueño de esta sesión.",
  },
  ko: {
    pageTitle: "세션 결과",
    summary: "{n}명 학생 · {q}문항",
    avgLabel: "평균",
    topPctLabel: "85% 이상",
    leaderboardTitle: "결과",
    backToSessions: "세션으로 돌아가기",
    viewDetails: "문항별 세부정보",
    loading: "결과 불러오는 중…",
    notFound: "세션을 찾을 수 없습니다.",
    notAuthorized: "이 세션의 소유자가 아닙니다.",
  },
};

export default function SessionRecap({ lang = "en", setLang, profile, onOpenMobileMenu }) {
  const t = i18n[lang] || i18n.en;
  const location = useLocation();
  const navigate = useNavigate();

  // Extract sessionId from URL (App.jsx doesn't register a react-router
  // Route for this path, so we parse the pathname manually — same trick
  // DeckResults uses).
  const sessionId = useMemo(() => {
    const m = location.pathname.match(/^\/sessions\/([^/]+)\/recap\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [deck, setDeck] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    if (!sessionId || !profile?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");

      // 1. Session
      const { data: sess, error: sessErr } = await supabase
        .from("sessions")
        .select("id, deck_id, topic, status, completed_at, created_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (sessErr || !sess) {
        setError(t.notFound);
        setLoading(false);
        return;
      }

      // 2. Deck (also tells us the class so we can verify ownership)
      const { data: dk } = await supabase
        .from("decks")
        .select("id, title, section, class_id, questions")
        .eq("id", sess.deck_id)
        .maybeSingle();
      if (cancelled) return;
      if (!dk) {
        setError(t.notFound);
        setLoading(false);
        return;
      }

      // 3. Verify teacher owns the class
      const { data: cls } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("id", dk.class_id)
        .maybeSingle();
      if (cancelled) return;
      if (!cls || cls.teacher_id !== profile.id) {
        setError(t.notAuthorized);
        setLoading(false);
        return;
      }

      // 4. Participants + responses
      const [partRes, respRes] = await Promise.all([
        supabase
          .from("session_participants")
          .select("id, student_name, student_id")
          .eq("session_id", sessionId),
        supabase
          .from("responses")
          .select("participant_id, question_index, is_correct, needs_review, teacher_grade, points, max_points")
          .eq("session_id", sessionId),
      ]);
      if (cancelled) return;

      setSession(sess);
      setDeck(dk);
      setParticipants(partRes.data || []);
      setResponses(respRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessionId, profile?.id, t.notFound, t.notAuthorized]);

  // ── Leaderboard computation ───────────────────────────────────────────
  // Score per participant = sum(points) / sum(max_points), as a percentage.
  // We use points/max_points (PR 4 era) so partial grades count proportionally.
  const leaderboard = useMemo(() => {
    if (!participants.length) return [];

    const rows = participants.map(p => {
      const pResponses = responses.filter(r => r.participant_id === p.id);
      const totalPoints = pResponses.reduce((sum, r) => sum + (r.points || 0), 0);
      const totalMax = pResponses.reduce((sum, r) => sum + (r.max_points || 0), 0);
      const score = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;
      return {
        id: p.id,
        name: p.student_name || "Student",
        score,
        answered: pResponses.length,
      };
    });

    // Sort by score desc, then by name as tiebreaker for stability
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [participants, responses]);

  const summary = useMemo(() => {
    if (!leaderboard.length) return null;
    const scores = leaderboard.map(r => r.score);
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const aboveTop = scores.filter(s => s >= 85).length;
    return { avg, aboveTop, total: scores.length };
  }, [leaderboard]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 40, textAlign: "center", color: C.textMuted }}>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
        <div style={{ marginTop: 40 }}>{t.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 20 }}>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
        <div style={{
          marginTop: 40, padding: 24, textAlign: "center",
          color: C.red, background: C.redSoft || "#FEE",
          border: `1px solid ${C.red}33`, borderRadius: 10,
        }}>
          {error}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => navigate(ROUTES.SESSIONS)}
            style={{
              padding: "10px 16px", borderRadius: 7,
              background: "#000", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 600,
              fontFamily: "'Outfit', sans-serif", cursor: "pointer",
            }}
          >
            {t.backToSessions}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 20 }}>
      <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />

      {/* Session header — title + section badge + meta */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 16,
        marginTop: 24,
        gap: 12,
        flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 22,
          fontWeight: 600,
          color: C.text,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          {deck?.title || session?.topic || ""}
          {deck?.section && <SectionBadge section={deck.section} lang={lang} />}
        </div>
        {summary && (
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: MONO }}>
            {t.summary.replace("{n}", leaderboard.length).replace("{q}", deck?.questions?.length || 0)}
          </div>
        )}
      </div>

      {/* Insight bar (PR 13). Renders nothing if status is empty/failed/dismissed. */}
      <SessionInsightBar sessionId={sessionId} lang={lang} />

      {/* Leaderboard */}
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 24,
        boxShadow: C.shadow,
      }}>
        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: C.text,
          }}>
            {t.leaderboardTitle}
          </div>
          {summary && (
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
              {t.avgLabel} {summary.avg}% · {summary.aboveTop}/{summary.total} {t.topPctLabel}
            </div>
          )}
        </div>

        {leaderboard.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            —
          </div>
        )}

        {leaderboard.map((row, idx) => (
          <LeaderboardRow key={row.id} rank={idx + 1} row={row} />
        ))}
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate(buildRoute.deckResults(deck.id))}
          style={{
            padding: "9px 14px",
            borderRadius: 7,
            background: C.bg,
            color: C.text,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {t.viewDetails}
        </button>
        <button
          onClick={() => navigate(ROUTES.SESSIONS)}
          style={{
            padding: "9px 16px",
            borderRadius: 7,
            background: "#000",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          {t.backToSessions}
        </button>
      </div>
    </div>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────────────

function LeaderboardRow({ rank, row }) {
  const isTop3 = rank <= 3;
  const lowTier = row.score < 60;
  const midTier = row.score >= 60 && row.score < 80;

  const fillColor = lowTier ? C.red : midTier ? C.orange : C.green;
  const scoreColor = lowTier ? C.red : midTier ? C.orange : C.text;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "32px 1fr 80px 50px",
      gap: 12,
      alignItems: "center",
      padding: "10px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Rank */}
      <div style={{
        fontFamily: MONO,
        fontSize: 13,
        fontWeight: 600,
        color: isTop3 ? C.accent : C.textMuted,
        textAlign: "center",
      }}>
        {rank}
      </div>

      {/* Name + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: C.accentSoft,
          color: C.accent,
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          flexShrink: 0,
        }}>
          {initials(row.name)}
        </div>
        <div style={{
          fontSize: 14,
          color: C.text,
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {row.name}
        </div>
      </div>

      {/* Score bar */}
      <div style={{
        height: 6,
        background: C.bgSoft,
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${Math.max(2, row.score)}%`,
          background: fillColor,
          borderRadius: 3,
          transition: "width .4s ease",
        }} />
      </div>

      {/* Score % */}
      <div style={{
        fontFamily: MONO,
        fontSize: 13,
        fontWeight: 600,
        color: scoreColor,
        textAlign: "right",
      }}>
        {row.score}%
      </div>
    </div>
  );
}

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
