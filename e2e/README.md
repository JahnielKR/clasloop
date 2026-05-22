# E2E tests (Playwright)

Boots the Vite dev server (`:3000`) and runs browser tests against it. Config:
[`playwright.config.ts`](../playwright.config.ts). Chromium only for now (add
firefox/webkit projects there if cross-browser coverage is needed).

## Run

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # interactive UI mode
```

## Suites

- **`public.spec.ts`** — no auth, no data writes (pure navigation + visible-UI
  assertions). Runs against any deployment and in CI. Currently covers the
  PublicHome landing and the `/join` guest entry screen.
- **`authed.spec.ts`** — `test.skip` scaffolds for the authenticated flows
  (sign-up, teacher login, deck create, session + student join, student question
  types). They WRITE data, so they must run against a dedicated **TEST Supabase
  project — never prod** (see the PR 107 hotfix lesson in `PRs/CHANGES_TO_PLAN.md`).

## Enabling the authed flows

1. Provision a free-tier **TEST** Supabase project; apply `supabase/schema.sql`
   + `supabase/migrations/`. Create a test teacher account.
2. Set env (CI secrets or a gitignored `.env.test` — note `.env*` is gitignored):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → the TEST project
   - `E2E_TEACHER_EMAIL`, `E2E_TEACHER_PASSWORD` → the test teacher
3. Drop the `.skip` in `authed.spec.ts` and verify the selectors against the real
   components (`AuthScreen.jsx`, `Decks.jsx`, `SessionFlow.jsx`, `StudentJoin.jsx`).

Insight generation is intentionally not e2e-covered: it needs the Supabase Edge
Function + Anthropic + the `api/` serverless layer, none of which run under
`npm run dev` (the original README's `MOCK_ANTHROPIC` flag is fictional).
