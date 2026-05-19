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
// ─────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  // Relative paths: required for Capacitor, harmless for web hosting
  // (Vercel, Netlify, etc. también resuelven bien con ./).
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Asegurar que el output sigue siendo dist/ (default de Vite, y lo
    // que apunta capacitor.config.ts → webDir: "dist").
    outDir: 'dist',
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
