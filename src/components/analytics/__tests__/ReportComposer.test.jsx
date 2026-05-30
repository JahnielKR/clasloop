import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import ReportComposer from "../ReportComposer";

const classes = [{ class_id: "c1", class_name: "Spanish 1" }];

function renderComposer(props = {}) {
  return render(
    <LanguageProvider value="en">
      <ReportComposer classes={classes} onSave={() => {}} onDraftChange={() => {}} {...props} />
    </LanguageProvider>,
  );
}

describe("ReportComposer", () => {
  it("renders the 3 sections with English labels + descriptions", () => {
    renderComposer();
    expect(screen.getByText("Key indicators")).toBeInTheDocument();
    expect(screen.getByText("Mastery by topic")).toBeInTheDocument();
    expect(screen.getByText("Most missed questions")).toBeInTheDocument();
    expect(screen.getByText(/Retention per topic/)).toBeInTheDocument();
  });

  it("emits a draft with all 3 sections selected by default", () => {
    const onDraftChange = vi.fn();
    renderComposer({ onDraftChange });
    const last = onDraftChange.mock.calls.at(-1)?.[0];
    expect(last.sections).toEqual(["kpis", "topics", "most_missed"]);
    expect(last.classId).toBe("c1");
  });

  it("toggling a section card removes it from the draft", () => {
    const onDraftChange = vi.fn();
    renderComposer({ onDraftChange });
    fireEvent.click(screen.getByText("Mastery by topic"));
    const last = onDraftChange.mock.calls.at(-1)[0];
    expect(last.sections).toEqual(["kpis", "most_missed"]);
  });

  it("Move down reorders the emitted draft", () => {
    const onDraftChange = vi.fn();
    renderComposer({ onDraftChange });
    const downBtns = screen.getAllByLabelText("Move down");
    fireEvent.click(downBtns[0]);
    const last = onDraftChange.mock.calls.at(-1)[0];
    expect(last.sections).toEqual(["topics", "kpis", "most_missed"]);
  });

  it("Save passes the current draft", () => {
    const onSave = vi.fn();
    renderComposer({ onSave });
    fireEvent.change(screen.getByPlaceholderText(/Monthly report/i), { target: { value: "May" } });
    fireEvent.click(screen.getByText("Save report"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "May", classId: "c1" }));
  });
});
