// Render smoke for the Analytics Studio i18n migration (Ola A).
//
// Why this exists: locale-parity guarantees es/ko match en, and tsc passes
// because the i18n helpers are untyped. NEITHER proves a component actually
// READS its namespace — several "migrations" failed silently and kept rendering
// hardcoded Spanish while the gate stayed green. This mounts the prop-only Studio
// components under LanguageProvider="en" and asserts English renders — the only
// check that catches an unmigrated component or a missing function-key.
//
// Note: assertions that contain the "·" middot use document.body.textContent
// instead of getByText, because testing-library splits on the middot's
// surrounding nodes and reports a false "unable to find" negative.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n/LanguageContext";

import ExportMenu from "../ExportMenu";
import StudentKpiBand from "../StudentKpiBand";
import MisconceptionPanel from "../MisconceptionPanel";
import TopicQuestionsList from "../TopicQuestionsList";
import TopicTrendPanel from "../TopicTrendPanel";
import RiskBadge from "../RiskBadge";
import StudentRiskCard from "../StudentRiskCard";
import TopicMatrix from "../TopicMatrix";
import CompareToggle from "../CompareToggle";
import SessionHistoryTable from "../SessionHistoryTable";
import LiveTile from "../LiveTile";

function en(ui) {
  return render(<LanguageProvider value="en">{ui}</LanguageProvider>);
}

describe("Studio i18n render smoke (en)", () => {
  it("ExportMenu renders English label, not 'Exportar'", () => {
    en(<ExportMenu baseName="r" buildModel={() => ({})} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toMatch(/Export/);
    expect(btn.textContent).not.toMatch(/Exportar/);
  });

  it("StudentKpiBand renders English labels, not 'Sesiones'", () => {
    en(
      <StudentKpiBand
        kpis={{ pct_correct: 70, session_count: 4, avg_time_ms: 9000 }}
        topicMastery={[{ retention_score: 60 }]}
        classAvgRetention={50}
      />,
    );
    expect(screen.getByText("Avg. retention")).toBeInTheDocument();
    expect(screen.getByText("Δ vs class")).toBeInTheDocument();
    expect(screen.queryByText("Sesiones")).not.toBeInTheDocument();
  });

  it("MisconceptionPanel (empty) renders English", () => {
    en(<MisconceptionPanel question={null} />);
    expect(screen.getByText("Misconception")).toBeInTheDocument();
    expect(screen.getByText("No featured question for this topic.")).toBeInTheDocument();
  });

  it("MisconceptionPanel (with data) renders English subtitle + CTA", () => {
    const question = {
      question_index: 0,
      error_rate: 60,
      deck_id: "d1",
      question: { type: "mcq", q: "2+2?", options: ["3", "4"], answer: 1 },
      answer_distribution: { 0: 6, 1: 4 },
    };
    en(<MisconceptionPanel question={question} />);
    expect(screen.getByText("View question in DeckResults")).toBeInTheDocument();
    // middot-safe: assert via full body text
    expect(document.body.textContent).toContain("most-missed question");
    expect(document.body.textContent).not.toContain("Concepto errado");
  });

  it("TopicQuestionsList (empty) renders English", () => {
    en(<TopicQuestionsList questions={[]} />);
    expect(screen.getByText("Other missed questions")).toBeInTheDocument();
  });

  it("TopicTrendPanel renders localized weekly-trend title, not 'Tendencia'", () => {
    en(<TopicTrendPanel topic="Fractions" data={[]} />);
    // middot-safe: "Weekly trend · Fractions" splits getByText on the middot
    expect(document.body.textContent).toContain("Weekly trend");
    expect(document.body.textContent).toContain("Fractions");
    expect(document.body.textContent).not.toContain("Tendencia");
  });

  it("RiskBadge renders English level label", () => {
    en(<RiskBadge level="high" score={80} />);
    expect(screen.getByText(/High risk/i)).toBeInTheDocument();
  });

  it("StudentRiskCard renders English heading", () => {
    en(
      <StudentRiskCard
        inputs={{ recentPctCorrect: 90, weeklyPctCorrect: [90, 92], recentParticipation: 1, daysSinceLastActivity: 0 }}
        studentName="Ana"
      />,
    );
    expect(screen.getByText(/Risk analysis/i)).toBeInTheDocument();
  });

  it("TopicMatrix renders English title", () => {
    en(<TopicMatrix topics={[{ topic: "Fractions", retention_score: 30 }]} />);
    expect(screen.getByText("Mastery matrix")).toBeInTheDocument();
  });

  it("CompareToggle renders English label", () => {
    en(<CompareToggle value="off" onChange={() => {}} />);
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("SessionHistoryTable (empty) renders English", () => {
    en(<SessionHistoryTable items={[]} />);
    expect(screen.getByText("Session history")).toBeInTheDocument();
    expect(screen.getByText("No sessions yet.")).toBeInTheDocument();
  });

  it("LiveTile live dot uses English aria-label, not 'en vivo'", () => {
    en(<LiveTile label="Connected" value={5} live />);
    expect(screen.getByLabelText("live")).toBeInTheDocument();
    expect(screen.queryByLabelText("en vivo")).not.toBeInTheDocument();
  });
});
