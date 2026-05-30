import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider, useLang } from "../LanguageContext";

function Probe() {
  return <span>lang={useLang()}</span>;
}

describe("LanguageContext", () => {
  it("useLang returns the provider value", () => {
    render(
      <LanguageProvider value="ko">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText("lang=ko")).toBeInTheDocument();
  });

  it("useLang defaults to 'en' with no provider", () => {
    render(<Probe />);
    expect(screen.getByText("lang=en")).toBeInTheDocument();
  });
});
