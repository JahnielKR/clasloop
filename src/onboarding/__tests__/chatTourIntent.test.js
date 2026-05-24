// Unit test for the chat's deterministic "give me a tour of X" parser.
import { describe, it, expect } from "vitest";
import { detectTourIntent } from "../chatTourIntent";

describe("detectTourIntent", () => {
  it("detects a library tour request in en + es", () => {
    expect(detectTourIntent("show me the library")).toBe("library");
    expect(detectTourIntent("guíame por la biblioteca")).toBe("library");
  });

  it("is accent-insensitive", () => {
    expect(detectTourIntent("guiame por la biblioteca")).toBe("library");
    expect(detectTourIntent("muéstrame el escáner")).toBe("scanner");
  });

  it("maps topics to the right tour", () => {
    expect(detectTourIntent("how does the deck editor work")).toBe("deckEditor");
    expect(detectTourIntent("tour de resultados")).toBe("insights");
    expect(detectTourIntent("dame un tour para crear una clase")).toBe("home");
  });

  it("works in Korean", () => {
    expect(detectTourIntent("라이브러리 보여줘")).toBe("library");
  });

  it("requires a launch verb — a bare mention is not a request", () => {
    expect(detectTourIntent("the library is great")).toBeNull();
    expect(detectTourIntent("")).toBeNull();
    expect(detectTourIntent("my students love the scanner")).toBeNull();
  });

  it("returns null for a tour request with no known topic (chat then explains)", () => {
    expect(detectTourIntent("give me a tour of the settings page")).toBeNull();
  });
});
