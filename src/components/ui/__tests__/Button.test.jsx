import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../Button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("applies the variant + size classes", () => {
    render(<Button variant="gradient" size="lg">Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveClass("ui-btn", "ui-btn--gradient", "ui-btn--lg");
  });

  it("falls back to primary/md for unknown variant/size", () => {
    render(<Button variant="bogus" size="huge">X</Button>);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn).toHaveClass("ui-btn--primary", "ui-btn--md");
  });

  it("calls onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled, marked busy, and unclickable while loading", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Saving</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects the disabled prop", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>No</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("adds the full-width class when fullWidth is set", () => {
    render(<Button fullWidth>W</Button>);
    expect(screen.getByRole("button")).toHaveClass("ui-btn--block");
  });

  it("uses the solid tone class (overriding the variant) when tone is set", () => {
    render(<Button tone="success" variant="primary">Correct</Button>);
    const btn = screen.getByRole("button", { name: "Correct" });
    expect(btn).toHaveClass("ui-btn", "ui-btn--tone-success");
    expect(btn).not.toHaveClass("ui-btn--primary");
  });

  it("ignores an unknown tone and keeps the variant", () => {
    render(<Button tone="bogus" variant="secondary">X</Button>);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn).toHaveClass("ui-btn--secondary");
    expect(btn).not.toHaveClass("ui-btn--tone-bogus");
  });
});
