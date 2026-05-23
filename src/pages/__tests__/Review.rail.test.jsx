import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReviewRail from "../Review.rail";

// Minimal slice of the `review` i18n namespace the rail reads.
const t = {
  railHeading: "Overview",
  railTotalLabel: "to review",
  railStudentsLabel: "students",
  railGradedToday: "graded today",
  railWaitingLabel: "Waiting longest",
  railByClassLabel: "By class",
  filterAllClasses: "All classes",
  classLabel: "Class",
};

const baseProps = {
  t,
  globalPending: 12,
  studentCount: 8,
  gradedToday: 5,
  oldestCreatedAt: "2026-05-20T10:00:00.000Z",
  formatRelative: () => "3 d ago",
  classBreakdown: [
    { classId: "c-math", className: "Math 6", count: 7 },
    { classId: "c-sci", className: "Science 9", count: 4 },
  ],
  allCount: 11,
  classFilter: null,
  setClassFilter: () => {},
};

describe("ReviewRail", () => {
  it("shows the pending total, students and graded-today stats", () => {
    render(<ReviewRail {...baseProps} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("to review")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("students")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("graded today")).toBeInTheDocument();
  });

  it("renders the waiting-longest line from formatRelative when there's an oldest item", () => {
    render(<ReviewRail {...baseProps} />);
    expect(screen.getByText("Waiting longest")).toBeInTheDocument();
    expect(screen.getByText("3 d ago")).toBeInTheDocument();
  });

  it("omits the waiting-longest line when nothing is pending", () => {
    render(<ReviewRail {...baseProps} oldestCreatedAt={null} />);
    expect(screen.queryByText("Waiting longest")).not.toBeInTheDocument();
  });

  it("lists each class with its count plus an All-classes row", () => {
    render(<ReviewRail {...baseProps} />);
    expect(screen.getByRole("button", { name: /All classes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Math 6/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Science 9/ })).toBeInTheDocument();
  });

  it("calls setClassFilter with the class id when a class row is clicked", () => {
    const setClassFilter = vi.fn();
    render(<ReviewRail {...baseProps} setClassFilter={setClassFilter} />);
    fireEvent.click(screen.getByRole("button", { name: /Math 6/ }));
    expect(setClassFilter).toHaveBeenCalledWith("c-math");
  });

  it("clears the filter (null) when the All-classes row is clicked", () => {
    const setClassFilter = vi.fn();
    render(<ReviewRail {...baseProps} classFilter="c-math" setClassFilter={setClassFilter} />);
    fireEvent.click(screen.getByRole("button", { name: /All classes/ }));
    expect(setClassFilter).toHaveBeenCalledWith(null);
  });

  it("hides the by-class breakdown when there's only one class", () => {
    render(
      <ReviewRail
        {...baseProps}
        classBreakdown={[{ classId: "c-math", className: "Math 6", count: 7 }]}
      />
    );
    expect(screen.queryByText("By class")).not.toBeInTheDocument();
  });
});
