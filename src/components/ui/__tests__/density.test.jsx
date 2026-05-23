import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DensityProvider, useDensity } from "../density";

function Probe() {
  const { density, space } = useDensity();
  return <div data-testid="probe" data-density={density} data-lg={space.lg} />;
}

describe("density", () => {
  it("defaults to comfortable", () => {
    render(<Probe />);
    const el = screen.getByTestId("probe");
    expect(el).toHaveAttribute("data-density", "comfortable");
    expect(el).toHaveAttribute("data-lg", "16");
  });

  it("provides compact spacing inside a compact provider", () => {
    render(
      <DensityProvider value="compact">
        <Probe />
      </DensityProvider>
    );
    const el = screen.getByTestId("probe");
    expect(el).toHaveAttribute("data-density", "compact");
    expect(el).toHaveAttribute("data-lg", "12");
  });

  it("falls back to comfortable for an unknown value", () => {
    render(
      <DensityProvider value="bogus">
        <Probe />
      </DensityProvider>
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("data-density", "comfortable");
  });
});
