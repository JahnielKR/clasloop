// ─── MobileMenuButton.test.jsx (PR 166) ────────────────────────────────
// The button only renders on mobile (matchMedia max-width:768px) AND when an
// onOpen handler is supplied. We drive window.matchMedia per test to control
// the viewport.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MobileMenuButton from "../MobileMenuButton";

function setViewport(isMobile) {
  window.matchMedia = (query) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

describe("MobileMenuButton", () => {
  it("renders the hamburger on mobile and fires onOpen when clicked", async () => {
    setViewport(true);
    const onOpen = vi.fn();
    render(<MobileMenuButton onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders nothing on desktop", () => {
    setViewport(false);
    render(<MobileMenuButton onOpen={() => {}} />);
    expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
  });

  it("renders nothing when no onOpen handler is provided", () => {
    setViewport(true);
    render(<MobileMenuButton />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
