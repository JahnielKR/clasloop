// Cleo renders for every mood, plays the right idle gesture when animated, and
// stays 100% static when animate={false} (the contract the rasterized OG relies
// on). jsdom doesn't run CSS animations, so we assert the gesture *classes/style
// element* are present — the live motion is verified by hand in the app.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Cleo from "..";
import { EXPRESSION_NAMES } from "../expressions";

describe("Cleo", () => {
  it("renders an <svg> for every expression", () => {
    for (const name of EXPRESSION_NAMES) {
      const { container, unmount } = render(<Cleo expression={name} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    }
  });

  it("waves on the default happy face when animated", () => {
    const { container } = render(<Cleo expression="happy" animate />);
    expect(container.querySelector(".cleo-arm-wave")).toBeInTheDocument();
    expect(container.querySelector("style")).toBeInTheDocument();
  });

  it("plays the thinking gesture — chin stroke + floating thought dots", () => {
    const { container } = render(<Cleo expression="thinking" animate />);
    expect(container.querySelector(".cleo-arm-think")).toBeInTheDocument();
    expect(container.querySelector(".cleo-think-dots")).toBeInTheDocument();
  });

  it("keeps both arms down on sad — no arm gesture, just the tear", () => {
    const { container } = render(<Cleo expression="sad" animate />);
    expect(container.querySelector('[class*="cleo-arm-"]')).not.toBeInTheDocument();
  });

  it("is fully static when animate is false (OG-safe)", () => {
    const { container } = render(<Cleo expression="happy" animate={false} />);
    expect(container.querySelector("style")).not.toBeInTheDocument();
    expect(container.querySelector('[class*="cleo-arm-"]')).not.toBeInTheDocument();
  });

  it("flies both hands up on surprised and opens the mouth", () => {
    const { container } = render(<Cleo expression="surprised" animate />);
    expect(container.querySelectorAll('[class*="cleo-arm-gasp"]')).toHaveLength(2);
    expect(container.querySelector(".cleo-mouth-gasp")).toBeInTheDocument();
  });
});
