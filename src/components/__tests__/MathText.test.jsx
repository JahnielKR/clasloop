/* @vitest-environment jsdom */
// ─── MathText.test.jsx ───────────────────────────────────────────────────
// Track A (A1): verifies the on-screen renderer actually drives KaTeX (without
// a browser) — plain text stays plain, $…$ becomes a .katex node, $$…$$ becomes
// a .katex-display block, and the surrounding prose is preserved.

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MathText from "../MathText";

describe("MathText", () => {
  it("renders plain text with no KaTeX markup", () => {
    const { container } = render(<MathText text="hello world" />);
    expect(container.textContent).toBe("hello world");
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("renders an inline $…$ segment via KaTeX and keeps the prose", () => {
    const { container } = render(<MathText text="value $x^2$ end" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain("value ");
    expect(container.textContent).toContain(" end");
  });

  it("renders $$…$$ as a display block", () => {
    const { container } = render(<MathText text="$$a+b$$" />);
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("accepts the string as children", () => {
    const { container } = render(<MathText>{"$x$"}</MathText>);
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("renders via a custom tag", () => {
    const { container } = render(<MathText as="h2" text="title" />);
    expect(container.querySelector("h2")).not.toBeNull();
  });
});
