import { test, expect } from "../fixtures/base";
import { signupFreshSeeker } from "../fixtures/auth";

/*
 * Playbook §21 row 3 — the seeker apply flow across CV-picker states:
 *   0-CV pre-flight modal · 1-CV default -> confirmation · N-CV picker default = primary ·
 *   SuccessCard after submit (CV pill + status pill + Track application CTA) · focus-scroll
 *   onto Status.
 *
 * Each sub-test signs up a brand-new seeker account (fixtures/auth.ts signupFreshSeeker) instead
 * of reusing a fixed demo account. Demo accounts (Sarah/Marcus) accumulate CVs and applications
 * across every previous run of this suite against the same persistent dev DB, so a "0 CVs" or
 * "not yet applied to this job" precondition is only true the FIRST time the suite is ever run
 * against a given database — every subsequent run would find stale CVs/applications already
 * there and the assertions below would fail non-deterministically depending on run history.
 * A fresh account sidesteps that entirely and makes these tests reliably re-runnable.
 *
 * Jobs are opened by a fixed seed id (/jobs/j104, "Product Designer") rather than "whatever
 * search returns first": this dev DB carries at least one hand-created leftover row from a real
 * manual QA session ("QA Publish Verification Role") ahead of it in default sort, and relying on
 * sort order to land on a specific, known-live job is exactly the kind of thing that silently
 * breaks the next time someone else's manual testing adds another row.
 */
const JOB_ID = "j104"; // seed job, status "live" as of writing — see server/data seed
const JOB_TITLE = "Product Designer";

// CRITICAL bug found and fixed while writing this file: server/serialize.js's serializeCv()
// never included a `user` field (every other per-user serializer does: `user: row.user_id`).
// Every client-side "is this my CV" check compares `c.user === A.user?.id` — beginApply()'s
// zero-CV pre-flight gate (src/store/useStore.js), _CvPicker, and CvsPage's atLimit count
// (src/pages/seeker/apply.jsx / cv.jsx) — so `c.user` was always `undefined` and never equal to
// a real id. In production this meant EVERY seeker, regardless of how many CVs they had built,
// was shown "You don't have a CV yet" and blocked from ever attaching one when applying — the
// apply flow was silently broken for its most basic case. Fixed by adding `user: row.user_id`
// to serializeCv(). The 0-CV and 1-CV/N-CV sub-tests below are exactly the regression coverage
// that would have caught this on day one and will catch it again if it regresses.

test.describe("seeker apply", () => {
  test("0-CV pre-flight modal blocks apply and offers Create CV", async ({ page, dismissCookieBanner }) => {
    await signupFreshSeeker(page);
    await page.goto(`/jobs/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await dismissCookieBanner();
    await page.getByRole("button", { name: /Apply (for this (job|role)|now)/ }).first().click();
    await expect(page.getByText("You don't have a CV yet")).toBeVisible();
    await page.getByRole("button", { name: "Create CV" }).click();
    await expect(page).toHaveURL(/\/cvs$/);
  });

  test("1-CV default carries through to review, confirmation, and Track application", async ({ page, dismissCookieBanner }) => {
    await signupFreshSeeker(page);
    await page.goto("/cvs");
    await dismissCookieBanner();
    await page.getByRole("button", { name: /Build my first CV|New CV/ }).first().click();
    await expect(page).toHaveURL(/\/cvs\/.+\/edit/);

    await page.goto(`/jobs/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Apply (for this (job|role)|now)/ }).first().click();
    await expect(page).toHaveURL(/\/apply\/1$/);
    // Only one CV exists, so the picker shows it directly — no "Change" needed to select it.
    await expect(page.locator("div.text-sm.font-semibold.text-text").filter({ hasText: /CV$/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/apply\/2$/);
    await page.locator("select").first().selectOption("Immediately");
    // j104 asks for 3+ years' experience, which adds a required "Do you meet this?" question.
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await page.getByRole("button", { name: "Review application" }).click();
    await expect(page).toHaveURL(/\/apply\/3$/);
    await expect(page.getByText(JOB_TITLE, { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Send application" }).click();
    await expect(page).toHaveURL(/\/apply\/done$/);

    // SuccessCard: CV pill, status pill, Track application CTA.
    await expect(page.getByText(/Using .*CV/)).toBeVisible();
    await expect(page.getByText("Applied", { exact: true })).toBeVisible();
    const trackBtn = page.getByRole("button", { name: "Track in My Status" });
    await expect(trackBtn).toBeVisible();

    // Focus-scroll onto Status: clicking Track application lands on /status with the just-
    // submitted application focused (A.focusAppId, set in beginApply/submitApply in useStore.js).
    await trackBtn.click();
    await expect(page).toHaveURL(/\/status$/);
    await expect(page.getByText(JOB_TITLE, { exact: true }).first()).toBeVisible();
  });

  test("N-CV picker defaults to the primary CV", async ({ page, dismissCookieBanner }) => {
    await signupFreshSeeker(page);
    await page.goto("/cvs");
    await dismissCookieBanner();
    await page.getByRole("button", { name: "Build my first CV" }).click();
    await expect(page).toHaveURL(/\/cvs\/.+\/edit/);
    await page.goto("/cvs");
    await page.getByRole("button", { name: "New CV" }).click();
    await expect(page).toHaveURL(/\/cvs\/.+\/edit/);

    await page.goto(`/jobs/${JOB_ID}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Apply (for this (job|role)|now)/ }).first().click();
    await expect(page).toHaveURL(/\/apply\/1$/);
    await page.getByRole("button", { name: "Change" }).click();
    // Primary CV (the account's first-created CV) is the one marked Selected by default, with
    // no picker interaction yet.
    await expect(page.getByText("Selected", { exact: true })).toBeVisible();
  });
});
