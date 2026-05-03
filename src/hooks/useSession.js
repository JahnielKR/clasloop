import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Teacher: Create & Manage Sessions ──────────────
export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch session data
  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      setSession(data);
      setLoading(false);
    };

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      setParticipants(data || []);
    };

    const fetchResponses = async () => {
      const { data } = await supabase
        .from('responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      setResponses(data || []);
    };

    fetchSession();
    fetchParticipants();
    fetchResponses();

    // Real-time: listen for new participants
    const participantsSub = supabase
      .channel(`participants:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setParticipants(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Real-time: listen for new responses
    const responsesSub = supabase
      .channel(`responses:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setResponses(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Real-time: listen for session status changes
    const sessionSub = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsSub);
      supabase.removeChannel(responsesSub);
      supabase.removeChannel(sessionSub);
    };
  }, [sessionId]);

  return { session, participants, responses, loading };
}

// ─── Create a new session ───────────────────────────
export async function createSession({ classId, teacherId, topic, keyPoints, sessionType, activityType, questions }) {
  // Generate PIN
  const pin = String(Math.floor(100000 + Math.random() * 900000));

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      class_id: classId,
      teacher_id: teacherId,
      topic,
      key_points: keyPoints,
      session_type: sessionType,
      activity_type: activityType,
      pin,
      status: 'lobby',
      questions,
    })
    .select()
    .single();

  return { data, error };
}

// ─── Start session (move from lobby to active) ─────
export async function startSession(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'active' })
    .eq('id', sessionId)
    .select()
    .single();

  return { data, error };
}

// ─── End session ────────────────────────────────────
export async function endSession(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();

  return { data, error };
}

// ─── Student: Join session with PIN ─────────────────
export async function joinSession(pin, studentName) {
  // Find session by PIN
  const { data: session, error: findError } = await supabase
    .from('sessions')
    .select('*')
    .eq('pin', pin)
    .in('status', ['lobby', 'active'])
    .single();

  if (findError || !session) {
    return { error: 'Session not found. Check the PIN and try again.' };
  }

  // Add participant
  const { data: participant, error: joinError } = await supabase
    .from('session_participants')
    .insert({
      session_id: session.id,
      student_name: studentName,
    })
    .select()
    .single();

  if (joinError) {
    // Might already be joined
    if (joinError.code === '23505') {
      const { data: existing } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('student_name', studentName)
        .single();
      return { session, participant: existing };
    }
    return { error: joinError.message };
  }

  return { session, participant };
}

// ─── Student: Submit answer ─────────────────────────
export async function submitAnswer({ sessionId, participantId, questionIndex, answer, isCorrect, timeTakenMs }) {
  const { data, error } = await supabase
    .from('responses')
    .insert({
      session_id: sessionId,
      participant_id: participantId,
      question_index: questionIndex,
      answer,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
    })
    .select()
    .single();

  return { data, error };
}

// ─── Get session results ────────────────────────────
export async function getSessionResults(sessionId) {
  const { data: participants } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', sessionId);

  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', sessionId);

  // Calculate per-participant scores
  const results = (participants || []).map(p => {
    const pResponses = (responses || []).filter(r => r.participant_id === p.id);
    const correct = pResponses.filter(r => r.is_correct).length;
    const total = pResponses.length;
    return {
      ...p,
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      responses: pResponses,
    };
  });

  return results.sort((a, b) => b.correct - a.correct);
}

// ─── Teacher: Get all sessions for a class ──────────
export async function getClassSessions(classId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// ─── Teacher: Get class retention data ──────────────
export async function getClassRetention(classId) {
  const { data, error } = await supabase
    .from('topic_retention')
    .select('*')
    .eq('class_id', classId)
    .order('retention_score', { ascending: true });

  return { data, error };
}
