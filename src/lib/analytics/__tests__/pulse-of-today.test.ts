/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  computeTodayPulse,
  topClassByActivity,
  topStudentByPctCorrect,
} from "../pulse-of-today";

const today = "2026-05-29T10:00:00.000Z";

describe("topClassByActivity", () => {
  it("returns the class with the most responses today", () => {
    const responses = [
      { class_id: "a", session_id: "s1" },
      { class_id: "a", session_id: "s1" },
      { class_id: "b", session_id: "s2" },
    ];
    const classes = [
      { id: "a", name: "5to A" },
      { id: "b", name: "5to B" },
    ];
    expect(topClassByActivity(responses, classes)).toEqual({
      id: "a",
      name: "5to A",
      response_count: 2,
    });
  });
  it("returns null when no responses", () => {
    expect(topClassByActivity([], [{ id: "a", name: "x" }])).toBeNull();
  });
  it("falls back to id if class name missing", () => {
    const r = topClassByActivity([{ class_id: "x" }], []);
    expect(r?.name).toBe("x");
  });
});

describe("topStudentByPctCorrect", () => {
  it("returns the student with the highest pct correct (min 3 responses)", () => {
    const responses = [
      { student_name: "Ana", is_correct: true },
      { student_name: "Ana", is_correct: true },
      { student_name: "Ana", is_correct: true },
      { student_name: "Beto", is_correct: true },
      { student_name: "Beto", is_correct: false },
      { student_name: "Beto", is_correct: false },
    ];
    expect(topStudentByPctCorrect(responses)).toEqual({
      name: "Ana",
      pct_correct: 100,
      response_count: 3,
    });
  });
  it("skips students with < 3 responses (noise floor)", () => {
    const responses = [
      { student_name: "Ana", is_correct: true },
      { student_name: "Ana", is_correct: true },
      { student_name: "Beto", is_correct: false },
      { student_name: "Beto", is_correct: false },
      { student_name: "Beto", is_correct: false },
    ];
    // Ana has only 2 → skipped. Beto has 3 → wins by default.
    expect(topStudentByPctCorrect(responses)?.name).toBe("Beto");
  });
  it("returns null when no eligible student", () => {
    expect(topStudentByPctCorrect([])).toBeNull();
  });
});

describe("computeTodayPulse", () => {
  it("aggregates session and response totals", () => {
    const sessions = [
      { id: "s1", class_id: "a", status: "completed", completed_at: today, created_at: today },
      { id: "s2", class_id: "b", status: "active", completed_at: null, created_at: today },
    ];
    const responses = [
      { session_id: "s1", class_id: "a", student_name: "Ana", is_correct: true, points: 1, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Ana", is_correct: true, points: 1, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Beto", is_correct: false, points: 0, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Beto", is_correct: true, points: 1, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Beto", is_correct: true, points: 1, max_points: 1 },
    ];
    const classes = [
      { id: "a", name: "5to A" },
      { id: "b", name: "5to B" },
    ];
    const pulse = computeTodayPulse({ sessions, responses, classes });
    expect(pulse.completed_sessions).toBe(1);
    expect(pulse.active_sessions).toBe(1);
    expect(pulse.responses_total).toBe(5);
    expect(pulse.pct_correct_today).toBeCloseTo(80, 0);
    expect(pulse.top_class?.name).toBe("5to A");
    expect(pulse.has_active).toBe(true);
  });
  it("tolerates empty inputs", () => {
    const pulse = computeTodayPulse({ sessions: [], responses: [], classes: [] });
    expect(pulse.completed_sessions).toBe(0);
    expect(pulse.active_sessions).toBe(0);
    expect(pulse.responses_total).toBe(0);
    expect(pulse.pct_correct_today).toBeNull();
    expect(pulse.top_class).toBeNull();
    expect(pulse.top_student).toBeNull();
    expect(pulse.has_active).toBe(false);
  });
});
