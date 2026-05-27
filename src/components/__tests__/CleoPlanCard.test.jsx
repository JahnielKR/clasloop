// CleoPlanCard is the one-confirmation card for a chained / bulk plan. We test
// the behavior the teacher actually touches — the step summaries, the bulk
// "rename quiz", the read-only report link, and that confirming hands the
// (edited) steps up to run. cleo-actions is mocked so we don't pull in the
// Supabase client; the live AI → plan round-trip is verified by hand in-app.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import en from "../../i18n/en";

vi.mock("../../lib/cleo-actions", () => ({
  routeForNavigate: () => "/classes/c1/report",
}));

import CleoPlanCard from "../CleoPlanCard";

const t = en.cleoChat;

// A report step (read-only) + a bulk units step (write).
const PLAN = [
  { type: "navigate", target: "class_report", classId: "c1", className: "History 2", confirm: false },
  { type: "create_units", confirm: true, classId: "c1", className: "History 2", names: ["Unit 1", "Unit 2", "Unit 3"] },
];

const noop = () => {};

describe("CleoPlanCard", () => {
  it("lists each step with a human summary", () => {
    render(<CleoPlanCard steps={PLAN} t={t} onRunPlan={noop} onCancel={noop} onNavigate={noop} />);
    expect(screen.getByText(t.plan.heading)).toBeInTheDocument();
    expect(screen.getByText("Create 3 units in History 2")).toBeInTheDocument();
    expect(screen.getByText("Open History 2's report")).toBeInTheDocument();
  });

  it("routes a read-only report step through its link button (never auto-runs)", () => {
    const onNavigate = vi.fn();
    render(<CleoPlanCard steps={PLAN} t={t} onRunPlan={noop} onCancel={noop} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText(t.plan.viewReport));
    expect(onNavigate).toHaveBeenCalledWith("/classes/c1/report");
  });

  it("opens the rename quiz and runs the plan with the edited names", () => {
    const onRunPlan = vi.fn();
    render(<CleoPlanCard steps={PLAN} t={t} onRunPlan={onRunPlan} onCancel={noop} onNavigate={noop} />);

    fireEvent.click(screen.getByText(t.plan.editNames));
    const inputs = screen.getAllByDisplayValue(/^Unit [123]$/);
    expect(inputs).toHaveLength(3);

    fireEvent.change(inputs[0], { target: { value: "Intro" } });
    fireEvent.click(screen.getByText(t.plan.confirm));

    expect(onRunPlan).toHaveBeenCalledTimes(1);
    const finalSteps = onRunPlan.mock.calls[0][0];
    const unitsStep = finalSteps.find((s) => s.type === "create_units");
    expect(unitsStep.names).toEqual(["Intro", "Unit 2", "Unit 3"]);
  });

  it("shows a completion summary once the plan has run", () => {
    render(
      <CleoPlanCard
        steps={PLAN}
        t={t}
        planStatus="done"
        stepStatuses={[undefined, "done"]}
        results={[null, { ok: true, to: "/classes/c1" }]}
        onRunPlan={noop}
        onCancel={noop}
        onNavigate={noop}
      />
    );
    // One write step (the bulk units); the report step doesn't count as a write.
    expect(screen.getByText("1 of 1 done")).toBeInTheDocument();
  });
});
