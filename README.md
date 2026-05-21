# Clasloop

> Real-time classroom warmups, exit tickets, and AI-generated insights for teachers.

Clasloop is a learning-engagement platform for K-12 teachers. Students join sessions with a 6-digit PIN, answer questions live, and the teacher sees results in real time. After each session, Claude generates a personalized weak-points insight so the teacher knows what to re-teach.

**Stack:** React 18 (Vite) · Supabase (Postgres + RLS + Edge Functions) · Capacitor (Android wrap) · Vercel (web hosting) · Anthropic Claude (AI generation).

## Features

- **Live sessions.** Teachers run warmups or exit tickets; students join by PIN.
- **Decks.** AI-assisted deck creation: paste lesson content, Claude generates questions.
- **Insights.** Post-session, Claude analyzes the responses and surfaces 2-3 concrete weak points with student counts.
- **Multilingual.** English / Spanish / Korean UI + AI generation.
- **Mobile-friendly.** Native Android wrap via Capacitor.

## Quick start

See [`SETUP.md`](./SETUP.md) for full installation, Supabase schema setup, Edge Function deploy, and env configuration.

```bash
git clone https://github.com/JahnielKR/clasloop.git
cd clasloop
npm install
cp .env.example .env  # then fill in real values
npm run dev
```

## Architecture

```
src/
  pages/         React pages (one per route)
  components/    Reusable React components
  lib/           Business logic (AI, deck math, scoring, native helpers)
  hooks/         Custom React hooks
  i18n/          en / es / ko translations
  styles/        Themes + global CSS
  routes.js      Centralized route definitions

api/             Vercel serverless endpoints (Anthropic proxy + rate limit)
supabase/        Database schema, migrations, Edge Functions
android/         Capacitor-generated Android project
public/          Static assets
```

For deeper architecture notes see [`docs/`](./docs/) and [`ANALYSIS.md`](./ANALYSIS.md) (full audit of the codebase).

## Documentation

- [`SETUP.md`](./SETUP.md) — install + run.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to contribute.
- [`docs/`](./docs/) — feature-specific notes.
- [`ANALYSIS.md`](./ANALYSIS.md) — full audit (security, performance, DB, UX).
- [`PRs/`](./PRs/) — per-PR change descriptions ready for execution.

## Status

Clasloop is in active development. See [`PRs/INDICE_PENDIENTES.md`](./PRs/INDICE_PENDIENTES.md) for the roadmap.

## License

Proprietary — all rights reserved. See [`LICENSE`](./LICENSE).

The code is public for transparency and to enable issue reports / pull requests, but no license to use, copy, or redistribute is granted. Contact the author for licensing inquiries.

## Author

Built by [@JahnielKR](https://github.com/JahnielKR).
