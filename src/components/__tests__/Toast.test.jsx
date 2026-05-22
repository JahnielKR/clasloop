// ─── Toast.test.jsx (PR 166) ───────────────────────────────────────────
// Covers the accessibility role (alert vs status), message rendering, the
// optional action button, and the close → onDismiss path. Timer-based
// auto-dismiss (4–8s) is intentionally not exercised here.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toast from "../Toast";

describe("Toast", () => {
  it("renders the message", () => {
    render(<Toast id="t1" message="Saved!" onDismiss={() => {}} />);
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("uses role=alert for the error variant", () => {
    render(<Toast id="t1" variant="error" message="Boom" onDismiss={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
  });

  it("uses role=status for non-error variants", () => {
    render(<Toast id="t1" variant="success" message="Yay" onDismiss={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Yay");
  });

  it("renders the optional action and fires its onClick", async () => {
    const onClick = vi.fn();
    render(
      <Toast
        id="t1"
        message="Deleted"
        action={{ label: "Undo", onClick }}
        duration={0}
        onDismiss={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss with its id when the close button is clicked", async () => {
    const onDismiss = vi.fn();
    render(<Toast id="t9" message="Bye" duration={0} onDismiss={onDismiss} />);
    // Wait for the entering animation (requestAnimationFrame) to settle into
    // the "visible" phase first — otherwise the pending rAF can revert the
    // "leaving" state set by the click and cancel the dismiss timer.
    const toast = screen.getByRole("status");
    await waitFor(() => expect(toast).toHaveStyle({ opacity: "1" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith("t9"));
  });
});
