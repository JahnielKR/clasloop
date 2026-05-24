// Cleo renders for every mood, drives her idle "life" via motion/react when
// animated, and stays 100% static when animate={false} (the contract the
// rasterized OG relies on). jsdom can't run the actual motion, so we assert the
// structure the motion hook targets (data-cleo groups), her signature ribbon, and
// that both the animated and static paths render without crashing — the live
// motion is verified by hand in the app.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Cleo from "..";
import { EXPRESSION_NAMES } from "../expressions";

describe("Cleo", () => {
  it("renders an <svg> for every expression (animated)", () => {
    for (const name of EXPRESSION_NAMES) {
      const { container, unmount } = render(<Cleo expression={name} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    }
  });

  it("wears her gold ribbon — her signature", () => {
    const { container } = render(<Cleo animate={false} />);
    expect(container.querySelector('linearGradient[id^="cleo-gold"]')).toBeInTheDocument();
  });

  it("exposes the groups the motion hook drives (lean, glance, blink)", () => {
    const { container } = render(<Cleo expression="happy" animate={false} />);
    expect(container.querySelector('[data-cleo="lean"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cleo="look"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cleo="blink"]')).toBeInTheDocument();
  });

  it("is static & OG-safe when animate is false (no injected <style>)", () => {
    const { container } = render(<Cleo expression="cheer" animate={false} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("style")).not.toBeInTheDocument();
  });
});
