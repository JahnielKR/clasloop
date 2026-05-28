/* @vitest-environment node */
// Pure formatters used by Analytics Studio blocks. No React, no Intl
// where it can be helped (we keep it dumb so the snapshot is stable
// across locales — el sistema i18n del proyecto se aplica donde haga falta).

import { describe, it, expect } from "vitest";
import {
  formatPercent,
  formatDelta,
  formatNumber,
  formatDurationShort,
  formatRelativeDay,
} from "../formatters";

describe("formatPercent", () => {
  it("rounds and appends %", () => {
    expect(formatPercent(78.4)).toBe("78%");
    expect(formatPercent(78.6)).toBe("79%");
  });
  it("returns em-dash for null/undefined", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });
  it("supports 1 decimal place when asked", () => {
    expect(formatPercent(78.45, 1)).toBe("78.5%");
  });
});

describe("formatDelta", () => {
  it("prefixes + for positive, − for negative, uses unicode triangles", () => {
    expect(formatDelta(6)).toBe("▲ 6%");
    expect(formatDelta(-3)).toBe("▼ 3%");
    expect(formatDelta(0)).toBe("→ 0%");
  });
  it("returns em-dash for null", () => {
    expect(formatDelta(null)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats integers with thousand separator (en-US grouping)", () => {
    expect(formatNumber(1284)).toBe("1,284");
    expect(formatNumber(7)).toBe("7");
    expect(formatNumber(0)).toBe("0");
  });
  it("em-dash for null", () => {
    expect(formatNumber(null)).toBe("—");
  });
});

describe("formatDurationShort", () => {
  it("ms → human-readable short string", () => {
    expect(formatDurationShort(450)).toBe("0.4s");
    expect(formatDurationShort(1500)).toBe("1.5s");
    expect(formatDurationShort(65000)).toBe("1m 5s");
    expect(formatDurationShort(3650000)).toBe("60m 50s");
  });
  it("em-dash for 0 / null", () => {
    expect(formatDurationShort(0)).toBe("—");
    expect(formatDurationShort(null)).toBe("—");
  });
});

describe("formatRelativeDay", () => {
  it("'hoy' / 'ayer' / 'hace Nd' for recent dates", () => {
    const now = new Date("2026-05-28T10:00:00Z");
    expect(formatRelativeDay(new Date("2026-05-28T08:00:00Z"), now)).toBe("hoy");
    expect(formatRelativeDay(new Date("2026-05-27T08:00:00Z"), now)).toBe("ayer");
    expect(formatRelativeDay(new Date("2026-05-20T08:00:00Z"), now)).toBe("hace 8d");
  });
  it("'—' for null/undefined", () => {
    expect(formatRelativeDay(null)).toBe("—");
  });
  it("'hace Nd' beyond a year stays as days (we don't go fancy in F1)", () => {
    const now = new Date("2026-05-28T10:00:00Z");
    expect(formatRelativeDay(new Date("2025-05-28T10:00:00Z"), now)).toBe("hace 365d");
  });
});
