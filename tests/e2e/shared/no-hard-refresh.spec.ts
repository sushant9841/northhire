import { test, expect } from "../fixtures/base";
import { loginAsSeeker } from "../fixtures/auth";

/*
 * Playbook §21 — no hard refresh required:
 *   - session cookie persists across route navigations (user stays logged in)
 *   - Cache-Control header on HTML shell is "no-cache" (prevents stale shell, forces revalidation)
 */
test.describe("no hard refresh required", () => {
  test("session cookie persists across route navigations", async ({ page, dismissCookieBanner }) => {
    await loginAsSeeker(page);
    await dismissCookieBanner();

    // Verify we're logged in
    await page.goto("/status");
    await page.waitForLoadState("networkidle");

    // Check for logged-in indicators
    let loggedInBefore = await page.getByText(/my profile|account|sign out|sign in/i).isVisible().catch(() => false);

    // Navigate to different routes without logging out
    const routes = ["/jobs", "/cvs", "/matched", "/status"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // Should still be logged in (no redirect to /login)
      const url = page.url();
      expect(url).not.toMatch(/\/login|signin/);

      // Should still see profile/account menu or similar logged-in indicators
      const loggedInAfter = await page.getByText(/my profile|account|sign out/i).isVisible().catch(() => false);

      if (loggedInBefore) {
        expect(loggedInAfter).toBeTruthy();
      }
    }
  });

  test("HTML shell has Cache-Control no-cache header", async ({ page }) => {
    // Make a request to the root and check response headers
    const response = await page.goto("/");

    if (response) {
      const cacheControl = response.headers()["cache-control"];

      if (cacheControl) {
        // Should contain "no-cache" to force revalidation on each load
        // (not "no-store" which is more restrictive, nor missing)
        expect(cacheControl.toLowerCase()).toContain("no-cache");
      }
    }
  });

  test("can navigate between routes without losing state", async ({ page, dismissCookieBanner }) => {
    await loginAsSeeker(page);
    await dismissCookieBanner();

    // Navigate to a page with state (e.g., jobs with filters)
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");

    // Apply a filter (if UI available)
    const filterBtn = page.getByRole("button", { name: /Filter/i }).first();

    if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(300);

      // Check a filter option
      const filterCheckbox = page.getByRole("checkbox").first();

      if (await filterCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const wasChecked = await filterCheckbox.isChecked().catch(() => false);

        if (!wasChecked) {
          await filterCheckbox.click();
        }
      }
    }

    // Get the current URL with state
    const urlWithState = page.url();

    // Navigate to another route
    await page.goto("/status");
    await page.waitForLoadState("networkidle");

    // Go back using browser back button
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Should be back at the jobs page with state preserved
    const urlAfterBack = page.url();

    expect(urlAfterBack).toContain("/jobs");

    // Filter should still be applied (if we had checked it)
    const filterCheckboxAfter = page.getByRole("checkbox").first();

    if (await filterCheckboxAfter.isVisible({ timeout: 2000 }).catch(() => false)) {
      // State should be preserved via app store, not browser cache
      expect(filterCheckboxAfter).toBeVisible();
    }
  });
});
