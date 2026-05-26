/* @vitest-environment jsdom */
// ─── ai-images.test.js ───────────────────────────────────────────────────
// Track A (A-img-3): unit tests for the pure orchestration in ai-images.js —
// coverage selection (how many of the tagged questions get an image), the
// per-batch cap, image_prompt stripping, the concept passthrough, and the
// found/selected/generated/dropped accounting with the "se va todo" drop rule.
// The network call and the Storage upload are mocked; the server-side image
// judge is not exercised here (the real flow needs a live key — verified in
// preview). A missing image in the response (judge reject or failure) is what
// triggers a drop, which we simulate directly.

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

  it("sets image_url on a tagged question, strips image_prompt, sends the concept", async () => {
    const qs = [
      { type: "mcq", q: "A", image_prompt: "a cell diagram" },
      { type: "tf", q: "B" },
    ];
    const res = await generateQuestionImages(qs, AUTH);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(uploadDeckCover).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ found: 1, selected: 1, generated: 1, dropped: 0 });
    expect(res.questions[0]).toEqual({ type: "mcq", q: "A", image_url: "https://cdn/img.jpg" });
    expect("image_prompt" in res.questions[0]).toBe(false);
    expect(res.questions[1]).toEqual({ type: "tf", q: "B" });
    // The question stem ("q") is sent as the judge's reference concept.
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ prompt: "a cell diagram", concept: "A" });
  });

  it("'some' coverage (default) renders ~30% of the questions", async () => {
    const qs = Array.from({ length: 10 }, (_, i) => ({ type: "mcq", q: `Q${i}`, image_prompt: `illustration ${i}` }));
    const res = await generateQuestionImages(qs, AUTH);
    expect(fetchMock).toHaveBeenCalledTimes(3); // ceil(0.30 * 10)
    expect(res).toMatchObject({ found: 10, selected: 3, generated: 3, dropped: 0 });
    expect(res.questions.filter((q) => q.image_url).length).toBe(3);
    expect(res.questions.every((q) => !("image_prompt" in q))).toBe(true);
  });

  it("'about' mode renders every tagged question, ignoring the 30% target", async () => {
    const qs = Array.from({ length: 10 }, (_, i) => ({ type: "mcq", q: `Q${i}`, image_prompt: `illustration ${i}` }));
    const res = await generateQuestionImages(qs, { ...AUTH, mode: "about" });
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(res).toMatchObject({ found: 10, selected: 10, generated: 10, dropped: 0 });
  });

  it("'all' coverage caps the number generated at max", async () => {
    const qs = Array.from({ length: 9 }, (_, i) => ({ type: "mcq", q: `Q${i}`, image_prompt: `illustration number ${i}` }));
    const res = await generateQuestionImages(qs, { ...AUTH, max: 6, coverage: "all" });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(res).toMatchObject({ found: 9, selected: 6, generated: 6, dropped: 0 });
    // Exactly 6 questions got an image; the rest only had their prompt stripped.
    expect(res.questions.filter((q) => q.image_url).length).toBe(6);
    expect(res.questions.every((q) => !("image_prompt" in q))).toBe(true);
  });

  it("drops the question entirely when its image fails to generate", async () => {
    fetchMock = vi.fn()
      .mockResolvedValueOnce(okImageResponse())
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const qs = [
      { type: "mcq", q: "A", image_prompt: "prompt zero" },
      { type: "mcq", q: "B", image_prompt: "prompt one" },
    ];
    const res = await generateQuestionImages(qs, { ...AUTH, coverage: "all" });
    expect(res).toMatchObject({ found: 2, selected: 2, generated: 1, dropped: 1 });
    // "Se va todo": the question whose image failed is removed entirely.
    expect(res.questions).toHaveLength(1);
    expect(res.questions[0]).toEqual({ type: "mcq", q: "A", image_url: "https://cdn/img.jpg" });
  });

  it("drops the question when the judge rejects the image (no image in response)", async () => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rejected: true, reason: "off-topic" }) });
    vi.stubGlobal("fetch", fetchMock);
    const qs = [{ type: "mcq", q: "A", image_prompt: "prompt zero" }];
    const res = await generateQuestionImages(qs, { ...AUTH, coverage: "all" });
    expect(uploadDeckCover).not.toHaveBeenCalled();
    expect(res).toMatchObject({ found: 1, selected: 1, generated: 0, dropped: 1 });
    expect(res.questions).toHaveLength(0);
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
