import { test, expect } from "@playwright/test";

// PR 167 (H22 part 2): public-flow e2e. These require NO auth and write NO data
// (pure navigation + visible-UI assertions), so they run against any deployment
// — including CI without a test Supabase project. The authed flows live in
// authed.spec.ts (test.skip until a test project exists).

test.describe("public landing", () => {
  test("PublicHome renders the marketing entry", async ({ page }) => {
    await page.goto("/");
    // taglineHighlight — unique copy on the landing hero
    await expect(page.getByText("60 seconds.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign up free" }).first()
    ).toBeVisible();
  });

  test("header nav links smooth-scroll to their section", async ({ page }) => {
    await page.goto("/");
    // The "How it works" heading lives far below the fold. The header nav
    // items used to be inert <span>s; the landing-scaffold PR turned them into
    // real buttons that scroll to in-page anchors. Clicking "Features" should
    // bring the section into the viewport.
    await page.getByRole("button", { name: "Features" }).click();
    await expect(
      page.getByRole("heading", { name: "Three steps. Five minutes. Done." })
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
});
