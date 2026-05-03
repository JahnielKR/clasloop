// ─── Deck cover image upload ────────────────────────────────────────────────
// Compresses on the client before sending to Supabase Storage so we don't
// store 5MB phone photos for a tiny banner.
import { supabase } from "./supabase";

const BUCKET = "deck-covers";
const MAX_DIM = 1200;        // longest side
const QUALITY = 0.82;        // JPEG quality
const TARGET_MIME = "image/jpeg";

/**
 * Compress + upload an image file. Returns the public URL on success.
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<{url: string} | {error: string}>}
 */
export async function uploadDeckCover(file, userId) {
  if (!file || !userId) return { error: "missing_args" };
  if (!file.type.startsWith("image/")) return { error: "not_an_image" };

  let blob;
  try {
    blob = await compressImage(file);
  } catch (e) {
    return { error: "compress_failed" };
  }

  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filename, blob, {
      cacheControl: "31536000",
      contentType: TARGET_MIME,
      upsert: false,
    });

  if (upErr) return { error: upErr.message || "upload_failed" };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return { url: data.publicUrl };
}

/**
 * Delete a previously uploaded cover. Owner-restricted via RLS, so this only
 * succeeds for the user's own files.
 */
export async function deleteDeckCover(url) {
  if (!url || !url.includes("/storage/v1/object/public/")) return;
  const idx = url.indexOf(`/${BUCKET}/`);
  if (idx === -1) return;
  const path = url.slice(idx + BUCKET.length + 2);
  await supabase.storage.from(BUCKET).remove([path]);
}

// ── Compress: redraw onto a canvas with max dimension + JPEG encoding ──────
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = (e) => {
      img.onerror = () => reject(new Error("decode_failed"));
      img.onload = () => {
        const { width: w0, height: h0 } = img;
        const scale = Math.min(1, MAX_DIM / Math.max(w0, h0));
        const w = Math.round(w0 * scale);
        const h = Math.round(h0 * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("blob_failed")),
          TARGET_MIME,
          QUALITY
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
