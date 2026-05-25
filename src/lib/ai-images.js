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
// Cost + latency live here. We cap how many images we generate per batch and
// run them in parallel, so a 6-image batch is one ~15s wait instead of six
// sequential ones. An image failure never blocks the questions: the teacher
// keeps every question, just without the picture that failed. `image_prompt` is
// always stripped so it never leaks into saved deck data.

import { uploadDeckCover } from "./deck-image-upload";

const MAX_IMAGES = 6;

/**
 * For each question carrying an `image_prompt`, generate + upload an image and
 * set `image_url`. Returns { questions, found, generated, failed } where
 * `found` is how many questions asked for an image (before the cap), `generated`
 * how many succeeded, `failed` how many were attempted but errored.
 */
export async function generateQuestionImages(questions, { accessToken, userId, max = MAX_IMAGES } = {}) {
  const stripped = stripAll(questions);
  if (!Array.isArray(questions) || !accessToken || !userId) {
    return { questions: stripped, found: 0, generated: 0, failed: 0 };
  }

  // Collect the questions that asked for an image, in order, capped for cost.
  const targets = [];
  let found = 0;
  for (let i = 0; i < questions.length; i++) {
    const prompt = promptOf(questions[i]);
    if (!prompt) continue;
    found++;
    if (targets.length < max) targets.push({ i, prompt });
  }
  if (targets.length === 0) return { questions: stripped, found, generated: 0, failed: 0 };

  // Generate in parallel — each call is several seconds; sequential would stack
  // into a minute-plus wait. allSettled so one failure doesn't sink the batch.
  const results = await Promise.allSettled(
    targets.map((t) => generateOne(t.prompt, accessToken, userId))
  );

  const urlByIndex = new Map();
  let failed = 0;
  results.forEach((r, k) => {
    const idx = targets[k].i;
    if (r.status === "fulfilled" && r.value) urlByIndex.set(idx, r.value);
    else failed++;
  });

  const out = questions.map((q, i) => {
    const bare = strip(q);
    const url = urlByIndex.get(i);
    return url ? { ...bare, image_url: url } : bare;
  });

  return { questions: out, found, generated: urlByIndex.size, failed };
}

// One prompt → uploaded public URL (or null on any failure). Never throws.
async function generateOne(prompt, accessToken, userId) {
  let resp;
  try {
    resp = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ prompt }),
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
