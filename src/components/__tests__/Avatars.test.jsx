// ─── Avatars.test.jsx (PR 166) ─────────────────────────────────────────
// Mix of pure-helper tests (getAvatarById / getDefaultAvatarFor /
// describeUnlock) and a couple of <Avatar> render assertions.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Avatar, { getAvatarById, getDefaultAvatarFor, describeUnlock } from "../Avatars";

describe("Avatars helpers", () => {
  it("getAvatarById returns the matching avatar", () => {
    expect(getAvatarById("loopy")).toMatchObject({ id: "loopy", rarity: "common" });
  });

  it("getAvatarById returns null for an unknown id", () => {
    expect(getAvatarById("does-not-exist")).toBeNull();
  });

  it("getDefaultAvatarFor is stable per seed and returns a starter", () => {
    const a = getDefaultAvatarFor("teacher-42");
    const b = getDefaultAvatarFor("teacher-42");
    expect(a.id).toBe(b.id);
    expect(a.starter).toBe(true);
  });

  it("describeUnlock formats conditions per language", () => {
    expect(describeUnlock({ type: "sessions", count: 3 }, "en")).toBe("Complete 3 sessions");
    expect(describeUnlock({ type: "streak", days: 7 }, "es")).toBe(
      "Mantén una racha de 7 días"
    );
  });
});

describe("Avatar component", () => {
  it("renders the localized avatar name when showName is set", () => {
    render(<Avatar id="phoenix" showName lang="es" size={64} />);
    expect(screen.getByText("Fénix")).toBeInTheDocument();
  });

  it("renders an uploaded photo as a background image", () => {
    const { container } = render(<Avatar photoUrl="https://cdn.test/p.png" size={48} />);
    const node = container.querySelector("div");
    expect(node).toBeTruthy();
    expect(node.style.backgroundImage).toContain("p.png");
  });
});
