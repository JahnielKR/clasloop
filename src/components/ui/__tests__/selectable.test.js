import { describe, it, expect } from "vitest";
import { C } from "../../tokens";
import {
  selectableCard,
  selectableChip,
  selectableTab,
  selectedCheckStyle,
} from "../selectable";

describe("selectable recipe", () => {
  it("selectableCard: accent frame when selected, neutral when not — constant 1.5px border (no reflow)", () => {
    const on = selectableCard(true);
    expect(on.background).toBe(C.accentSoft);
    expect(on.border).toBe(`1.5px solid ${C.accent}`);

    const off = selectableCard(false);
    expect(off.background).toBe(C.bg);
    expect(off.border).toBe(`1.5px solid ${C.border}`);
  });

  it("selectableCard: honours a custom accent + soft tint (e.g. a class color)", () => {
    const on = selectableCard(true, { accent: "#FF5A5F", accentSoft: "#FF5A5F1A" });
    expect(on.background).toBe("#FF5A5F1A");
    expect(on.border).toBe("1.5px solid #FF5A5F");
  });

  it("selectableChip: tints bg, border, and label together", () => {
    const on = selectableChip(true);
    expect(on.background).toBe(C.accentSoft);
    expect(on.border).toBe(`1px solid ${C.accent}`);
    expect(on.color).toBe(C.accent);

    const off = selectableChip(false);
    expect(off.background).toBe("transparent");
    expect(off.color).toBe(C.textSecondary);
  });

  it("selectableTab: constant 2px underline (transparent when idle) so the row never shifts", () => {
    const on = selectableTab(true);
    expect(on.borderBottom).toBe(`2px solid ${C.accent}`);
    expect(on.color).toBe(C.accent);

    const off = selectableTab(false);
    expect(off.borderBottom).toBe("2px solid transparent");
    expect(off.color).toBe(C.textSecondary);
  });

  it("selectedCheckStyle: accent circle with a white glyph", () => {
    const s = selectedCheckStyle();
    expect(s.background).toBe(C.accent);
    expect(s.color).toBe("#fff");
    expect(s.borderRadius).toBe("50%");
  });
});
