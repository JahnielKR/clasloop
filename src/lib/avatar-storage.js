// ─── Profile avatar (uploaded photo) storage ───────────────────────────────
// Compresses to a square thumbnail before uploading. Profile avatars are
// rendered small (40-120px), so we don't need full resolution.
import { supabase } from "./supabase";

const BUCKET = "profile-avatars";
const MAX_DIM = 400;     // square crop, plenty for any UI we render
const QUALITY = 0.85;
const TARGET_MIME = "image/jpeg";

/**
 * Compress + center-crop an image to a square, then upload.
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<{url: string} | {error: string}>}
 */
export async function uploadProfileAvatar(file, userId) {
  if (!file || !userId) return { error: "missing_args" };
  if (!file.type.startsWith("image/")) return { error: "not_an_image" };

  let blob;
  try {
    blob = await compressToSquare(file);
  } catch (e) {
    return { error: "compress_failed" };
  }

  const filename = `${userId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filename, blob, { contentType: TARGET_MIME, upsert: false });
  if (upErr) return { error: upErr.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return { url: pub?.publicUrl };
}

/**
 * Delete a previously-uploaded avatar from Storage. Best-effort — silently
 * ignores files we don't own (RLS will block) or files that don't exist.
 * @param {string} url
 */
export async function deleteProfileAvatar(url) {
  if (!url) return;
  // Extract path after `/profile-avatars/`
  const idx = url.indexOf(`/${BUCKET}/`);
  if (idx === -1) return;
  const path = url.slice(idx + BUCKET.length + 2);
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

// ── Internal: image compression ──
function compressToSquare(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();
    fr.onload = () => { img.src = fr.result; };
    fr.onerror = () => reject(new Error("read_failed"));
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const offX = (img.width - size) / 2;
      const offY = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = MAX_DIM;
      canvas.height = MAX_DIM;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, MAX_DIM, MAX_DIM);
      ctx.drawImage(img, offX, offY, size, size, 0, 0, MAX_DIM, MAX_DIM);
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error("blob_failed")),
        TARGET_MIME,
        QUALITY
      );
    };
    img.onerror = () => reject(new Error("decode_failed"));
    fr.readAsDataURL(file);
  });
}
