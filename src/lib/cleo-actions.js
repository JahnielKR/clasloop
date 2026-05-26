// ─── cleo-actions ────────────────────────────────────────────────────────
//
// Client-side executors for the actions Cleo proposes (Track B2). The server
// (api/cleo-chat.js) normalizes a model tool-call into a concrete action and
// sends it to CleoChat; this module runs it once the teacher confirms (or
// immediately, for read-only `navigate`).
//
// Why client-side: writes run under the teacher's OWN RLS — the same code
// paths the app already uses — instead of opening a service-key write surface.
// Each executor reuses existing logic (createClass, createUnit, the close-unit
// review-deck pipeline) and returns a plain { ok, ... } result, never throws.
//
// Result shape:
//   { ok: true,  navigated: true }                              // navigate
//   { ok: true,  result: { kind, id, name }, to: "/path" }      // a create
//   { ok: false, error: "code" }                                // failure
//
// `to` is a deep-link the card turns into a "view it" button.

import { supabase } from './supabase';
import { createClass } from './classes';
import { createUnit } from './units';
import { createDeck } from './decks';
import { generateQuestions } from './ai';
import { sectionToLessonContext } from './class-hierarchy';
import { getUnitRetentionSummary } from './spaced-repetition';
import { generateSuggestedReviewQuestions, saveReviewDeck } from './close-unit-ai';
import { ROUTES, buildRoute, buildPathWithOpts } from '../routes';

// Question types the editor renders — used to drop malformed AI output before
// saving (mirrors AIGeneratePanel's defensive clean for "mix" mode).
const VALID_Q_TYPES = new Set(['mcq', 'tf', 'fill', 'order', 'match', 'free', 'sentence', 'slider']);

// Pure: map a navigate action to a destination path. Exported for tests.
export function routeForNavigate(action) {
  const classId = action?.classId || null;
  switch (action?.target) {
    case 'new_deck':
      return buildPathWithOpts(ROUTES.DECKS_NEW, classId ? { focusClassId: classId } : null, 'decks');
    case 'class_decks':
      return buildPathWithOpts(ROUTES.DECKS, classId ? { focusClassId: classId } : null, 'decks');
    case 'class_detail':
      return classId ? buildRoute.classDetail(classId) : ROUTES.CLASSES;
    case 'class_insights':
      return classId ? buildRoute.classInsights(classId) : ROUTES.CLASSES;
    case 'class_report':
      return classId ? buildRoute.classReport(classId) : ROUTES.CLASSES;
    case 'classes':    return ROUTES.CLASSES;
    case 'sessions':   return ROUTES.SESSIONS;
    case 'scanner':    return ROUTES.SCAN;
    case 'review':     return ROUTES.REVIEW;
    case 'community':  return ROUTES.COMMUNITY;
    case 'settings':   return ROUTES.SETTINGS;
    default:           return null;
  }
}

