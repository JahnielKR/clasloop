// ─── src/lib/pptx-images.js — reuse images embedded in a teacher's PPTX ──────
//
// Track A: when a teacher generates questions from a .pptx, we pull the images
// embedded in the file (ppt/media/*), show them to the model alongside the text
// so it can decide which image belongs to which question (it returns an
// `image_ref` index), then upload the chosen ones to Storage and set the
// question's existing `image_url` field — the same field the editor, the live
// quiz and the PDF export already render.
//
// All client-side: a .pptx is a zip we already open with JSZip for text
// extraction (file-extract.js). Images are compressed before they're sent to
// the model (keeps the request under Vercel's body limit) and uploaded with the
// existing deck-image upload helper.

import JSZip from "jszip";
import { uploadDeckCover } from "./deck-image-upload";

const SUPPORTED = /\.(png|jpe?g|gif|webp)$/i;
const SEND_MAX_DIM = 1024;        // downscale longest side before sending to the model
const SEND_QUALITY = 0.8;         // JPEG quality for the model copy
const MIN_BYTES = 4000;           // skip tiny bullets/icons
const MAX_TOTAL_B64 = 2_500_000;  // cap cumulative base64 we send (~request size guard)

/**
 * Extract embedded images from a .pptx. Returns an array (already capped and
 * ordered largest-first) of { blob, mediaType, base64 } where base64 is a
 * compressed JPEG copy for the model. The array index IS the `image_ref` the
 * model uses, so the same array must drive both sending and attaching.
 */
export async function extractPptxImages(file, { max = 6 } = {}) {
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return [];
  }

  const candidates = [];
  for (const path of Object.keys(zip.files)) {
    if (!/^ppt\/media\//i.test(path) || !SUPPORTED.test(path)) continue;
    const entry = zip.file(path);
    if (!entry) continue;
    const blob = await entry.async("blob");
    if (blob.size < MIN_BYTES) continue;
    candidates.push({ blob, mediaType: mediaTypeFor(path) });
  }

  // Larger images are more likely real content (diagrams/photos) than chrome.
  candidates.sort((a, b) => b.blob.size - a.blob.size);

  const out = [];
  let total = 0;
  for (const c of candidates) {
    if (out.length >= max) break;
    const base64 = await compressToBase64(c.blob);
    if (!base64) continue;
    if (total + base64.length > MAX_TOTAL_B64) break;
    total += base64.length;
    out.push({ blob: c.blob, mediaType: c.mediaType, base64 });
  }
  return out;
}

/**
 * Anthropic-shaped content blocks for the extracted images, each preceded by a
 * `[image N]` text label so the model can reference them by index. Synchronous
 * + 1:1 with the array, so indices stay aligned with attachDocImages().
 */
export function buildImageParts(images) {
  const parts = [];
  for (let i = 0; i < images.length; i++) {
    parts.push({ type: "text", text: `[image ${i}]` });
    parts.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: images[i].base64 },
    });
  }
  return parts;
}

/**
 * For each question the model tagged with a valid `image_ref`, upload that
 * extracted image and set `image_url`. Always strips `image_ref` so it never
 * leaks into saved deck data. Uploads each referenced index at most once.
 */
export async function attachDocImages(questions, images, userId) {
  if (!Array.isArray(questions)) return questions;
  if (!images || images.length === 0 || !userId) return questions.map(stripRef);

  const urlByIndex = new Map();
  const out = [];
  for (const q of questions) {
    const ref = q && Number.isInteger(q.image_ref) ? q.image_ref : null;
    if (ref == null || ref < 0 || ref >= images.length) {
      out.push(stripRef(q));
      continue;
    }
    if (!urlByIndex.has(ref)) {
      const img = images[ref];
      const fileObj = new File([img.blob], `doc-image-${ref}`, { type: img.mediaType || "image/png" });
      const res = await uploadDeckCover(fileObj, userId);
      urlByIndex.set(ref, res && res.url ? res.url : null);
    }
    const url = urlByIndex.get(ref);
    const bare = stripRef(q);
    out.push(url ? { ...bare, image_url: url } : bare);
  }
  return out;
}

function stripRef(q) {
  if (q && typeof q === "object" && "image_ref" in q) {
    const { image_ref, ...rest } = q;
    void image_ref;
    return rest;
  }
  return q;
}

function mediaTypeFor(path) {
  const ext = (path.match(SUPPORTED)?.[1] || "png").toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return `image/${ext}`;
}

// Downscale + JPEG-encode a blob, returning bare base64 (no data: prefix), or
// null if the image can't be decoded.
function compressToBase64(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, SEND_MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", SEND_QUALITY);
        URL.revokeObjectURL(url);
        resolve(dataUrl.split(",")[1] || null);
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
