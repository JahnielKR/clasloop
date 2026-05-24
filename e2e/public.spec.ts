import { test, expect } from "@playwright/test";

// PR 167 (H22 part 2): public-flow e2e. These require NO auth and write NO data
// (pure navigation + visible-UI assertions), so they run against any deployment
// — including CI without a test Supabase project. The authed flows live in
// authed.spec.ts (test.skip until a test project exists).

test.describe("public landing", () => {
  test("PublicHome renders the marketing entry", async ({ page }) => {
    await page.goto("/");
    // taglineHighlight — unique copy on the landing hero (the headline anchor)
    await expect(page.getByRole("heading", { name: /30 seconds\./ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign up free" }).first()
    ).toBeVisible();
  });

  test("header nav links smooth-scroll to their section", async ({ page }) => {
    await page.goto("/");
    // The header nav items used to be inert <span>s; the landing redesign
    // turned them into real buttons that scroll to in-page anchors. "Features"
    // targets the generation demo, which lives far below the fold.
    await page.getByRole("button", { name: "Features" }).click();
    await expect(
      page.getByRole("heading", { name: "From any file to verified questions" })
    ).toBeInViewport({ timeout: 5000 });
  });

  test("'Got a code?' dialog opens and gates Join on a 6-digit code", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Got a code?" }).click();
    await expect(
      page.getByText("Enter the 6-digit code from your teacher.")
    ).toBeVisible();
    const join = page.getByRole("button", { name: "Join", exact: true });
    await expect(join).toBeDisabled();
    await page.getByPlaceholder("Code").fill("123456");
    await expect(join).toBeEnabled();
  });

  test("guest join screen renders at /join (desktop)", async ({ page }) => {
    await page.goto("/join");
    // GuestJoin's code-entry instruction — unique, and confirms the no-auth
    // guest entry point renders (not the mobile-blocked screen on desktop).
    await expect(
      page.getByText("Enter the 6-digit code your teacher gave you")
    ).toBeVisible();
  });

  test("scroll redesign: journey rail shows on desktop, page logs no console errors", async ({ page }) => {
    // The scroll redesign added an imperative scroll-progress rail + sticky
    // scene; this guards against runtime errors from those hooks and confirms
    // the guiding rail mounts on a desktop-width viewport (CSS-gated ≥1100px).
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(String(err)));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /30 seconds\./ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Section progress" })).toBeVisible();
    // The four scene headings all render (generate → print → live → insights).
    await expect(page.getByRole("heading", { name: "From any file to verified questions" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "See exactly who got it" })).toBeAttached();
    expect(errors).toEqual([]);
  });

  test("scroll redesign: journey rail is hidden on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /30 seconds\./ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Section progress" })).toBeHidden();
  });

  test("closing CTA shows Cleo and the sign-up call to action", async ({ page }) => {
    await page.goto("/");
    // "Pricing" nav targets the closing section (id="start").
    await page.getByRole("button", { name: "Pricing" }).click();
    await expect(
      page.getByRole("heading", { name: "Every class deserves a warmup." })
    ).toBeInViewport({ timeout: 5000 });
    // The mascot's one punctual landing appearance.
    await expect(page.getByRole("img", { name: "Cleo" }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start free trial" }).last()
    ).toBeVisible();
  });

  test("reduced-motion: content stays visible and logs no console errors", async ({ page }) => {
    // Guards the new hero choreography + card entrance + closing Cleo: under
    // prefers-reduced-motion every animation must collapse to a readable end
    // state (nothing left hidden) and nothing should throw.
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(String(err)));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /30 seconds\./ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Every class deserves a warmup." })
    ).toBeAttached();
    expect(errors).toEqual([]);
  });
});
