import { test, expect } from "../fixtures/base";
import { loginAsSeeker } from "../fixtures/auth";

/*
 * Playbook §21 row 4 — create up to 5 CVs, the 6th click surfaces the limit card (not an error),
 * and the autosave indicator ticks "Saved just now" -> "Saved N min ago".
 *
 * Uses Sarah (not Marcv, who tests/e2e/seeker/apply.spec.ts drives up to 2 CVs of his own) so
 * this file's CV count is independent of apply.spec.ts's. Sarah's starting CV count isn't
 * assumed to be 0 (other sessions against this same dev DB may have created CVs for her before);
 * the test reads A.newCv() creating one at a time up to MAX_CVS=5 (src/pages/seeker/cv.jsx)
 * regardless of the starting count, then confirms the 6th attempt is blocked by the limit card.
 */
test.describe("seeker CV builder", () => {
  test("CVs cap at 5 with a limit card, not an error", async ({ page, dismissCookieBanner }) => {
    await loginAsSeeker(page, "sarah.chen@example.ca");
    await page.goto("/cvs");
    await dismissCookieBanner();

    const newCvBtn = page.getByRole("button", { name: "New CV" });
    const firstCvBtn = page.getByRole("button", { name: "Build my first CV" });
    // Create CVs until the New CV button is gone (replaced by the limit banner) or 6 attempts
    // have been made — whichever first, guarding against an infinite loop if something's wrong.
    for (let i = 0; i < 6; i++) {
      await page.goto("/cvs");
      // CvsPage renders its "0 CVs yet" empty state until the async GET of the seeker's own CVs
      // resolves into client state — checking button visibility before that settles can catch
      // the empty state's "Build my first CV" button transiently, then have it vanish out from
      // under a queued click once the real (non-empty) list arrives. Wait for the fetch first.
      await page.waitForLoadState("networkidle");
      if (await page.getByText("You've reached the maximum of 5 CVs").isVisible().catch(() => false)) break;
      if (await firstCvBtn.isVisible().catch(() => false)) { await firstCvBtn.click(); }
      else if (await newCvBtn.isEnabled().catch(() => false)) { await newCvBtn.click(); }
      else break;
      await expect(page).toHaveURL(/\/cvs\/.+\/edit/);
    }

    await page.goto("/cvs");
    await expect(page.getByText("You've reached the maximum of 5 CVs")).toBeVisible();
    // The limit card offers real next steps, not a dead end.
    await expect(page.getByRole("button", { name: "Edit an existing one" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Duplicate one" })).toBeVisible();
    await expect(newCvBtn).toBeDisabled();
  });

  test("autosave indicator ticks from 'Saved just now' to 'Saved N min ago'", async ({ page, dismissCookieBanner }) => {
    // src/pages/seeker/cv.jsx computes "N min ago" from a real Date.now() delta and re-renders
    // it off a real 30s setInterval (`nowTick`). page.clock (Sinon-style fake timers) was tried
    // here first to avoid a real wait, but installing it AFTER the CV editor's own setInterval is
    // already running left that interval un-advanced by clock.fastForward() — the indicator never
    // ticked forward under the fake clock. Rather than fight timer-patching order for a single
    // assertion, this test takes the real ~65s hit once to observe the actual transition; it's
    // slow but genuinely exercises the code path (see docs/REGRESSION.md's runtime note for this
    // file).
    test.setTimeout(150_000);
    await loginAsSeeker(page, "sarah.chen@example.ca");
    await page.goto("/cvs");
    await page.waitForLoadState("networkidle");
    await dismissCookieBanner();
    const firstCvBtn = page.getByRole("button", { name: "Build my first CV" });
    if (await firstCvBtn.isVisible().catch(() => false)) {
      await firstCvBtn.click();
    } else {
      // Sarah already has a CV (from this file's own previous test, or an earlier session) —
      // edit it directly rather than creating a 6th, which the cap test above already covers.
      await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    }
    await expect(page).toHaveURL(/\/cvs\/.+\/edit/);

    const summaryBox = page.locator("textarea, [contenteditable='true']").first();
    await summaryBox.click();
    await page.waitForTimeout(300);
    await summaryBox.type("Autosave probe.", { delay: 20 });
    await expect(page.getByText("Saved just now")).toBeVisible({ timeout: 15_000 });

    // The relative label only re-renders on the component's own 30s tick, quantizing when it
    // actually crosses the "N min ago" (>=60s) threshold — a plain 65s wait can land on a tick
    // that's only just reported "57s ago". Wait comfortably past two ticks (100s) instead.
    await page.waitForTimeout(100_000);
    await expect(page.getByText(/Saved \d+ min ago/)).toBeVisible({ timeout: 10_000 });
  });
});
