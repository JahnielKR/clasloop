// src/hooks/useLiveSession.js
//
// F6: tiles realtime para una sesión específica. Mismo patrón
// supabase.channel + postgres_changes que SessionFlow.jsx (líneas 426+,
// 658+, 853+).
//
// Devuelve {participants, responses, isLive}. participants = array de
// session_participants rows; responses = array de responses rows. El
// componente arma counts en base a estos arrays.
//
// IMPORTANTE: cleanup correcto en el efecto. removeChannel en el return.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useLiveSession(sessionId) {
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setParticipants([]);
      setResponses([]);
      setIsLive(false);
      return undefined;
    }

    // Reset arrays synchronously al cambio de sessionId — sino los tiles
    // muestran brevemente datos de la sesión anterior mientras la nueva
    // snapshot resuelve.
    setParticipants([]);
    setResponses([]);

    let cancelled = false;
    // Initial snapshot
    (async () => {
      const [{ data: ps }, { data: rs }] = await Promise.all([
        supabase
          .from("session_participants")
          .select("id, student_name, joined_at, completed_at, is_kicked")
          .eq("session_id", sessionId),
        supabase
          .from("responses")
          .select("id, participant_id, question_index, is_correct, points, max_points, created_at")
          .eq("session_id", sessionId),
      ]);
      if (cancelled) return;
      setParticipants(ps || []);
      setResponses(rs || []);
    })();

    const channel = supabase
      .channel(`live-tiles:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        (payload) => setParticipants((prev) => {
          if (prev.some((p) => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        (payload) => setParticipants((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p))),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` },
        (payload) => setResponses((prev) => [...prev, payload.new]),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsLive(true);
        if (status === "CLOSED") setIsLive(false);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [sessionId]);

  return { participants, responses, isLive };
}
