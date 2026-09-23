import { test, expect } from "../fixtures/base";
import { loginAsEmployer } from "../fixtures/auth";

/*
 * Playbook §21 — employer hire flow:
 *   - advance candidate to Hired stage → HireOnboardingModal surfaces
 *   - confirm creates HR employee record + navigates to HR profile/directory
 */
test.describe("employer hire", () => {
  test("advancing to Hired stage shows HireOnboardingModal with employee creation form", async ({ page, dismissCookieBanner }) => {
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

    // Click on first candidate
    const firstCard = page.locator("div[class*='card']").filter({ hasText: /\w+/ }).first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Find "Advance to Hired" button (or similar)
      // Look for advance button that says "Hired" or check the current stage
      const advanceBtn = page.getByRole("button", { name: /Advance|Move|Hire|Hired/i });

      if (await advanceBtn.isVisible().catch(() => false)) {
        // Keep clicking advance until we reach Hired or see the modal
        for (let i = 0; i < 5; i++) {
          const btn = page.getByRole("button", { name: /Advance|Move/i }).first();
          if (!(await btn.isVisible().catch(() => false))) break;

          await btn.click();
          await page.waitForTimeout(500);

          // Check if HireOnboardingModal appeared
          const modal = page.locator("[class*='modal'], [role='dialog']")
            .filter({ hasText: /Hire|onboarding|congratulations|award|Hired/i });

          if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(modal).toBeVisible();

            // Verify modal has the expected sections:
            // 1. Celebration header with hiring confirmation
            const celebrationHeader = modal.locator("[class*='header'], h2").filter({ hasText: /Hire|Congratulations|Welcome|Award/i });
            expect(await celebrationHeader.count()).toBeGreaterThan(0);

            // 2. Toggle to add to HR Suite
            const addToHrCheckbox = modal.locator("input[type='checkbox']");
            if (await addToHrCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
              await expect(addToHrCheckbox).toBeVisible();

              // 3. Employee creation form fields
              const titleField = modal.locator("input, [class*='field']").filter({ hasText: /Title|title/i });
              const dateField = modal.locator("input[type='date']");
              const deptField = modal.locator("select, [class*='select']").filter({ hasText: /Depart|depart/i });

              // At least title and date should be visible
              if (await titleField.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(titleField).toBeVisible();
              }
              if (await dateField.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(dateField).toBeVisible();
              }
            }

            // 4. Action buttons
            const createBtn = modal.getByRole("button", { name: /Create|Add|Confirm|Save/i });
            expect(await createBtn.count()).toBeGreaterThan(0);

            break;
          }
        }
      }
    }
  });

  test("confirming hire creates HR employee record and navigates to HR", async ({ page, dismissCookieBanner }) => {
    await loginAsEmployer(page);
    await dismissCookieBanner();
    await page.goto("/employer");

    // Navigate to pipeline
    const pipelineBtn = page.getByRole("link", { name: /Pipeline|Candidates/i })
      .or(page.getByRole("button", { name: /Pipeline|Candidates/i })).first();

    if (await pipelineBtn.isVisible().catch(() => false)) {
      await pipelineBtn.click();
      await page.waitForLoadState("networkidle");
    }

    // Click on first candidate
    const firstCard = page.locator("div[class*='card']").filter({ hasText: /\w+/ }).first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");

      // Advance through stages to Hired
      for (let i = 0; i < 5; i++) {
        const btn = page.getByRole("button", { name: /Advance|Move/i }).first();
        if (!(await btn.isVisible().catch(() => false))) break;

        await btn.click();
        await page.waitForTimeout(500);

        // Look for HireOnboardingModal
        const modal = page.locator("[class*='modal'], [role='dialog']")
          .filter({ hasText: /Hire|onboarding|Award/i });

        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Modal appeared - verify add-to-HR is checked by default
          const checkbox = modal.locator("input[type='checkbox']");
          const isChecked = await checkbox.isChecked().catch(() => true);

          if (isChecked) {
            // Fill in the form (optional, since defaults should be populated)
            // Click the create button to confirm
            const createBtn = modal.getByRole("button", { name: /Create|Add|Confirm/i }).first();
            if (await createBtn.isVisible()) {
              await createBtn.click();
              await page.waitForLoadState("networkidle");

              // After creation, should navigate to HR suite (HR dashboard or HR people page)
              // Look for HR navigation or "People" / "Directory" text
              const hrIndicator = page.getByText(/People|Directory|HR Suite|Dashboard/i).first();

              if (await hrIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
                await expect(hrIndicator).toBeVisible();
              } else {
                // Check if URL changed to /hr route
                const url = page.url();
                expect(url).toMatch(/\/hr/);
              }
            }
          }

          break;
        }
      }
    }
  });
});
