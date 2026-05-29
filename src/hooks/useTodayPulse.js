// src/hooks/useTodayPulse.js
//
// F6 Analytics Studio: datos crudos de "hoy" para el Pulso de hoy strip
// y el Live Command Center. SELECT directo sobre sessions + responses
// + classes (RLS por teacher_id ya filtra al docente actual). Sin RPC
// nueva. Refetch cada 60s (overview infrequente — la vista live tiene
// su propio canal realtime para updates instantáneos).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const todayPulseKey = ["analytics", "todayPulse"];

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchTodayPulse() {
  const sinceIso = startOfTodayIso();

  // Sessions: las creadas hoy O las activas/lobby (que podrían venir de ayer
  // si el docente dejó una corriendo).
  const { data: sessions, error: sErr } = await supabase
    .from("sessions")
    .select("id, class_id, status, created_at, completed_at, topic, deck_id, teacher_id")
    .or(`created_at.gte.${sinceIso},status.in.(active,lobby)`);
  if (sErr) throw sErr;

  // Responses: creadas hoy. OJO: `responses` NO tiene `student_name` (esa
  // columna vive en session_participants) — pedirla daba 400. Traemos
  // `participant_id` y resolvemos el nombre abajo. Mismo patrón que useLiveSession.
  const { data: responses, error: rErr } = await supabase
    .from("responses")
    .select("session_id, participant_id, is_correct, points, max_points, created_at")
    .gte("created_at", sinceIso);
  if (rErr) throw rErr;

  // Classes del docente (también necesarias para los nombres de top_class).
  const { data: classes, error: cErr } = await supabase
    .from("classes")
    .select("id, name");
  if (cErr) throw cErr;

  // Resolver participant_id → student_name: pulse-of-today.ts agrupa el top
  // student por nombre. Solo los participantes referenciados por las respuestas
  // de hoy (lista acotada → un único .in()).
  const participantIds = [
    ...new Set((responses || []).map((r) => r.participant_id).filter(Boolean)),
  ];
  let nameByParticipant = new Map();
  if (participantIds.length > 0) {
    const { data: parts, error: pErr } = await supabase
      .from("session_participants")
      .select("id, student_name")
      .in("id", participantIds);
    if (pErr) throw pErr;
    nameByParticipant = new Map((parts || []).map((p) => [p.id, p.student_name]));
  }

  // Enriquecer responses con class_id (derivado de la sesión) + student_name
  // (derivado del participante). responses no trae ninguno de los dos directo.
  const sessionById = new Map((sessions || []).map((s) => [s.id, s]));
  const enriched = (responses || []).map((r) => {
    const s = sessionById.get(r.session_id);
    return {
      ...r,
      class_id: s?.class_id || null,
      student_name: nameByParticipant.get(r.participant_id) || null,
    };
  });

  return { sessions: sessions || [], responses: enriched, classes: classes || [] };
}

export function useTodayPulse() {
  return useQuery({
    queryKey: todayPulseKey,
    queryFn: fetchTodayPulse,
    refetchInterval: 60_000, // 1 min — pulso del día no necesita más
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
