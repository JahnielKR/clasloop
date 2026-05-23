import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MyClassesRail from "../MyClasses.rail";

const t = {
  railHeading: "School at a glance",
  railClasses: "classes",
  railStudents: "students",
  railDecks: "decks",
  railPending: "Pending review",
  railAttentionHeading: "Needs attention",
  railNoDecks: "no material",
  railNoStudents: "no students",
};

const baseProps = {
  t,
  classCount: 3,
  studentTotal: 42,
  deckTotal: 15,
  pendingReviews: 4,
  onOpenReview: () => {},
  needsAttention: [{ id: "c1", name: "Math 6", reasonText: "no material" }],
  onOpenClass: () => {},
};

describe("MyClassesRail", () => {
  it("shows the school totals", () => {
    render(<MyClassesRail {...baseProps} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("classes")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("students")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("decks")).toBeInTheDocument();
  });

  it("shows the pending-review shortcut and fires onOpenReview when clicked", () => {
    const onOpenReview = vi.fn();
    render(<MyClassesRail {...baseProps} onOpenReview={onOpenReview} />);
    const row = screen.getByRole("button", { name: /Pending review/ });
    expect(row).toBeInTheDocument();
    fireEvent.click(row);
    expect(onOpenReview).toHaveBeenCalledTimes(1);
  });

  it("hides the pending-review shortcut when there's nothing pending", () => {
    render(<MyClassesRail {...baseProps} pendingReviews={0} />);
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });

  it("lists classes needing attention and opens one on click", () => {
    const onOpenClass = vi.fn();
    render(<MyClassesRail {...baseProps} onOpenClass={onOpenClass} />);
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Math 6/ }));
    expect(onOpenClass).toHaveBeenCalledWith("c1");
  });

  it("hides the needs-attention card when nothing needs attention", () => {
    render(<MyClassesRail {...baseProps} needsAttention={[]} />);
    expect(screen.queryByText("Needs attention")).not.toBeInTheDocument();
  });
});
