import { describe, it, expect } from "vitest";
// La lib vive en api/_lib (server-side, bundled con la función serverless).
import { diffRawVsFinal } from "../../../api/_lib/ai-gold.js";

describe("diffRawVsFinal", () => {
  it("counts a kept question as accepted (exact text, ignores editor-added fields)", () => {
    const raw = [{ q: "What is 2+2?", options: ["3", "4"], correct: 1 }];
    // el editor normaliza y añade `multi`/`time_limit` — sigue siendo accepted
    const final = [{ q: "What is 2+2?", options: ["3", "4"], correct: 1, multi: false, time_limit: 30 }];
    expect(diffRawVsFinal(raw, final)).toEqual({ accepted: 1, edited: 0, discarded: 0 });
  });

  it("counts a reworded question as edited (similar text)", () => {
    const raw = [{ q: "Capital of France?" }];
    const final = [{ q: "What is the capital of France?" }];
    const r = diffRawVsFinal(raw, final);
    expect(r.accepted).toBe(0);
    expect(r.edited).toBe(1);
    expect(r.discarded).toBe(0);
  });

  it("counts a dropped question as discarded", () => {
    const raw = [{ q: "What is photosynthesis?" }, { q: "Define mitosis" }];
    const final = [{ q: "What is photosynthesis?" }];
    expect(diffRawVsFinal(raw, final)).toEqual({ accepted: 1, edited: 0, discarded: 1 });
  });

  it("supports the `question`/`prompt` text fields too", () => {
    const raw = [{ question: "Name a noble gas" }];
    const final = [{ prompt: "Name a noble gas" }];
    expect(diffRawVsFinal(raw, final).accepted).toBe(1);
  });

  it("handles empty / missing text and empty arrays", () => {
    expect(diffRawVsFinal([{ q: "" }], [])).toEqual({ accepted: 0, edited: 0, discarded: 1 });
    expect(diffRawVsFinal([], [])).toEqual({ accepted: 0, edited: 0, discarded: 0 });
    expect(diffRawVsFinal(null, null)).toEqual({ accepted: 0, edited: 0, discarded: 0 });
  });
});
