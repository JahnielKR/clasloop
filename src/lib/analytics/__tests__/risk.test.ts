/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { riskScore, classifyRisk } from "../risk";

describe("riskScore", () => {
  it("returns score 0 + low + no reasons for a perfect student", () => {
    const r = riskScore({
      recentPctCorrect: 95,
      weeklyPctCorrect: [80, 85, 90, 95],
      recentParticipation: 100,
      daysSinceLastActivity: 0,
    });
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
    expect(r.reasons).toEqual([]);
  });

  it("flags low recent pct as a reason and adds points", () => {
    const r = riskScore({
      recentPctCorrect: 35,
      weeklyPctCorrect: [60, 55, 50, 35],
      recentParticipation: 100,
      daysSinceLastActivity: 1,
    });
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.some((s) => s.toLowerCase().includes("correcto") || s.toLowerCase().includes("rendimiento"))).toBe(true);
  });

  it("flags downward slope (declining trend)", () => {
    const r = riskScore({
      recentPctCorrect: 60,
      weeklyPctCorrect: [80, 75, 65, 55],
      recentParticipation: 100,
      daysSinceLastActivity: 0,
    });
    expect(r.reasons.some((s) => s.toLowerCase().includes("baja") || s.toLowerCase().includes("cae"))).toBe(true);
  });

  it("flags inactive student", () => {
    const r = riskScore({
      recentPctCorrect: 70,
      weeklyPctCorrect: [70, 70, 70],
      recentParticipation: 50,
      daysSinceLastActivity: 21,
    });
    expect(r.reasons.some((s) => s.toLowerCase().includes("día") || s.toLowerCase().includes("inactivo"))).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(20);
  });

  it("flags low participation", () => {
    const r = riskScore({
      recentPctCorrect: 75,
      weeklyPctCorrect: [75, 75],
      recentParticipation: 30,
      daysSinceLastActivity: 2,
    });
    expect(r.reasons.some((s) => s.toLowerCase().includes("participa"))).toBe(true);
  });

  it("caps the score at 100", () => {
    const r = riskScore({
      recentPctCorrect: 10,
      weeklyPctCorrect: [60, 50, 30, 10],
      recentParticipation: 5,
      daysSinceLastActivity: 60,
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.level).toBe("high");
  });

  it("handles missing inputs gracefully (returns score 0 + low)", () => {
    const r = riskScore({
      recentPctCorrect: null,
      weeklyPctCorrect: [],
      recentParticipation: null,
      daysSinceLastActivity: null,
    });
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
  });
});

describe("classifyRisk", () => {
  it("low under 30", () => {
    expect(classifyRisk(0)).toBe("low");
    expect(classifyRisk(29)).toBe("low");
  });
  it("med 30-59", () => {
    expect(classifyRisk(30)).toBe("med");
    expect(classifyRisk(59)).toBe("med");
  });
  it("high 60+", () => {
    expect(classifyRisk(60)).toBe("high");
    expect(classifyRisk(100)).toBe("high");
  });
});
