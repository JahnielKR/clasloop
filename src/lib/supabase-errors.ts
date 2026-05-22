// ─── lib/supabase-errors.ts ─────────────────────────────────────────────
//
// PR 144 (M21): turn raw Supabase / Postgrest errors into friendly,
// localized, user-facing messages — without leaking technical detail (RLS
// hints, SQL fragments, Postgres codes like "23505 duplicate key").
//
// Pair it with captureError so devs still get the raw error in Sentry:
//   captureError(err, { source: "..." });
//   setError(formatSupabaseError(err, lang));
//
// Messages live here (not in i18n/) on purpose: they're low-level generic
// fallbacks tied 1:1 to the error category, not UI copy.

import type { Lang } from "./class-hierarchy";

type ErrorCategory =
  | "permission_denied"
  | "not_found"
  | "unique_violation"
  | "foreign_key_violation"
  | "network"
  | "rate_limited"
  | "invalid_input"
  | "unknown";

function categorize(err: unknown): ErrorCategory {
  if (!err || typeof err !== "object") return "unknown";

  const e = err as { code?: string; message?: string; status?: number };

  // Postgres / PostgREST codes
  if (e.code === "42501") return "permission_denied";
  if (e.code === "23505") return "unique_violation";
  if (e.code === "23503") return "foreign_key_violation";
  if (e.code === "PGRST116") return "not_found";

  // HTTP status
  if (e.status === 401 || e.status === 403) return "permission_denied";
  if (e.status === 404) return "not_found";
  if (e.status === 429) return "rate_limited";
  if (e.status === 400) return "invalid_input";
  if (typeof e.status === "number" && e.status >= 500) return "network";

  // Common message patterns (network failures, RLS)
  const msg = e.message?.toLowerCase() ?? "";
  if (msg.includes("failed to fetch") || msg.includes("networkerror")) return "network";
  if (msg.includes("permission denied") || msg.includes("row-level security")) return "permission_denied";

  return "unknown";
}

const MESSAGES: Record<Lang, Record<ErrorCategory, string>> = {
  en: {
    permission_denied:     "You don't have permission to do that.",
    not_found:             "We couldn't find what you're looking for.",
    unique_violation:      "That already exists. Try a different name.",
    foreign_key_violation: "Can't do that — something else depends on it.",
    network:               "Network error. Check your connection and try again.",
    rate_limited:          "Slow down — too many requests. Try again in a moment.",
    invalid_input:         "Some of your input isn't valid. Double-check the fields.",
    unknown:               "Something went wrong. If it keeps happening, contact support.",
  },
  es: {
    permission_denied:     "No tenés permiso para hacer eso.",
    not_found:             "No encontramos lo que buscás.",
    unique_violation:      "Eso ya existe. Probá con otro nombre.",
    foreign_key_violation: "No se puede — hay otra cosa que depende de esto.",
    network:               "Error de red. Revisá tu conexión e intentá de nuevo.",
    rate_limited:          "Más despacio — demasiadas solicitudes. Probá en un momento.",
    invalid_input:         "Algo de lo que ingresaste no es válido. Revisá los campos.",
    unknown:               "Algo salió mal. Si sigue, contactá soporte.",
  },
  ko: {
    permission_denied:     "권한이 없습니다.",
    not_found:             "찾을 수 없습니다.",
    unique_violation:      "이미 존재합니다. 다른 이름을 사용해보세요.",
    foreign_key_violation: "관련된 항목이 있어 처리할 수 없습니다.",
    network:               "네트워크 오류. 연결을 확인하고 다시 시도해주세요.",
    rate_limited:          "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    invalid_input:         "입력이 유효하지 않습니다. 필드를 확인해주세요.",
    unknown:               "문제가 발생했습니다. 계속되면 지원팀에 문의해주세요.",
  },
};

export function formatSupabaseError(err: unknown, lang: Lang = "en"): string {
  const category = categorize(err);
  return MESSAGES[lang]?.[category] ?? MESSAGES.en[category];
}
