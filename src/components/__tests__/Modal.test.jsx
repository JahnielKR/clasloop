// ─── Modal.test.jsx (PR 146) ───────────────────────────────────────────
// Regression net for the Modal primitive's a11y mechanics: dialog role (+
// override), aria-modal, Escape close + the canClose guard, backdrop close,
// focus trap (Tab / Shift+Tab cycling), and return-focus on close. These were
// also smoke-tested live in a browser during PR 146; this keeps them honest.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "../Modal";
import { SCRIM } from "../tokens";

function renderOpen(props = {}) {
  return render(
    <Modal open onClose={() => {}} ariaLabelledBy="t" {...props}>
      <h2 id="t">Title</h2>
      <button>First</button>
      <button>Middle</button>
      <button>Last</button>
    </Modal>
  );
}

describe("Modal", () => {
  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>hi</p>
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders role=dialog with aria-modal and aria-labelledby", () => {
    renderOpen();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "t");
  });

  it("honors a custom role (alertdialog)", () => {
    renderOpen({ role: "alertdialog" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  // Ola 5 part 2: the default backdrop must resolve to the shared SCRIM token,
  // so every modal that relies on the default (or references SCRIM in a custom
  // backdropStyle) shares one overlay tint. Guards against DEFAULT_BACKDROP
  // drifting back to a hand-eyeballed rgba.
  it("paints the default backdrop with the shared SCRIM token", () => {
    renderOpen();
    const backdrop = screen.getByRole("dialog").parentElement;
    const norm = (s) => (s || "").replace(/\s/g, "");
    expect(norm(backdrop.style.background)).toBe(norm(SCRIM));
  });

  it("moves initial focus into the dialog", () => {
    renderOpen();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderOpen({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape when canClose is false", () => {
    const onClose = vi.fn();
    renderOpen({ onClose, canClose: false });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on backdrop click but not on content click", () => {
    const onClose = vi.fn();
    renderOpen({ onClose });
    fireEvent.mouseDown(screen.getByText("Title")); // inside the dialog → ignored
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement); // backdrop → close
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // M18 (PR 148): the backdrop closes on mouse only and is a roleless <div>, so
  // it must NOT be a keyboard tab stop — otherwise keyboard users would land on
  // a clickable element a screen reader can't describe. Their close path is
  // Escape (asserted here too). The focus-trap test alone would NOT catch a
  // focusable backdrop, since the trap only cycles focusables inside the dialog.
  it("M18: backdrop is not a keyboard tab stop; Escape is the keyboard close", () => {
    const onClose = vi.fn();
    renderOpen({ onClose });
    const backdrop = screen.getByRole("dialog").parentElement;
    expect(backdrop).not.toHaveAttribute("tabindex");
    expect(backdrop.tabIndex).toBe(-1); // default for a non-focusable div
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab within the dialog (last→first, first→last)", () => {
    renderOpen();
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("returns focus to the previously-focused element on close", () => {
    function Wrapper({ open }) {
      return (
        <>
          <button data-testid="trigger">trigger</button>
          <Modal open={open} onClose={() => {}}>
            <button>inside</button>
          </Modal>
        </>
      );
    }
    const { rerender } = render(<Wrapper open={false} />);
    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(<Wrapper open={true} />);
    expect(document.activeElement).toBe(screen.getByText("inside"));

    rerender(<Wrapper open={false} />);
    expect(document.activeElement).toBe(trigger);
  });
});
