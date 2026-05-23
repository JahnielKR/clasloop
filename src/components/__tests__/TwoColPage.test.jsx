import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TwoColPage from "../TwoColPage";

describe("TwoColPage", () => {
  it("renders both the main content and the rail when a rail is provided", () => {
    render(
      <TwoColPage rail={<div>RAIL_CONTENT</div>}>
        <div>MAIN_CONTENT</div>
      </TwoColPage>
    );
    expect(screen.getByText("MAIN_CONTENT")).toBeInTheDocument();
    expect(screen.getByText("RAIL_CONTENT")).toBeInTheDocument();
  });

  it("renders only the main content when there is no rail", () => {
    const { container } = render(
      <TwoColPage rail={null}>
        <div>MAIN_ONLY</div>
      </TwoColPage>
    );
    expect(screen.getByText("MAIN_ONLY")).toBeInTheDocument();
    // Without a rail it degrades to the bare content — no grid wrapper.
    expect(container.querySelector(".cl-tcp-rail")).toBeNull();
  });

  it("accepts the content via the `main` prop as an alternative to children", () => {
    render(<TwoColPage main={<div>VIA_PROP</div>} rail={<div>R</div>} />);
    expect(screen.getByText("VIA_PROP")).toBeInTheDocument();
  });
});
