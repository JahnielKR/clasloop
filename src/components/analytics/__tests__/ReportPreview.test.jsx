import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n/LanguageContext";

const { mockUse } = vi.hoisted(() => ({ mockUse: vi.fn() }));
vi.mock("../../../hooks/useClassAnalytics", () => ({
  useClassAnalytics: (...a) => mockUse(...a),
}));

import ReportPreview from "../ReportPreview";

function renderPreview(draft) {
  return render(
    <LanguageProvider value="en">
      <ReportPreview draft={draft} className="Spanish 1" />
    </LanguageProvider>,
  );
}

beforeEach(() => mockUse.mockReset());

describe("ReportPreview", () => {
  it("prompts to pick a class when none selected", () => {
    mockUse.mockReturnValue({ data: null, isPending: false });
    renderPreview({ classId: "", period: "d30", sections: ["kpis"] });
    expect(screen.getByText("Pick a class to preview its report.")).toBeInTheDocument();
  });

  it("shows the empty state when the class has no data", () => {
    mockUse.mockReturnValue({ data: { kpis: {}, topic_mastery: [], most_missed: [] }, isPending: false });
    renderPreview({ classId: "c1", period: "d30", sections: ["kpis", "topics", "most_missed"] });
    expect(screen.getByText("No data for this class in the selected period.")).toBeInTheDocument();
  });

  it("renders included sections in order; KPI section shows the % correct label", () => {
    mockUse.mockReturnValue({
      data: {
        kpis: { pct_correct: 80, unique_participants: 10, responses_total: 100, avg_time_ms: 9000 },
        topic_mastery: [{ topic: "Saludos", retention_score: 76 }],
        most_missed: [{ question_index: 2, topic: "Saludos", error_rate: 70 }],
      },
      isPending: false,
    });
    renderPreview({ classId: "c1", period: "d30", sections: ["topics", "kpis"] });
    expect(screen.getByText("% correct")).toBeInTheDocument();
    expect(screen.getByText("Saludos")).toBeInTheDocument();
    // order: the "topics" section heading appears before the KPI section heading
    const topicsH = screen.getByText("Mastery by topic");
    const kpisH = screen.getByText("Key indicators");
    expect(topicsH.compareDocumentPosition(kpisH) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
