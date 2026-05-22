// ─── Vitest test setup (PR 166) ─────────────────────────────────────────
// Runs before every test file (registered via test.setupFiles in
// vite.config.js). Two jobs:
//   1. Register @testing-library/jest-dom matchers (toBeInTheDocument, …).
//   2. Unmount the React tree after each test so suites stay isolated.
//
// Also polyfills window.matchMedia, which jsdom does NOT implement. Several
// components call it at mount (useIsMobile → MobileMenuButton, responsive
// layout). Tests that need a specific result override window.matchMedia
// themselves before rendering.

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
