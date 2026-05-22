# Clasloop — Setup

This document walks you through cloning, configuring, and running clasloop locally + deploying to production.

**Target environment:** Node 22+, npm 10+, modern browser (Chrome / Firefox / Safari / Edge). Optional: Android Studio + Capacitor CLI for native builds.

## 1. Clone

```bash
git clone https://github.com/JahnielKR/clasloop.git
cd clasloop
```

## 2. Install dependencies

```bash
npm install
```

Node 22+ is required. `npm install` may install platform-specific binaries (`@rollup/rollup-*`, `@esbuild/*`); the lockfile pins them.

## 3. Set up the database

Clasloop uses Supabase for Postgres + Auth + Realtime + Edge Functions.

### 3a. Create a Supabase project

1. Sign up at https://supabase.com.
2. Create a new project (free tier works for development).
3. Note the `Project URL` and `anon key` from Project Settings → API.

### 3b. Apply the schema

Clasloop maintains a canonical schema in `supabase/schema.sql`, regenerated from production after each change (see `supabase/schema.README.md`).

1. Supabase Dashboard → SQL Editor → New Query.
2. Copy the **entire** content of `supabase/schema.sql` and paste it.
3. Click Run.

This creates all tables, RLS policies, functions, triggers, and RPCs in a single shot.

> **Don't** apply individual files from `supabase/migrations/` on top of this. Those are historical migrations already incorporated into `schema.sql`.

### 3c. Enable extensions

In Supabase Dashboard → Database → Extensions, enable:
- `pg_cron` (needed for `close_zombie_sessions` cron — see PR 103, and the `cleanup_expired_scans` job from the original scans migration)
- `pgcrypto` (usually enabled by default)

After enabling `pg_cron`, re-run any cron-setup migrations (search `supabase/migrations/` for files mentioning `cron.schedule`).

### 3d. Storage buckets

In Supabase Dashboard → Storage:
- Create bucket `avatars` (public).
- Create bucket `deck-images` (public).
- Create bucket `scan-images` (private).

(If you forget, `npm run dev` works for everything except avatar upload + deck images + scanner upload.)

## 4. Configure environment

### 4a. Copy `.env.example` to `.env`

```bash
cp .env.example .env
```

### 4b. Fill in the values

Edit `.env`:

```
# Supabase
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Anthropic (server-side only — used by api/generate.js)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: observability
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

`VITE_*` variables are bundled into the client. `ANTHROPIC_API_KEY` stays server-side (Vercel function env var only — DO NOT put it in `VITE_*`).

## 5. Run dev server

```bash
npm run dev
```

Vite serves on http://localhost:3000 by default (configured in `vite.config.js`).

Sign up with email/password → confirm via the email Supabase sends → log in. The first signup gets `role: 'teacher'` automatically.

## 6. (Optional) Deploy Edge Function

The Edge Function `generate-insight` runs post-session AI analysis. To deploy:

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Link your local project to the remote
supabase link --project-ref <your-project-ref>

# Generate and set the webhook secret (used by the function to auth incoming webhook calls)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
supabase secrets set WEBHOOK_SECRET=<output>
supabase secrets set ANTHROPIC_API_KEY=<your-key>

# Deploy
supabase functions deploy generate-insight
```

Then configure the webhook in Supabase Dashboard → Database → Webhooks → "generate-insight-on-session-complete":
- HTTP Headers → add `Authorization: Bearer <WEBHOOK_SECRET>`.

(See `PRs/PR_90_edge_function_webhook_auth/README.md` for details.)

## 7. (Optional) Deploy to Vercel

1. Push to GitHub.
2. Create a Vercel project, link the repo.
3. Add env vars (mirror `.env`, EXCEPT `ANTHROPIC_API_KEY` is the only one without `VITE_` prefix — Vercel reads it for serverless functions).
4. Deploy. `vercel.json` handles security headers and routing.

## 8. (Optional) Native Android build

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK lands in `android/app/build/outputs/apk/debug/`.

For Play Store release, see `docs/CAPACITOR_FASE2_OAUTH.md` and friends in `docs/`.

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module @rollup/rollup-linux-x64-gnu` | `node_modules` from a different platform | `rm -rf node_modules package-lock.json && npm install` |
| Auth works but RPCs error | Migration didn't apply | Re-paste `supabase/schema.sql` |
| `generate-insight` returns 401 | WEBHOOK_SECRET mismatch | Re-set via `supabase secrets set` AND update the webhook header in Dashboard |
| White screen, no error | ErrorBoundary off (regression) | Check `src/main.jsx` imports `SentryErrorBoundary` + wraps `ToastProvider > Root` |

## Where things live

```
src/                  Frontend (React + Vite)
api/                  Vercel serverless (Anthropic proxy)
supabase/             DB schema + migrations + Edge Functions
android/              Capacitor Android wrap
scripts/              Build helpers (icons, fonts, patches)
PRs/                  Per-PR change documents (run by Claude Code)
docs/                 Architecture / feature notes
```

## Next steps

- Read `ANALYSIS.md` for a deep audit of the codebase.
- Read `PRs/INDICE_PENDIENTES.md` for the open roadmap.
- Read `CONTRIBUTING.md` before opening a PR.
