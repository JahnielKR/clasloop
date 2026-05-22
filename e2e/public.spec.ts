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

  test("guest join screen renders at /join (desktop)", async ({ page }) => {
    await page.goto("/join");
    // GuestJoin's code-entry instruction — unique, and confirms the no-auth
    // guest entry point renders (not the mobile-blocked screen on desktop).
    await expect(
      page.getByText("Enter the 6-digit code your teacher gave you")
    ).toBeVisible();
  });
});
