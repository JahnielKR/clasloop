import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── Vite configuration ─────────────────────────────────────────────────
// `base` is CONDITIONAL on the build target (see the `isCapacitorBuild`
// block below). PR 50 originally hardcoded `base: './'` for Capacitor, but
// relative asset URLs break the WEB app: a hard refresh / deep-link to a
// nested route (e.g. /decks/:id/edit) made the browser resolve `./assets/x.js`
// against `/decks/:id/` → 404 → Vercel's SPA rewrite served index.html
// (text/html) for a .js request → MIME error → white screen. Web now uses
// `base: '/'` (absolute, depth-proof); Capacitor keeps `'./'` via the
// `build:capacitor` script. Full write-up:
// docs/superpowers/specs/2026-05-30-nested-route-white-screen-fix.md
//
// PR 70: agregada sección `test` para Vitest. Los tests viven en
// src/**/__tests__/*.test.js. Correr con `npm test` (watch mode) o
// `npm run test:run` (single run, para CI).
//
// PR 88 (bundle slimming): ver bloque `build.rollupOptions` abajo.
//   - external: saca dompurify + canvg del bundle (NO html2canvas: ver nota)
//   - manualChunks: separa libs vendor en chunks cacheables
//   Resultado medido: chunk principal 984 KB → 414 KB, Decks 1180 → 818 KB.
// ─────────────────────────────────────────────────────────────────────────

// ─── Build target detection ──────────────────────────────────────────────
// One `vite build` feeds two artifacts: the web app (Vercel) and the native
// app (Capacitor). They need different `base` values, so we detect which one
// we're building. `npm_lifecycle_event` is the npm script name that launched
// this process (set by npm on every OS → cross-platform, no `cross-env` and
// no Vite `--mode`, which would have changed import.meta.env.MODE → the Sentry
// `environment` tag). CAPACITOR_BUILD=1 is an explicit escape hatch.
//   - `npm run build`            → web    → base '/'   (Vercel)
//   - `npm run build:capacitor`  → native → base './'  (run before `cap sync`)
const isCapacitorBuild =
  process.env.CAPACITOR_BUILD === '1' ||
  process.env.npm_lifecycle_event === 'build:capacitor'

export default defineConfig({
  plugins: [react()],
  // Web (Vercel) needs ABSOLUTE asset URLs so they resolve from the site root
  // at any route depth; Capacitor's WebView (HashRouter, localhost/file scheme)
  // needs RELATIVE URLs. See the header comment + the spec doc.
  base: isCapacitorBuild ? './' : '/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // Asegurar que el output sigue siendo dist/ (default de Vite, y lo
    // que apunta capacitor.config.ts → webDir: "dist").
    outDir: 'dist',

    // PR 88: subir el warning de 500 KB → 1500 KB. El chunk de Decks
    // legítimamente pasa los 500 KB (incluye dnd-kit + lógica del editor),
    // y el warning ruidoso tapaba warnings reales.
    chunkSizeWarningLimit: 1500,

    rollupOptions: {
      // dompurify y canvg están listados como optionalDependencies de
      // jsPDF. jsPDF SOLO los importa si llamás doc.html() (renderizar
      // HTML a PDF). Clasloop nunca usa doc.html() — solo doc.addImage()
      // con dataURLs. Así que son código muerto y los externalizamos.
      //
      // IMPORTANTE: marcarlas external (en lugar de borrarlas de
      // package.json) es la forma correcta. Borrarlas del package.json
      // no sirve porque `npm install` las re-instala como optionalDeps
      // de jspdf. Acá le decimos a Rollup "no las metas en el bundle".
      //
      // OJO — html2canvas NO va acá aunque también sea optionalDep de
      // jsPDF: src/lib/pdf-math.js lo importa de verdad para rasterizar
      // fórmulas KaTeX al exportar PDF. Si lo externalizás, Rollup deja
      // `import "html2canvas"` (bare specifier) en el bundle y el browser
      // tira "Failed to resolve module specifier html2canvas" al abrir el
      // modal de descarga. Debe quedar bundleado.
      external: ['dompurify', 'canvg'],

      output: {
        // PR 88: agrupar libs en chunks lógicos. El browser cachea por
        // hash de archivo; separando las libs (que casi nunca cambian)
        // del código de app (que cambia en cada deploy), las libs quedan
        // cacheadas entre releases. Un deploy con cambios solo en tu
        // código re-descarga ~400 KB en vez de ~984 KB.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'observability': ['@sentry/react', 'posthog-js'],
          'pdf-libs': ['jspdf', 'qrcode'],
          'dnd-kit': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
          ],
          // recharts powers the Class Report charts. Its own chunk keeps it out
          // of the main bundle — only fetched when the (lazy) report page loads,
          // and stays cached across deploys.
          'charts': ['recharts'],
        },
      },

      // PR 88: silenciar el warning de Rollup "Failed to resolve import"
      // para las deps que excluimos a propósito. jsPDF las importa
      // dinámicamente; sin esto Rollup tira un warning por cada una en
      // cada build aunque sea intencional.
      onwarn(warning, warn) {
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          ['dompurify', 'canvg'].includes(warning.source)
        ) {
          return
        }
        warn(warning)
      },
    },
  },
  // PR 70: Vitest config (mismo defineConfig que vite, Vitest lo lee).
  test: {
    // Convention: tests en src/**/__tests__/*.test.{js,ts,jsx,tsx}.
    // PR 167: acotamos `include` a src/ — el default de Vitest también matchea
    // *.spec, y Playwright usa e2e/*.spec.ts; sin esto, Vitest intentaría
    // correr los e2e (que importan @playwright/test) y fallaría.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    globals: false,  // Forzar import explicit de { describe, it, expect }
    // PR 166: jsdom global para los component tests (React render con
    // @testing-library/react). Los tests de libs algorítmicos se quedan en
    // node con el comment-pragma `/* @vitest-environment node */` al inicio
    // del archivo (evita el overhead de jsdom para funciones puras).
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
})