// Execute a confirmed (or read-only) action.
//   deps = { navigate, profile, lang, file }
//   `file` is the document the teacher attached in the chat (only used by
//   create_deck with source 'document'); it never leaves the client.
export async function executeCleoAction(action, { navigate, profile, lang = 'en', file = null } = {}) {
  if (!action || typeof action !== 'object') return { ok: false, error: 'bad_action' };

  switch (action.type) {
    case 'navigate': {
      const to = routeForNavigate(action);
      if (!to) return { ok: false, error: 'unknown_target' };
      if (navigate) navigate(to);
      return { ok: true, navigated: true, to };
    }

    case 'create_class': {
      const { class: created, error } = await createClass({
        teacherId: profile?.id,
        name: action.name,
        subject: action.subject || 'General',
        grade: action.grade,
      });
      if (error || !created) return { ok: false, error: error || 'create_failed' };
      return {
        ok: true,
        result: { kind: 'class', id: created.id, name: created.name },
        to: buildRoute.classDetail(created.id),
      };
    }

    case 'create_unit': {
      const { unit, error } = await createUnit({ classId: action.classId, name: action.name });
      if (error || !unit) return { ok: false, error: error || 'create_failed' };
      return {
        ok: true,
        result: { kind: 'unit', id: unit.id, name: unit.name, classId: action.classId },
        to: buildRoute.classDetail(action.classId),
      };
    }

    case 'generate_review_deck': {
      // Needs the class row (subject/grade) + the unit's retention summary.
      const { data: classRow } = await supabase
        .from('classes')
        .select('id, name, subject, grade')
        .eq('id', action.classId)
        .maybeSingle();
      const classObj = classRow || { id: action.classId, name: action.className };

      const summary = await getUnitRetentionSummary(action.unitId);
      if (!summary) return { ok: false, error: 'no_summary' };
      if (!summary.decks || summary.decks.length === 0) return { ok: false, error: 'no_decks_in_unit' };

      const gen = await generateSuggestedReviewQuestions({
        unit: summary.unit,
        classObj,
        summary,
        lang,
      });
      if (!gen.ok) return { ok: false, error: gen.error || 'generation_failed' };

      const saved = await saveReviewDeck({
        unit: summary.unit,
        classObj,
        questions: gen.questions,
        lang: gen.inferredLang || lang,
        authorId: profile?.id,
      });
      if (!saved.ok) return { ok: false, error: saved.error || 'save_failed' };

      // Land in the Library focused on the deck's class tab (where a
      // general_review deck lives), not the editor — a cold deep-link to
      // /decks/:id/edit falls back to the list on the first tab, which felt
      // lost. ?class= now also selects that class's tab (see Decks.jsx).
      return {
        ok: true,
        result: { kind: 'review_deck', id: saved.deckId, name: summary.unit?.name || '' },
        to: buildPathWithOpts(ROUTES.DECKS, { focusClassId: action.classId }, 'decks'),
      };
    }

    case 'create_deck': {
      // Need the class row for subject/grade (drives generation + the saved deck).
      const { data: classRow } = await supabase
        .from('classes')
        .select('id, name, subject, grade')
        .eq('id', action.classId)
        .maybeSingle();
      const classObj = classRow || { id: action.classId, name: action.className };

      const useFile = action.source === 'document' ? file : null;
      // A 'document' action with no usable file and no topic can't generate.
      if (action.source === 'document' && !useFile && !action.topic) {
        return { ok: false, error: 'no_document' };
      }

      const language = action.language || lang || 'en';
      const lessonContext = sectionToLessonContext(action.section);
      const isPptx = !!useFile && /\.pptx$/i.test(useFile.name);
      // Image choice comes from the card's Yes/No toggle (action.images). "on"
      // reuses a PPTX's own images, else generates with AI; "off" = no images.
      // When unset (legacy/tests), fall back to "reuse PPTX images, else none".
      let imageSource;
      if (action.images === 'on') imageSource = isPptx ? 'document' : 'ai';
      else if (action.images === 'off') imageSource = 'none';
      else imageSource = isPptx ? 'document' : 'none';
      let gen;
      try {
        gen = await generateQuestions({
          topic: action.topic || (useFile ? useFile.name : ''),
          grade: classObj.grade,
          subject: classObj.subject,
          activityType: 'mix',
          numQuestions: action.numQuestions || 5,
          language,
          file: useFile,
          lessonContext,
          imageSource,
          imageMode: 'illustrate',
        });
      } catch (err) {
        return { ok: false, error: err?.code || err?.message || 'generation_failed' };
      }

      const raw = Array.isArray(gen) ? gen : (gen?.questions || []);
      const questions = raw.filter((q) => q && typeof q === 'object' && VALID_Q_TYPES.has(q.type));
      if (questions.length === 0) return { ok: false, error: 'no_questions' };

      const title =
        action.title ||
        action.topic ||
        (useFile ? useFile.name.replace(/\.[^.]+$/, '') : '') ||
        'New deck';

      const saved = await createDeck({
        teacherId: profile?.id,
        classId: action.classId,
        section: action.section,
        title,
        subject: classObj.subject,
        grade: classObj.grade,
        language,
        questions,
      });
      if (saved.error || !saved.deck) return { ok: false, error: saved.error || 'save_failed' };

      return {
        ok: true,
        result: { kind: 'deck', id: saved.deck.id, name: saved.deck.title, count: questions.length },
        to: buildPathWithOpts(ROUTES.DECKS, { focusClassId: action.classId }, 'decks'),
      };
    }

    case 'launch_session': {
      // Read-only: open the live-session launch screen for the deck. Never
      // auto-starts the session — the teacher presses go there.
      if (navigate && action.deckId) navigate(buildRoute.sessionsOptions(action.deckId));
      return { ok: true, navigated: true };
    }

    default:
      return { ok: false, error: 'unknown_action' };
  }
}
