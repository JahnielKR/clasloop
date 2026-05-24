// Component test for the first-visit tour state machine + rendering.
// No auth / Supabase — exercises offer → accept → step → close and the
// per-user "seen" persistence (localStorage via safe-storage).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import CleoTour from "../CleoTour";
import { getStrings } from "../../i18n";

const t = getStrings("tours", "es");

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

function renderHomeTour(props = {}) {
  return render(<CleoTour tourId="home" lang="es" userId="u1" enabled {...props} />);
}

describe("CleoTour", () => {
  it("offers on first visit, and never again once dismissed", async () => {
    renderHomeTour();
    // The offer slides in (set in an effect, so wait for it).
    expect(await screen.findByText(t.offerYes)).toBeTruthy();

    // "Ahora no" plays a brief retract-into-corner animation, then dismisses +
    // marks the tour seen.
    fireEvent.click(screen.getByText(t.offerNo));
    await waitFor(() => expect(screen.queryByText(t.offerYes)).toBeNull());
    expect(localStorage.getItem("cl.tours.seen.u1")).toContain("home");

    // A fresh mount for the same user no longer offers.
    cleanup();
    renderHomeTour();
    expect(screen.queryByText(t.offerYes)).toBeNull();
  });

  it("walks through every step and closes on the last", async () => {
    renderHomeTour();
    fireEvent.click(await screen.findByText(t.offerYes));

    // Step 1 of the home tour.
    expect(screen.getByText(t.home.steps[0].title)).toBeTruthy();

    // Advance to the last step.
    fireEvent.click(screen.getByText(t.next));
    expect(screen.getByText(t.home.steps[1].title)).toBeTruthy();

    // Last step shows "Listo"; clicking it closes the tour + marks it seen.
    fireEvent.click(screen.getByText(t.done));
    expect(screen.queryByText(t.home.steps[1].title)).toBeNull();
    expect(localStorage.getItem("cl.tours.seen.u1")).toContain("home");
  });

  it("does not offer when disabled (e.g. not a teacher)", () => {
    renderHomeTour({ enabled: false });
    expect(screen.queryByText(t.offerYes)).toBeNull();
  });

  it("does not auto-offer a tour the user has already seen", () => {
    localStorage.setItem("cl.tours.seen.u1", JSON.stringify(["home"]));
    renderHomeTour();
    expect(screen.queryByText(t.offerYes)).toBeNull();
  });

  it("force + autoStart replays a tour the user already saw (chat 'show me' path)", async () => {
    localStorage.setItem("cl.tours.seen.u1", JSON.stringify(["home"]));
    renderHomeTour({ autoStart: true, force: true });
    // No offer — autoStart jumps straight to the first running step, and force
    // bypasses the "seen" gate so the replay actually runs.
    expect(await screen.findByText(t.home.steps[0].title)).toBeTruthy();
  });

  it("fires onComplete when the last step's 'Listo' is tapped", async () => {
    let completed = false;
    renderHomeTour({ autoStart: true, force: true, onComplete: () => { completed = true; } });
    await screen.findByText(t.home.steps[0].title);
    fireEvent.click(screen.getByText(t.next)); // → last step
    fireEvent.click(screen.getByText(t.done)); // finish
    expect(completed).toBe(true);
  });

  it("fires onSkip when 'Saltar' is tapped (journey abandon)", async () => {
    let skipped = false;
    renderHomeTour({ autoStart: true, force: true, onSkip: () => { skipped = true; } });
    await screen.findByText(t.home.steps[0].title);
    fireEvent.click(screen.getByText(t.skip));
    expect(skipped).toBe(true);
  });
});
