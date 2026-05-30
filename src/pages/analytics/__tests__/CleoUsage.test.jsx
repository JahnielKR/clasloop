import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock the data hook so the page renders synchronously with controlled rows —
// no Supabase / QueryClient needed. vi.hoisted lets the factory reference the
// mock fn despite import hoisting.
const { mockUseCleoUsage } = vi.hoisted(() => ({ mockUseCleoUsage: vi.fn() }));
vi.mock("../../../hooks/useCleoUsage", () => ({
  useCleoUsage: (...args) => mockUseCleoUsage(...args),
}));

import CleoUsage from "../CleoUsage";

function renderPage() {
  return render(
    <MemoryRouter>
      <CleoUsage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseCleoUsage.mockReset();
});

describe("CleoUsage", () => {
  it("renders KPIs + distributions from gold data", () => {
    mockUseCleoUsage.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: [
        { activity_type: "mix", model_used: "gemini-3.5-flash", input_type: "text", num_questions: 8, accepted_count: 6, edited_count: 2, regenerated_count: 0, time_to_publish_ms: 40000 },
        { activity_type: "image_generation", model_used: "gemini-2.5-flash-image", input_type: "image", num_questions: 1, accepted_count: null, edited_count: null, regenerated_count: null, time_to_publish_ms: null },
      ],
    });
    renderPage();

    expect(screen.getByRole("heading", { name: "Tu uso de Cleo" })).toBeInTheDocument();
    expect(screen.getByText("Tasa de aceptación")).toBeInTheDocument();
    // 6 accepted / (6 + 2) kept = 75%; 2 / 8 = 25%.
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    // Friendly type labels + prettified model.
    expect(screen.getByText("Mixto")).toBeInTheDocument();
    expect(screen.getByText("Imagen (IA)")).toBeInTheDocument();
    expect(screen.getByText("gemini-3.5-flash")).toBeInTheDocument();
  });

  it("shows the empty state when there are no generations", () => {
    mockUseCleoUsage.mockReturnValue({ isLoading: false, isError: false, error: null, data: [] });
    renderPage();
    expect(screen.getByText(/Aún no has usado Cleo en este período/)).toBeInTheDocument();
  });

  it("shows the thin-data note when rows exist but none have gold yet", () => {
    mockUseCleoUsage.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: [
        { activity_type: "mix", model_used: "gemini-3.5-flash", input_type: "text", num_questions: 5, accepted_count: null, edited_count: null, time_to_publish_ms: null },
      ],
    });
    renderPage();
    expect(screen.getByText(/El volumen y las distribuciones de abajo sí cuentan todo/)).toBeInTheDocument();
  });

  it("renders the shell (no crash) while loading", () => {
    mockUseCleoUsage.mockReturnValue({ isLoading: true, isError: false, error: null, data: undefined });
    renderPage();
    expect(screen.getByRole("heading", { name: "Tu uso de Cleo" })).toBeInTheDocument();
  });
});
