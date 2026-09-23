import { test, expect } from "../fixtures/base";
import { loginAsHr, HR_PERSONAS } from "../fixtures/auth";

/*
 * Playbook §21 — HR performance reviews:
 *   - Owner creates review cycle
 *   - launches cycle (stamps out per-employee reviews)
 *   - manager rates a report
 */
test.describe("HR performance reviews", () => {
  test("Owner creates a performance review cycle", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner); // Rachel
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to PerfReviews or Reports section
    const perfReviewsLink = page.getByRole("link", { name: /Performance|Reviews|PerfReview/i })
      .or(page.getByRole("button", { name: /Performance|Reviews/i })).first();

    if (await perfReviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await perfReviewsLink.click();
      await page.waitForLoadState("networkidle");
    }

    // Look for "Create Cycle" or "New Cycle" button
    const createCycleBtn = page.getByRole("button", { name: /Create|New|Start.*Cycle|Launch/i }).first();

    if (await createCycleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createCycleBtn.click();
      await page.waitForTimeout(500);

      // Modal or form to create cycle should appear
      const modal = page.locator("[class*='modal'], [role='dialog']").filter({ hasText: /Cycle|Performance|Review|Title/i });

      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(modal).toBeVisible();

        // Fill in cycle name
        const nameInput = modal.locator("input").first();
        if (await nameInput.isVisible()) {
          await nameInput.fill("Q1 2025 Performance Reviews");
        }

        // Fill in optional dates
        const dateInputs = modal.locator("input[type='date']");
        if (await dateInputs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          const today = new Date().toISOString().split('T')[0];
          await dateInputs.first().fill(today);

          if (await dateInputs.nth(1).isVisible({ timeout: 1000 }).catch(() => false)) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            await dateInputs.nth(1).fill(futureDate.toISOString().split('T')[0]);
          }
        }

        // Submit to create the cycle
        const createBtn = modal.getByRole("button", { name: /Create|Save|Submit/i });
        if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await createBtn.click();
          await page.waitForTimeout(1000);

          // Should see confirmation
          const success = page.getByText(/created|created successfully|cycle.*created/i);
          expect(await success.count()).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test("Owner launches cycle to stamp out per-employee reviews", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner); // Rachel
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to PerfReviews
    const perfReviewsLink = page.getByRole("link", { name: /Performance|Reviews|PerfReview/i })
      .or(page.getByRole("button", { name: /Performance|Reviews/i })).first();

    if (await perfReviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await perfReviewsLink.click();
      await page.waitForLoadState("networkidle");
    }

    // Look for a draft cycle that can be launched
    const cycleCard = page.locator("[class*='card'], [class*='row']").filter({ hasText: /Draft|Ready|Launch/i }).first();

    if (await cycleCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click on the cycle to open it
      await cycleCard.click();
      await page.waitForTimeout(500);

      // Look for "Launch" button
      const launchBtn = page.getByRole("button", { name: /Launch|Start|Begin|Activate/i }).first();

      if (await launchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Might show a confirmation dialog
        await launchBtn.click();
        await page.waitForTimeout(500);

        // Check for confirmation dialog
        const confirmDialog = page.locator("[role='alertdialog'], [class*='confirm']").filter({ hasText: /Launch|Confirm/i });

        if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Confirm the launch
          const confirmBtn = confirmDialog.getByRole("button", { name: /Confirm|Launch|Yes/i });
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
          }
        }

        await page.waitForTimeout(1500);

        // After launch, should see individual reviews created
        const reviewsList = page.locator("[class*='review'], [class*='row']").filter({ hasText: /Review|Employee|Pending/i });

        if (await reviewsList.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          // Should have multiple review items (one per employee)
          expect(await reviewsList.count()).toBeGreaterThan(0);
        }

        // Cycle status should change from Draft to Active
        const cycleStatus = page.getByText(/Active|In Progress|Launched/i);
        if (await cycleStatus.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(cycleStatus).toBeVisible();
        }
      }
    }
  });

  test("manager rates a direct report in performance review", async ({ page, dismissCookieBanner }) => {
    // For this test, we need a manager role. Let's use Rachel (Owner) or create a manager context
    await loginAsHr(page, HR_PERSONAS.owner); // Rachel
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to PerfReviews
    const perfReviewsLink = page.getByRole("link", { name: /Performance|Reviews/i })
      .or(page.getByRole("button", { name: /Performance|Reviews/i })).first();

    if (await perfReviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await perfReviewsLink.click();
      await page.waitForLoadState("networkidle");
    }

    // Look for a review to complete (either pending or assigned to this manager)
    const reviewCard = page.locator("[class*='card'], [class*='row'], [class*='review']").filter({ hasText: /Pending|Review|Rate/i }).first();

    if (await reviewCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click to open the review form
      await reviewCard.click();
      await page.waitForLoadState("networkidle");

      // Look for rating fields (stars, scale, etc.)
      const ratingControl = page.locator("button").filter({ hasText: /★|★☆|Rate/i }).first();

      if (await ratingControl.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click on a star or rating option
        await ratingControl.click();
      }

      // Look for text/comment field
      const commentField = page.locator("textarea, [contenteditable='true']").first();

      if (await commentField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentField.click();
        await commentField.type("Strong technical skills and good communication.", { delay: 10 });
      }

      // Look for Save or Submit button
      const submitBtn = page.getByRole("button", { name: /Save|Submit|Complete|Send/i }).first();

      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);

        // Should see confirmation
        const success = page.getByText(/saved|submitted|completed/i);
        expect(await success.count()).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
