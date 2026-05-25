/* @vitest-environment jsdom */
// ─── ai-images.test.js ───────────────────────────────────────────────────
// Track A (A-img-3): unit tests for the pure orchestration in ai-images.js —
// which questions get an image, the per-batch cap, image_prompt stripping, and
// the found/generated/failed accounting. The network call and the Storage
// upload are mocked; this verifies the wiring, not Gemini itself (the real
// image flow needs a live key + a browser canvas, so it's verified in preview).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../deck-image-upload", () => ({
  uploadDeckCover: vi.fn(),
}));

import { generateQuestionImages } from "../ai-images";
import { uploadDeckCover } from "../deck-image-upload";

const AUTH = { accessToken: "jwt", userId: "teacher-1" };

// Content is irrelevant; only that atob() can decode it inside base64ToBlob.
const FAKE_B64 = btoa("fake-image-bytes");

function okImageResponse() {
  return { ok: true, json: async () => ({ image: FAKE_B64, mimeType: "image/png" }) };
}

let fetchMock;

beforeEach(() => {
  uploadDeckCover.mockReset();
  uploadDeckCover.mockResolvedValue({ url: "https://cdn/img.jpg" });
  fetchMock = vi.fn().mockResolvedValue(okImageResponse());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateQuestionImages", () => {
  it("no image_prompt → no network, prompts stripped, zero counts", async () => {
    const qs = [{ type: "mcq", q: "A" }, { type: "tf", q: "B" }];
    const res = await generateQuestionImages(qs, AUTH);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.found).toBe(0);
    expect(res.generated).toBe(0);
    expect(res.questions).toEqual(qs);
  });

  it("sets image_url on tagged questions and strips image_prompt", async () => {
    const qs = [
      { type: "mcq", q: "A", image_prompt: "a labeled cell diagram" },
      { type: "tf", q: "B" },
    ];
    const res = await generateQuestionImages(qs, AUTH);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(uploadDeckCover).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ found: 1, generated: 1, failed: 0 });
    expect(res.questions[0]).toEqual({ type: "mcq", q: "A", image_url: "https://cdn/img.jpg" });
    expect("image_prompt" in res.questions[0]).toBe(false);
    expect(res.questions[1]).toEqual({ type: "tf", q: "B" });
  });

  it("caps the number generated at max", async () => {
    const qs = Array.from({ length: 9 }, (_, i) => ({ type: "mcq", q: `Q${i}`, image_prompt: `illustration number ${i}` }));
    const res = await generateQuestionImages(qs, { ...AUTH, max: 6 });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(res.found).toBe(9);
    expect(res.generated).toBe(6);
    // First 6 got images; the rest only had their prompt stripped.
    expect(res.questions[0].image_url).toBe("https://cdn/img.jpg");
    expect(res.questions[8].image_url).toBeUndefined();
    expect("image_prompt" in res.questions[8]).toBe(false);
  });

  it("counts failures without dropping questions", async () => {
    fetchMock = vi.fn()
      .mockResolvedValueOnce(okImageResponse())
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const qs = [
      { type: "mcq", q: "A", image_prompt: "prompt zero" },
      { type: "mcq", q: "B", image_prompt: "prompt one" },
    ];
    const res = await generateQuestionImages(qs, AUTH);
    expect(res).toMatchObject({ found: 2, generated: 1, failed: 1 });
    expect(res.questions[0].image_url).toBe("https://cdn/img.jpg");
    expect(res.questions[1].image_url).toBeUndefined();
    expect("image_prompt" in res.questions[1]).toBe(false);
  });

  it("no-op without auth, but still strips prompts", async () => {
    const qs = [{ type: "mcq", q: "A", image_prompt: "a valid prompt" }];
    const res = await generateQuestionImages(qs, { accessToken: "", userId: "" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.questions[0]).toEqual({ type: "mcq", q: "A" });
    expect(res.found).toBe(0);
  });

  it("ignores blank/whitespace image_prompt", async () => {
    const qs = [
      { type: "mcq", q: "A", image_prompt: "   " },
      { type: "mcq", q: "B", image_prompt: "" },
    ];
    const res = await generateQuestionImages(qs, AUTH);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.found).toBe(0);
    expect("image_prompt" in res.questions[0]).toBe(false);
  });
});
