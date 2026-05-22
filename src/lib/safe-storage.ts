// PR 169 (L14): centralized localStorage access that never throws.
//
// localStorage can throw (Safari private mode, disabled cookies, quota
// exceeded) or be entirely absent (SSR / non-browser). These helpers swallow
// those failures and return a fallback so callers don't each repeat the same
// try/catch.
//
// SCOPE: this is for the "best-effort, silent fallback" cases. Where a write
// failure is worth observing (e.g. theme persistence — see
// src/components/tokens.js, PR 136), keep the explicit try/catch + captureError
// instead of these helpers.

export function safeGet(key: string, fallback: string | null = null): string | null {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGet(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    return safeSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
