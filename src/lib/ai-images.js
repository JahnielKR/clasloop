// ─── src/lib/ai-images.js — generate question images with AI ─────────────────
//
// Track A (A-img-3): when the teacher picks "Generate with AI" as the image
// source, the question generator tags questions with an `image_prompt` — a short
// description of the picture to create. This module turns each prompt into a
// real image: it calls /api/generate-image, uploads the returned picture to
// Storage with the existing deck-cover helper, and sets the question's
// `image_url` — the same field the editor, the live quiz and the PDF export
// already render.
//
// Cost + latency live here. A coverage setting decides how many of the tagged
// questions actually get an image (the model writes the prompts; we pick the
// count), capped at MAX_IMAGES and run in parallel. Each image is judged
// server-side; a selected question whose image is rejected or fails to generate
// is dropped entirely ("se va todo"). `image_prompt` is always stripped so it
// never leaks into saved deck data.

import { uploadDeckCover } from "./deck-image-upload";

const MAX_IMAGES = 20;

// "some" coverage target as a fraction of total questions (rounded up).
const SOME_FRACTION = 0.30;

/**
 * Render AI images for a coverage-selected subset of the questions the model
 * tagged with an `image_prompt`, judge each one (server-side), and set
 * `image_url`. `image_prompt` is stripped regardless.
 *
 * Coverage (how many of the tagged questions to render):
 *   "all"  → every tagged question        (capped at `max`)
 *   "some" → ceil(0.30 * total questions)  (capped, the default)
 *   "few"  → every tagged question         (the model already kept it sparse)
 * "about" mode always renders every tagged question (its image is load-bearing).
 *
 * "Se va todo": a selected question that ends up WITHOUT an approved image
 * (judge reject or generation failure) is dropped from the output entirely, so
 * every surviving selected question carries a correct, judge-approved image.
 *
 * Returns { questions, found, selected, generated, dropped }:
 *   found     = tagged questions, selected = how many we tried to render,
 *   generated = images that succeeded and passed the judge,
 *   dropped   = selected questions removed for lack of an approved image.
 */
export async function generateQuestionImages(
  questions,
  { accessToken, userId, max = MAX_IMAGES, coverage = "some", mode = "illustrate" } = {}
) {
  const stripped = stripAll(questions);
  const empty = { questions: stripped, found: 0, selected: 0, generated: 0, dropped: 0 };
  if (!Array.isArray(questions) || !accessToken || !userId) return empty;

  // Tagged question indices, in document order.
  const tagged = [];
  for (let i = 0; i < questions.length; i++) {
    if (promptOf(questions[i])) tagged.push(i);
  }
  const found = tagged.length;
  if (found === 0) return empty;

  // How many to render. "about" images are load-bearing → render all tagged.
  let target;
  if (mode === "about" || coverage === "all" || coverage === "few") {
    target = tagged.length;
  } else {
    target = Math.ceil(SOME_FRACTION * questions.length); // "some" (default)
  }
  target = Math.min(target, tagged.length, max);

  // Pick `target` tagged questions spread evenly across the exam (not the first
  // N), so images are distributed rather than clustered.
  const chosenIdx = pickSpread(tagged, target);
  const targets = chosenIdx.map((i) => ({
    i,
    prompt: promptOf(questions[i]),
    concept: conceptOf(questions[i]),
  }));

  // Generate + judge in parallel — each call is several seconds; sequential would
  // stack into a long wait. allSettled so one failure doesn't sink the batch.
  const results = await Promise.allSettled(
    targets.map((t) => generateOne(t.prompt, t.concept, accessToken, userId))
  );

  const urlByIndex = new Map();
  results.forEach((r, k) => {
    if (r.status === "fulfilled" && r.value) urlByIndex.set(targets[k].i, r.value);
  });

  const selectedSet = new Set(chosenIdx);
  const out = [];
  for (let i = 0; i < questions.length; i++) {
    const bare = strip(questions[i]);
    if (selectedSet.has(i)) {
      const url = urlByIndex.get(i);
      if (url) out.push({ ...bare, image_url: url });
      // else: selected but no approved image → "se va todo", drop the question.
    } else {
      out.push(bare); // never selected for an image — keep as-is.
    }
  }

  const generated = urlByIndex.size;
  const selected = targets.length;
  return { questions: out, found, selected, generated, dropped: selected - generated };
}

// Generate ONE question's image on demand — the editor's per-question
// "Generate with AI" button. Reuses the same generate → judge → upload
// pipeline as the bulk path. Returns the uploaded image URL, or null on any
// failure (never throws). `concept` (the question stem) is sent so the judge
// verifies the picture against the real question.
export async function generateOneQuestionImage({ prompt, concept = "", accessToken, userId } = {}) {
  const p = typeof prompt === "string" ? prompt.trim() : "";
  if (!p || !accessToken || !userId) return null;
  return generateOne(p, concept, accessToken, userId);
}

// Pick `n` index values from ascending `arr`, spread evenly across it.
function pickSpread(arr, n) {
  if (n >= arr.length) return arr.slice();
  if (n <= 0) return [];
  if (n === 1) return [arr[0]];
  const chosen = new Set();
  for (let k = 0; k < n; k++) {
    chosen.add(arr[Math.round((k * (arr.length - 1)) / (n - 1))]);
  }
  // Rounding can collide; backfill in order until we reach n.
  if (chosen.size < n) {
    for (const x of arr) {
      if (chosen.size >= n) break;
      chosen.add(x);
    }
  }
  return [...chosen].sort((a, b) => a - b);
}

// One prompt → uploaded public URL (or null on any failure / judge rejection).
// Never throws. `concept` is the question stem, sent so the server-side judge
// can verify the image against the real question, not just the image_prompt.
async function generateOne(prompt, concept, accessToken, userId) {
  let resp;
  try {
    resp = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ prompt, concept }),
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;

  let data;
  try { data = await resp.json(); } catch { return null; }
  if (!data || !data.image) return null;

  const mime = data.mimeType || "image/png";
  const blob = base64ToBlob(data.image, mime);
  if (!blob) return null;

  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
  const file = new File([blob], `ai-image.${ext}`, { type: blob.type });
  const res = await uploadDeckCover(file, userId);
  return res && res.url ? res.url : null;
}

function promptOf(q) {
  if (!q || typeof q !== "object") return "";
  const p = typeof q.image_prompt === "string" ? q.image_prompt.trim() : "";
  return p.length >= 3 ? p : "";
}

// The question stem (field "q") — the judge's reference concept. Falls back to
// other common text fields, then empty (the endpoint falls back to the prompt).
function conceptOf(q) {
  if (!q || typeof q !== "object") return "";
  const c = q.q || q.question || q.prompt || q.text || "";
  return typeof c === "string" ? c.slice(0, 500) : "";
}

function strip(q) {
  if (q && typeof q === "object" && "image_prompt" in q) {
    const { image_prompt, ...rest } = q;
    void image_prompt;
    return rest;
  }
  return q;
}

function stripAll(questions) {
  return Array.isArray(questions) ? questions.map(strip) : questions;
}

function base64ToBlob(b64, mime) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}
