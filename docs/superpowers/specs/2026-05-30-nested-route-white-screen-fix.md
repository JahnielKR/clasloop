# Fix: white screen on hard refresh / deep-link to nested web routes

**Date:** 2026-05-30
**Type:** production bug fix (web only — Android unaffected)
**Status:** implemented

## Symptom

On the web app (clasloop.com), a hard refresh (F5) or a deep-link to any route
with **two or more path segments** — e.g. `/decks/:id/edit`, `/school/class/:id`,
`/decks/:id/results` — renders a **blank white screen**. The browser console shows:

> Failed to load module script: Expected a JavaScript module script but the
> server responded with a MIME type of "text/html".

Single-segment routes (`/decks`, `/school`, `/login`) and client-side navigation
(clicking links within the SPA) are **not** affected — only a fresh load of a
nested URL.

## Root cause (confirmed)

The Vite build used `base: './'` (relative asset URLs). The built `index.html`
references its bundles relatively:

```html
<script type="module" src="./assets/index-*.js"></script>
<link rel="stylesheet" href="./assets/index-*.css">
```

The browser resolves `./assets/x.js` against the **current document directory**:

| Loaded URL | Document dir | `./assets/x.js` resolves to | Result |
|---|---|---|---|
| `/decks` | `/` | `/assets/x.js` | ✅ found |
| `/decks/abc/edit` | `/decks/abc/` | `/decks/abc/assets/x.js` | ❌ 404 |

On Vercel, a request that matches no static file falls through to the SPA rewrite
in `vercel.json`:

```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

So `/decks/abc/assets/x.js` → no such file → rewritten to `/index.html` →
served as `text/html`. The browser asked for a JS module and got HTML →
MIME-type error → the app never boots → white screen.

Why it only bites web: the native (Capacitor) app uses **HashRouter**
(`src/main.jsx`), so the document URL always stays at the root and the route
lives after `#` — `./assets` always resolves correctly there. Web uses
**BrowserRouter** with real nested paths, which is exactly where relative asset
URLs break.

## Why `base: './'` existed

It was added in PR 50 for Capacitor: the native WebView serves the bundle from a
`file://` / localhost scheme, where absolute `/assets/...` paths are not
guaranteed to resolve. Relative paths are the safe, proven value for native.

## Fix

Make `base` **conditional on the build target**, since one `vite build` feeds
both the web (Vercel) and native (Capacitor) artifacts:

- **Web build** (`npm run build`, what Vercel runs) → `base: '/'`
  Absolute asset URLs resolve from the site root at **any** route depth.
- **Capacitor build** (`npm run build:capacitor`, run before `cap sync`) →
  `base: './'` — unchanged, preserves the proven native behavior.

Detection (in `vite.config.js`) is cross-platform and dependency-free:

```js
const isCapacitorBuild =
  process.env.CAPACITOR_BUILD === '1' ||
  process.env.npm_lifecycle_event === 'build:capacitor';
```

`npm_lifecycle_event` is the name of the npm script that launched the process,
set by npm on every OS — so `npm run build:capacitor` flips the base with no
`cross-env`, no Vite `--mode` (which would have changed `import.meta.env.MODE`
and, with it, the Sentry `environment` tag in `src/lib/sentry.js`), and no
changes to `.env` loading.

### Files

- `vite.config.js` — conditional `base`.
- `package.json` — new `build:capacitor` script (`tsc --noEmit && vite build`).
- `docs/CAPACITOR_FASE1_INSTRUCCIONES_WINDOWS.md`,
  `docs/CAPACITOR_FASE1_INSTRUCCIONES_MAC.md`,
  `docs/CAPACITOR_MIGRATION_PLAN.md` — the Android build step now uses
  `npm run build:capacitor`.

## Verification

This is a build-config change; the meaningful test is the **emitted
`index.html`**, which directly reproduces the bug condition:

1. `npm run build` → `dist/index.html` references **`/assets/...`** (absolute) →
   web fixed at any depth.
2. `npm run build:capacitor` → `dist/index.html` references **`./assets/...`**
   (relative) → native behavior preserved.

A unit test of the one-line ternary was deliberately skipped: vitest's
`include` is scoped to `src/**` (app code), and the real risk lives in the build
output and the two serving environments, not in the ternary — the dual build
assertion above covers it better. Final confirmation is on the Vercel
deploy: load a nested route and hard-refresh — no white screen.

## Risk

Web: low — `base: '/'` is the Vite SPA default and what every other route depth
already expects. Android: none — its build path is unchanged (`./`), as long as
the documented `npm run build:capacitor` is used before `cap sync`.
