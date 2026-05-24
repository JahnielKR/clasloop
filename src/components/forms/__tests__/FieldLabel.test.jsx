import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FieldLabel } from "../FieldLabel";
import { TYPE } from "../../tokens";

describe("FieldLabel", () => {
  it("renders its text and wires htmlFor", () => {
    const { container } = render(<FieldLabel htmlFor="title">Title</FieldLabel>);
    const label = container.querySelector("label");
    expect(label).toBeTruthy();
    expect(label.getAttribute("for")).toBe("title");
    expect(label.textContent).toBe("Title");
  });

  it("appends a ' *' affordance when required", () => {
    const { container } = render(<FieldLabel required>Name</FieldLabel>);
    expect(container.querySelector("label").textContent).toBe("Name *");
  });

  it("uses the standard label type by default and the dense type when asked", () => {
    const { container: a } = render(<FieldLabel>Std</FieldLabel>);
    expect(a.querySelector("label").style.fontSize).toBe(`${TYPE.label.fontSize}px`);

    const { container: b } = render(<FieldLabel dense>Dense</FieldLabel>);
    expect(b.querySelector("label").style.fontSize).toBe(`${TYPE.labelDense.fontSize}px`);
  });
});
