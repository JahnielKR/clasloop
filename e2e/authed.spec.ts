import { test } from "@playwright/test";

// PR 167 (H22 part 2): authed-flow e2e SCAFFOLDS — `test.skip` until a dedicated
// TEST Supabase project + a test teacher account exist.
//
// ⚠️ DO NOT run these against prod. signup / deck-create / session creation all
// WRITE real data (see the PR 107 hotfix lesson). They must point at a throwaway
// TEST project.
//
// To enable: provision a free-tier TEST Supabase project (apply
// supabase/schema.sql + supabase/migrations/), create a test teacher, then set
// (in CI secrets / a gitignored .env.test):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   → the TEST project
//   E2E_TEACHER_EMAIL, E2E_TEACHER_PASSWORD      → the test teacher
// then drop the `.skip` and verify the selectors against AuthScreen.jsx /
// Decks.jsx / SessionFlow.jsx / StudentJoin.jsx (the README's selectors were
// guesses).

test.skip("auth: sign up → role onboarding", async ({ page }) => {
  // goto '/', open the AuthScreen sign-up flow, fill a unique email + password,
  // submit → expect to land on RoleOnboarding (assumes email confirmation is
  // OFF in the test project).
});

test.skip("auth: teacher login → authed shell", async ({ page }) => {
  // sign in with E2E_TEACHER_EMAIL/PASSWORD → expect the authed shell (e.g. the
  // Decks page) to render.
});

test.skip("teacher creates a deck", async ({ page }) => {
  // login → Decks → "Create deck" → fill metadata + one question → save →
  // expect the new deck in the list.
});

test.skip("teacher runs a session, student joins", async ({ browser }) => {
  // teacher context: create a session, read the 6-digit PIN.
  // student context (second browser context): /join with the PIN + a name.
  // expect the teacher's lobby to show the joined student.
});

test.skip("student answers each question type", async ({ page }) => {
  // join a seeded test session, answer mcq / true-false / fill / free, and
  // assert navigation between questions works.
});

// NOTE — insight generation is intentionally NOT scaffolded as e2e: it needs the
// Supabase Edge Function + Anthropic + the api/ serverless layer, none of which
// run under `npm run dev` (the README's `MOCK_ANTHROPIC` flag is fictional).
// Cover it via a stubbed-webhook integration test once the test backend exists.
