# Contributing to Clasloop

Thanks for the interest. Clasloop is built primarily by [@JahnielKR](https://github.com/JahnielKR) but issues and PRs are welcome.

## License & contribution terms

Clasloop is published under an **all-rights-reserved** license (see [`LICENSE`](./LICENSE)). By opening a pull request you confirm that:

1. You own the copyright to the code you contribute, OR you have permission to contribute it.
2. You agree to **assign the copyright** of your contribution to the project owner, who may then license it as part of Clasloop under any terms they choose.
3. Your contribution does not include third-party code unless properly attributed and license-compatible.

If you'd rather retain copyright, do not open the PR — open an issue first to discuss alternative arrangements.

## Ground rules

- **One PR, one concern.** If your PR touches both a UI bug and a DB migration, split into two.
- **Tests required for logic changes.** New `lib/` functions and Edge Function changes need tests (vitest). UI changes need at least a screenshot in the PR description.
- **No secrets in commits.** Use `.env.example` for placeholders. Real values stay in `.env` (gitignored) and Vercel env vars.
- **Migrations are append-only.** Never edit a migration that's already in `supabase/migrations/`. Add a new one.
- **TypeScript preferred** for new code in `src/lib/` and `api/`. JSX is fine for components.

## Development setup

See [`SETUP.md`](./SETUP.md).

## Workflow

1. Fork or branch from `main`.
2. Create a branch: `git checkout -b feat/<short-slug>` or `fix/<short-slug>`.
3. Code, test (`npm run test:run`, `npm run typecheck`, `npm run build`).
4. Commit. Use the convention below.
5. Push. Open a PR with a description of (a) the problem, (b) the change, (c) how to test.
6. CI will run typecheck + tests + build. Fix anything red before requesting review.

## Commit convention

Format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `test`, `style`, `build`.
Scopes (examples): `security`, `db`, `ux`, `bundle`, `observability`, `i18n`, `a11y`, `edge-fn`, `api`.

Examples (from clasloop history):
- `fix(security): PR 92 — profiles.is_admin / role lockdown (C1)`
- `perf(bundle): PR 97 — re-subset noto-sans-kr-data.js (13MB → 3MB, C6)`
- `refactor(ux): PR 99 — sweep alert() → toast.error() (handoff §4.3)`

If the PR closes an audit finding (see `ANALYSIS.md`), include the finding code (`C1`, `H5`, etc.) in the subject or body.

## Testing

```bash
npm run typecheck    # tsc --noEmit, must pass
npm run test:run     # vitest, must pass
npm run build        # vite build, must succeed
```

Smoke-test critical flows depending on what you touched:
- Frontend: `npm run dev`, open the app, run through the changed flow.
- DB: apply migrations in a fresh Supabase test project + create an account + create a class.
- Edge Function: deploy to a test project + trigger via SQL `select net.http_post(...)`.

## Code style

- 2-space indent. No tabs.
- Single quotes for strings.
- Trailing comma on multiline.
- No semicolons at end of line is fine if you're consistent — the codebase has both, no enforcement yet.
- `eslint`/`prettier` config not enforced yet; follow surrounding-code conventions.

## Filing issues

When filing a bug:
- Steps to reproduce.
- Expected vs actual.
- Browser + OS (or Android version if mobile).
- Console errors / Sentry event ID if visible.

## Security disclosures

If you find a security issue, **do not** open a public issue. Email the author (see GitHub profile).

## Code of conduct

Be kind. Disagree about code, not people. No tolerance for harassment.
