import { defineConfig, devices } from "@playwright/test";

// ─── Playwright e2e config (PR 167, H22 part 2) ─────────────────────────────
// Boots the Vite dev server on :3000 and runs the specs in `e2e/` against it.
//
// Chromium only for now — fast + CI-friendly. Add firefox/webkit projects later
// if cross-browser coverage is needed.
//
// SCOPE: the public flows (e2e/public.spec.ts) run with no auth and write no
// data, so they pass against any deployment. The AUTHED flows
// (e2e/authed.spec.ts) are `test.skip` until a dedicated TEST Supabase project +
// teacher creds exist — NEVER run them against prod (it would create real
// users/decks/sessions). See e2e/README.md.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
