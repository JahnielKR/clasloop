// ─── ErrorFallback.test.jsx (PR 166) ───────────────────────────────────
// Covers language detection (default en + <html lang> override), the retry
// action, and the optional Sentry event-id line. We do NOT click "Go to
// home" — it sets window.location, which jsdom does not implement.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorFallback from "../ErrorFallback";

describe("ErrorFallback", () => {
  beforeEach(() => {
    document.documentElement.lang = "";
    try {
      localStorage.clear();
    } catch {
      /* localStorage may be unavailable */
    }
  });

  it("renders the English copy by default", () => {
    render(<ErrorFallback error={new Error("x")} resetError={() => {}} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("localizes to Spanish from <html lang>", () => {
    document.documentElement.lang = "es";
    render(<ErrorFallback error={new Error("x")} resetError={() => {}} />);
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
  });

  it("calls resetError when 'Try again' is clicked", async () => {
    const resetError = vi.fn();
    render(<ErrorFallback error={new Error("x")} resetError={resetError} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(resetError).toHaveBeenCalledTimes(1);
  });

  it("shows a shortened error id when Sentry provides one", () => {
    render(
      <ErrorFallback error={{ sentryEventId: "abcdef1234567890" }} resetError={() => {}} />
    );
    expect(screen.getByText(/Error ID: abcdef12/)).toBeInTheDocument();
  });
});
