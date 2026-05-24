// ─── Modal-primitive migration: a11y contract ──────────────────────────
// Guards the wrapper-swap that moved the hand-rolled modals onto the shared
// Modal primitive. The primitive owns focus-trap / return-focus / Escape /
// scroll-lock (covered by Modal.test.jsx); these tests assert each migrated
// modal is correctly WIRED to it: a labelled dialog role, and the right
// dismiss behaviour (Escape closes the normal ones, but the ClassCode gate
// deliberately stays put).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditClassModal from "../EditClassModal";
import DeleteAccountModal from "../DeleteAccountModal";
import ClassCodeModal from "../ClassCodeModal";
import LobbyThemeSelector from "../LobbyThemeSelector";
import { CloseUnitConfirmModal } from "../CloseUnitFlow";

describe("Modal-primitive migration — a11y contract", () => {
  it("EditClassModal exposes a labelled dialog", () => {
    render(
      <EditClassModal
        classObj={{ id: "c1", name: "Math 6", subject: "Math", grade: "6" }}
        t={{}}
        onClose={() => {}}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "editclass-title");
    expect(document.getElementById("editclass-title")).toBeInTheDocument();
  });

  it("DeleteAccountModal is an alertdialog that Escape can close", () => {
    const onClose = vi.fn();
    render(
      <DeleteAccountModal open profile={{ role: "teacher" }} lang="en" onClose={onClose} />
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "delete-account-title");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ClassCodeModal stays open on Escape (deliberate no-dismiss gate)", () => {
    render(
      <ClassCodeModal profile={{ id: "s1", full_name: "Ana" }} lang="en" onJoined={() => {}} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "class-code-modal-title");
    fireEvent.keyDown(document, { key: "Escape" });
    // No onClose wired + closeOnEscape disabled → the gate must remain.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("LobbyThemeSelector exposes a labelled dialog that Escape closes", () => {
    const onClose = vi.fn();
    render(<LobbyThemeSelector classId="c1" currentTheme="calm" lang="en" onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "lobbytheme-title");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("CloseUnitConfirmModal exposes a labelled dialog that Escape closes", () => {
    const onCancel = vi.fn();
    render(
      <CloseUnitConfirmModal open unit={{ name: "Unit 1" }} lang="en" onCancel={onCancel} onContinue={() => {}} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "closeunit-confirm-title");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
