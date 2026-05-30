import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import StudioShell from "../StudioShell";

function renderAt(lang) {
  return render(
    <MemoryRouter>
      <LanguageProvider value={lang}>
        <StudioShell view="overview" title="X">
          <div />
        </StudioShell>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("StudioShell i18n", () => {
  it("renders English nav under en", () => {
    renderAt("en");
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("renders Spanish nav under es", () => {
    renderAt("es");
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
  });
});
