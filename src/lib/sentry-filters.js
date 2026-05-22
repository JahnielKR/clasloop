// ─── lib/sentry-filters.js ─────────────────────────────────────────────
//
// PR 158 (M15): the Sentry `beforeSend` filter, extracted from sentry.js as a
// pure function so it can be unit-tested. Sentry itself is a no-op in dev /
// without a DSN, so the filter is otherwise unverifiable.
//
// Returns the event to send (possibly with an added tag), or null to drop it.

export function beforeSendFilter(event, hint) {
  const err = hint?.originalException;

  // Filter 1 (PR 158 / M15): network errors (NetworkError, "Failed to fetch")
  // used to be DROPPED. They are exactly what we want to know about — CORS,
  // Vercel down, offline. Keep them, tagged kind:network so the Sentry
  // dashboard can still filter them out if they ever get noisy.
  if (err?.name === "NetworkError" || err?.message?.includes("Failed to fetch")) {
    event.tags = { ...event.tags, kind: "network" };
    return event;
  }

  const msg = err?.message || "";

  // Filter 2: Capacitor native-dialog cancels (file picker, scanner). Not a bug.
  if (msg.includes("cancelled") || msg.includes("user_cancelled")) {
    return null;
  }

  // Filter 3: ResizeObserver loop warning — benign, known browser noise.
  if (msg.includes("ResizeObserver")) {
    return null;
  }

  return event;
}
