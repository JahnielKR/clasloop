// ─── PctCircle.test.jsx (PR 166) ───────────────────────────────────────
// First-wave component test. PctCircle is SVG-based and purely
// presentational, so we assert the rendered percentage label. Color comes
// from CSS variables (C.red / C.orange = var(--c-…)), which jsdom does not
// resolve — so we don't assert on color here.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PctCircle from "../PctCircle";

describe("PctCircle", () => {
  it("renders the percentage label", () => {
    render(<PctCircle pct={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders a value in the warn band", () => {
    render(<PctCircle pct={42} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders the large size variant", () => {
    render(<PctCircle pct={88} size="lg" />);
    expect(screen.getByText("88%")).toBeInTheDocument();
  });
});
