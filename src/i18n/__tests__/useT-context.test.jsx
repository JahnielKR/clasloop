import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../LanguageContext";
import { useT } from "../index";

function Probe({ explicit }) {
  const t = useT("community", explicit); // explicit may be undefined
  return <span>{t.back}</span>;
}

describe("useT context fallback", () => {
  it("uses the context language when no explicit lang is passed", () => {
    render(
      <LanguageProvider value="es">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("explicit lang argument wins over context", () => {
    render(
      <LanguageProvider value="es">
        <Probe explicit="en" />
      </LanguageProvider>,
    );
    expect(screen.getByText("Back")).toBeInTheDocument();
  });
});
