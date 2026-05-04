// ─── Guest session helpers ──────────────────────────────────────────────────
// Manages the localStorage token that lets a guest reconnect to a session
// after a page reload. Also handles client-side name validation (length,
// trimming, basic profanity filter).

const STORAGE_KEY_PREFIX = "clasloop_guest_";

/**
 * Generate a cryptographically random UUID for the guest token.
 * Falls back to a Math.random version if crypto.randomUUID is missing
 * (older browsers).
 */
export function generateGuestToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback — RFC4122 v4-ish, not cryptographically strong but acceptable.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Save the guest's token + name + sessionId to localStorage.
 * Lets the guest reconnect if they reload the page.
 */
export function saveGuestSession({ sessionId, token, name }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + sessionId,
      JSON.stringify({ token, name, savedAt: Date.now() })
    );
  } catch (e) { /* storage may be disabled */ }
}

export function loadGuestSession(sessionId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + sessionId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function clearGuestSession(sessionId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + sessionId);
  } catch (e) { /* ignore */ }
}

// ─── Name validation ────────────────────────────────────────────────────────

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 30;

// Multi-language profanity list. Conservative — only the most explicit terms.
// Whole-word matching only (so legitimate names with these as substrings aren't
// blocked). Each entry is matched case-insensitively as a whole word.
const PROFANITY = [
  // English (most common)
  "fuck", "fck", "shit", "sht", "asshole", "bitch", "btch", "cunt",
  "dick", "pussy", "nigger", "nigga", "faggot", "fag",
  "retard", "retarded", "whore", "slut",
  // Spanish
  "puta", "puto", "mierda", "joder", "coño", "cono", "polla",
  "verga", "pendejo", "pendeja", "cabron", "cabrón", "chinga",
  "marica", "maricón", "maricon",
  // Korean (basic)
  "씨발", "시발", "병신", "지랄", "좆", "꺼져", "개새끼", "새끼",
  // Generic
  "admin", "moderator", "system", "anonymous", "anon",
  "hitler", "nazi",
];

/**
 * Validate a guest name. Returns { ok: true, name } if valid (with trimmed
 * version), or { ok: false, reason: "too_short" | "too_long" | "profanity" }
 * if invalid.
 */
export function validateGuestName(rawName) {
  if (typeof rawName !== "string") return { ok: false, reason: "too_short" };
  const name = rawName.trim().replace(/\s+/g, " "); // collapse whitespace

  if (name.length < MIN_NAME_LENGTH) return { ok: false, reason: "too_short" };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, reason: "too_long" };

  const lowered = name.toLowerCase();

  // Two-pass check:
  //  1. Token-level whole-word match (catches "fuck" but not "Patricia")
  //  2. For longer profanity (5+ chars), also do a substring match
  //     to catch compound names like "PutaMadre".
  const tokens = lowered.split(/[\s\-_.,!?¿¡]+/).filter(Boolean);
  for (const token of tokens) {
    const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (PROFANITY.includes(cleaned)) return { ok: false, reason: "profanity" };
  }
  for (const bad of PROFANITY) {
    if (lowered === bad) return { ok: false, reason: "profanity" };
    // CJK characters: always substring match (single chars carry full meaning,
    // and legitimate names are unlikely to contain these specific compounds).
    const isCJK = /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(bad);
    // Latin profanity 4+ chars is unlikely to be a legitimate substring of names.
    // Short profanity (<4 chars like "fck") was already caught as whole-word above.
    if (isCJK && lowered.includes(bad)) {
      return { ok: false, reason: "profanity" };
    }
    if (!isCJK && bad.length >= 4 && lowered.includes(bad)) {
      return { ok: false, reason: "profanity" };
    }
  }

  return { ok: true, name };
}
