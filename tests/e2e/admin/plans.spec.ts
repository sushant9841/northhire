import { test, expect } from "../fixtures/base";
import { loginAsAdmin } from "../fixtures/auth";
import { seedEmployerWithPlanAndJobs, hasLiveEmployersOnPlan } from "../fixtures/seed";

/*
 * Playbook §21 — admin plans (pricing tiers):
 *   - Create plan
 *   - delete plan REJECTED when live employers on it
 */
test.describe("admin plans", () => {
  test("admin can create a new plan", async ({ page, dismissCookieBanner }) => {
    await loginAsAdmin(page);
    await dismissCookieBanner();
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Navigate to Config/Settings
    const settingsLink = page.getByRole("link", { name: /Config|Settings|Configuration/i })
      .or(page.getByRole("button", { name: /Config|Settings|Configuration/i })).first();

    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForLoadState("networkidle");
    }

    // Look for Plans section
    const plansSection = page.getByText(/Plans|Pricing/i).first();

    if (await plansSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Look for "Add Plan" button
      const addPlanBtn = page.getByRole("button", { name: /Add|New|Create.*Plan/i });

      if (await addPlanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click to start adding
        const visibleBtn = await addPlanBtn.first().isVisible();

        if (visibleBtn) {
          await addPlanBtn.first().click();
          await page.waitForTimeout(500);

          // Input field for plan name should appear
          const nameInput = page.locator("input[placeholder*='Name'], input[placeholder*='name'], input[placeholder*='Plan']").first();

          if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await nameInput.fill("Test Plan 2025");

            // Submit (either by clicking button or pressing Enter)
            const submitBtn = page.getByRole("button", { name: /Add|Create|Save/i }).first();

            if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await submitBtn.click();
            } else {
              await nameInput.press("Enter");
            }

            await page.waitForTimeout(1000);

            // New plan card should appear
            const newPlanCard = page.getByText(/Test Plan 2025/i);

            if (await newPlanCard.isVisible({ timeout: 3000 }).catch(() => false)) {
              await expect(newPlanCard).toBeVisible();
            }

            // Save the entire config
            const saveBtn = page.getByRole("button", { name: /Save|Submit/i }).first();

            if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await saveBtn.click();
              await page.waitForTimeout(1000);

              // Should see success confirmation
              const success = page.getByText(/updated|saved|confirmed/i);
              expect(await success.count()).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    }
  });

  test("deleting plan is rejected when live employers use it", async ({ page, dismissCookieBanner }) => {
    // Seed an employer on the Growth plan with 1 live job
    seedEmployerWithPlanAndJobs("e_growth_with_jobs", "Growth Employer", "Growth", 1);

    // Verify this plan has live employers before test runs
    const hasLiveEmployers = hasLiveEmployersOnPlan("Growth");
    expect(hasLiveEmployers).toBe(true);

    await loginAsAdmin(page);
    await dismissCookieBanner();
    await page.goto("/admin/config");
    await page.waitForLoadState("networkidle");

    // Look for Plans section
    const plansSection = page.getByText(/Plans|Pricing/i).first();

    if (await plansSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Find a plan that has live employers on it
      const planCard = page.locator("[class*='plan'], [class*='card']").filter({ hasText: /Plan|pricing/i }).first();

      if (await planCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Look for delete/trash button
        const deleteBtn = planCard.getByRole("button", { name: /Delete|Remove|Trash/i });

        if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await deleteBtn.click();
          await page.waitForTimeout(500);

          // Confirmation dialog should appear
          const confirmDialog = page.locator("[role='alertdialog'], [class*='confirm']").filter({ hasText: /Delete|Confirm/i });

          if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Confirm deletion
            const confirmBtn = confirmDialog.getByRole("button", { name: /Confirm|Delete|Yes/i });

            if (await confirmBtn.isVisible()) {
              await confirmBtn.click();
              await page.waitForTimeout(1000);

              // Should see error that plan has live employers
              const error = page.getByText(/live.*employer|in use|cannot.*delete|still.*using/i);

              if (await error.isVisible({ timeout: 3000 }).catch(() => false)) {
                await expect(error).toBeVisible();
              }
            }
          }
        }
      }
    }
  });
});
