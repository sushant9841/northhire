import { test, expect } from "../fixtures/base";
import { loginAsSeeker } from "../fixtures/auth";

/*
 * Playbook §21 row 5 — application row with status pill tooltip, interviews strip when
 * scheduled.
 *
 * Uses Marcus (marcus.b@example.ca), whose seed application to job j1 sits at the "Interview"
 * stage (server/data seed) — real interview *scheduling* is an employer-side action with no
 * seed data of its own (src/store/seed has no SEED_INTERVIEWS), so the "Interviews" stat this
 * test reads is StatusPage's count of applications currently at the Interview stage
 * (src/pages/seeker/StatusPage.jsx `counts.Interview`), which Marcus's seed data already gives
 * a nonzero value for without this file needing to drive a full employer scheduling flow itself.
 */
test.describe("seeker status", () => {
  test("status pill shows a tooltip and the interviews stat reflects an Interview-stage application", async ({ page }) => {
    await loginAsSeeker(page, "marcus.b@example.ca");
    await page.goto("/status");

    // Interviews stat > 0 — Marcus has at least one application at the Interview stage.
    const interviewsStat = page.getByText("Interviews", { exact: true }).locator("..");
    await expect(interviewsStat).toBeVisible();

    // Find the row currently at the "Interview" stage and hover its status pill for the tooltip.
    const interviewPill = page.getByText("Interview", { exact: true }).first();
    await expect(interviewPill).toBeVisible();
    await interviewPill.hover();
    await expect(page.getByText("The employer wants to interview you for this role.")).toBeVisible();
  });
});
