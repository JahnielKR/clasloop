import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── Vite configuration ─────────────────────────────────────────────────
// PR 50 (FASE 1 Capacitor): agregado `base: './'` para que el build
// genere rutas relativas. Capacitor sirve los archivos desde el
// filesystem nativo (file:// o capacitor:// schemes), donde rutas
// absolutas (/assets/...) no resuelven. Con './' funciona tanto en
// el dev server como en el WebView nativo.
//
// PR 70: agregada sección `test` para Vitest. Los tests viven en
// src/**/__tests__/*.test.js. Correr con `npm test` (watch mode) o
// `npm run test:run` (single run, para CI).
//
// PR 88 (bundle slimming): ver bloque `build.rollupOptions` abajo.
//   - external: saca html2canvas + dompurify + canvg del bundle
//   - manualChunks: separa libs vendor en chunks cacheables
//   Resultado medido: chunk principal 984 KB → 414 KB, Decks 1180 → 818 KB.
// ─────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  // Relative paths: required for Capacitor, harmless for web hosting
  // (Vercel, Netlify, etc. también resuelven bien con ./).
  base: './',
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
      // PR 88: html2canvas, dompurify y canvg están listados como
      // optionalDependencies de jsPDF. jsPDF SOLO los importa si llamás
      // doc.html() (renderizar HTML a PDF). Clasloop nunca usa doc.html()
      // — solo doc.addImage() con dataURLs. Así que esas 3 libs son
      // ~220 KB de código muerto en el bundle.
      //
      // IMPORTANTE: marcarlas external (en lugar de borrarlas de
      // package.json) es la forma correcta. Borrarlas del package.json
      // no sirve porque `npm install` las re-instala como optionalDeps
      // de jspdf. Acá le decimos a Rollup "no las metas en el bundle".
      external: ['html2canvas', 'dompurify', 'canvg'],

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
        },
      },

      // PR 88: silenciar el warning de Rollup "Failed to resolve import"
      // para las 3 deps que excluimos a propósito. jsPDF las importa
      // dinámicamente; sin esto Rollup tira un warning por cada una en
      // cada build aunque sea intencional.
      onwarn(warning, warn) {
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          ['html2canvas', 'dompurify', 'canvg'].includes(warning.source)
        ) {
          return
        }
        warn(warning)
      },
    },
  },
  // PR 70: Vitest config (mismo defineConfig que vite, Vitest lo lee).
  test: {
    // Default: tests en archivos *.test.{js,jsx,ts,tsx}
    // Convention: ponerlos en src/lib/__tests__/*.test.js
    // (Vitest los descubre automaticamente).
    globals: false,  // Forzar import explicit de { describe, it, expect }
    environment: 'node',  // Tests de funciones puras — no necesitamos jsdom
  },
})
