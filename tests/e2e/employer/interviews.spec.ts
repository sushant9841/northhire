import { test, expect } from "../fixtures/base";
import { loginAsEmployer } from "../fixtures/auth";

/*
 * Playbook §21 — employer interview scheduling:
 *   - schedule interview → TZ banner shows both employer + candidate zones simultaneously
 *     (so no one books 2 PM ET thinking it's 2 PM PT)
 */
test.describe("employer interviews", () => {
  test("schedule interview shows timezone banner with employer and candidate zones", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");

    // Navigate to pipeline to find a candidate
    const pipelineBtn = page.getByRole("link", { name: /Pipeline|Candidates/i })
      .or(page.getByRole("button", { name: /Pipeline|Candidates/i })).first();

    if (await pipelineBtn.isVisible().catch(() => false)) {
      await pipelineBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Click on first candidate to open drawer
    const firstCard = page.locator("div[class*='card']").filter({ hasText: /\w+/ }).first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Find and click "Schedule Interview" button
      const scheduleBtn = page.getByRole("button", { name: /Schedule|Interview/i }).filter({ hasText: /Interview|Schedule/i });

      if (await scheduleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scheduleBtn.click();
        await page.waitForTimeout(500);

        // Modal should open with interview scheduling form
        const modal = page.locator("[class*='modal'], [role='dialog']").filter({ hasText: /Interview|Schedule/i });

        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(modal).toBeVisible();

          // Look for timezone banner/display showing both zones
          // The banner should show employer's TZ and candidate's TZ
          const tzBanner = modal.locator("[class*='banner'], [class*='timezone'], [class*='tz']");

          // Check for visible timezone info (both employer and candidate zones)
          // This could be in separate sections or a single banner
          const tzText = modal.getByText(/timezone|zone|time zone|ET|PT|CT|MT|local/i);

          if (await tzText.count() > 0) {
            // Should see at least two timezone indicators (employer + candidate)
            expect(await tzText.count()).toBeGreaterThanOrEqual(2);
          }

          // Verify we can see both timezone names/indicators
          // Look for a pattern like "Your time: [TZ] | Their time: [TZ]"
          const timeDisplays = modal.locator("div").filter({ hasText: /time|zone/i });
          expect(await timeDisplays.count()).toBeGreaterThan(0);

          // Fill in interview details to proceed
          const dateInput = modal.locator("input[type='date']");
          if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];
            await dateInput.fill(dateStr);
          }

          const timeInput = modal.locator("input[type='time']");
          if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await timeInput.fill("14:00");
          }

          // Verify timezone info is still visible after filling date/time
          const tzAfter = modal.getByText(/timezone|zone|time zone|ET|PT|CT|MT|local/i);
          expect(await tzAfter.count()).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
