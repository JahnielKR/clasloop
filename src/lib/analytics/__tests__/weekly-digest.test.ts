/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { computeWeeklyDigest, renderDigestHtml } from "../weekly-digest";

describe("computeWeeklyDigest", () => {
  it("aggregates week totals + best class", () => {
    const sessions = [
      { id: "s1", class_id: "a", status: "completed" },
      { id: "s2", class_id: "a", status: "completed" },
      { id: "s3", class_id: "b", status: "completed" },
    ];
    const responses = [
      { session_id: "s1", class_id: "a", points: 1, max_points: 1, is_correct: true },
      { session_id: "s1", class_id: "a", points: 0, max_points: 1, is_correct: false },
      { session_id: "s3", class_id: "b", points: 1, max_points: 1, is_correct: true },
    ];
    const classes = [{ id: "a", name: "5to A" }, { id: "b", name: "5to B" }];
    const d = computeWeeklyDigest({ sessions, responses, classes });
    expect(d.sessions_count).toBe(3);
    expect(d.responses_count).toBe(3);
    expect(d.pct_correct).toBeCloseTo(67, 0);
    expect(d.top_class?.name).toBe("5to A");
    expect(d.has_activity).toBe(true);
  });
  it("flags no activity for an empty week", () => {
    const d = computeWeeklyDigest({ sessions: [], responses: [], classes: [] });
    expect(d.has_activity).toBe(false);
    expect(d.pct_correct).toBeNull();
  });
});

describe("renderDigestHtml", () => {
  it("includes the teacher name and the totals", () => {
    const html = renderDigestHtml({
      teacherName: "Pedro",
      digest: {
        sessions_count: 3,
        responses_count: 50,
        pct_correct: 72,
        top_class: { name: "5to A", response_count: 30 },
        has_activity: true,
      },
    });
    expect(html).toContain("Pedro");
    expect(html).toContain("3");
    expect(html).toContain("72");
    expect(html).toContain("5to A");
  });
  it("renders a calm no-activity message", () => {
    const html = renderDigestHtml({
      teacherName: "Pedro",
      digest: { sessions_count: 0, responses_count: 0, pct_correct: null, top_class: null, has_activity: false },
    });
    expect(html.toLowerCase()).toContain("sin actividad");
  });
  it("escapes HTML in the teacher name (XSS guard)", () => {
    const html = renderDigestHtml({
      teacherName: '<script>alert(1)</script>',
      digest: { sessions_count: 1, responses_count: 1, pct_correct: 50, top_class: null, has_activity: true },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
