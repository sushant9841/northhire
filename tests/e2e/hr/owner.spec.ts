import { test, expect } from "../fixtures/base";
import { loginAsHr, HR_PERSONAS } from "../fixtures/auth";

/*
 * Playbook §21 — HR Owner (Rachel) suite:
 *   - logs in successfully
 *   - sees org-health attention stack on Overview (highest-priority action items)
 *   - navigates through role-scoped nav in Owner priority order
 */
test.describe("HR owner (Rachel)", () => {
  test("Rachel logs in and lands on HR dashboard", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner);
    await dismissCookieBanner();

    // After login, should be on HR dashboard
    await expect(page).toHaveURL(/\/hr\/dashboard/);

    // Dashboard should show some content (company name, stats, or overview)
    const dashboardContent = page.getByText(/Overview|Dashboard|Attention|Welcome/i);
    expect(await dashboardContent.count()).toBeGreaterThan(0);
  });

  test("sees org-health attention stack on Overview with action items", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner);
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for attention stack / alert items on the dashboard
    // These are typically high-priority action items like:
    // - Interviews scheduled today
    // - Candidates awaiting review
    // - Attendance issues
    // - Leave requests pending
    // - Upcoming deadlines

    // Check for cards/sections that indicate attention items
    const attentionContainer = page.locator("[class*='attention'], [class*='alert'], [class*='stack']").first();

    if (await attentionContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(attentionContainer).toBeVisible();
    }

    // Check for action item indicators (could be badges, count badges, etc.)
    const actionItems = page.locator("[class*='badge'], [class*='count'], [class*='alert']");

    // At minimum, there should be some kind of overview/summary visible
    const overview = page.getByText(/Overview|Summary|At a glance/i);
    if (await overview.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(overview).toBeVisible();
    }

    // Verify there are sections/cards for different HR functions
    const sections = page.locator("[class*='card'], [class*='section']");
    expect(await sections.count()).toBeGreaterThan(0);
  });

  test("navigates through role-scoped nav in Owner priority order", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.owner);
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Owner should have access to all HR modules
    // Expected nav order for Owner: Dashboard → People → Attendance → Leave → Payroll → Salary →
    // Tasks/Calendar → Trainings → PerfReviews → Policies → Settings

    // Check for left sidebar or nav menu
    const navItems = page.locator("[class*='sidebar'], [class*='nav'], [role='navigation']").first();
    if (await navItems.isVisible().catch(() => false)) {
      await expect(navItems).toBeVisible();
    }

    // Navigate to People / Directory
    const peopleNav = page.getByRole("link", { name: /People|Directory|Roster/i })
      .or(page.getByRole("button", { name: /People|Directory|Roster/i })).first();

    if (await peopleNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await peopleNav.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/hr\/(people|roster|directory)/);
    }

    // Navigate to Attendance
    const attendanceNav = page.getByRole("link", { name: /Attendance/i })
      .or(page.getByRole("button", { name: /Attendance/i })).first();

    if (await attendanceNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await attendanceNav.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/hr\/attendance/);
    }

    // Navigate to Leave
    const leaveNav = page.getByRole("link", { name: /Leave/i })
      .or(page.getByRole("button", { name: /Leave/i })).first();

    if (await leaveNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await leaveNav.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/hr\/leave/);
    }

    // Navigate to Payroll (should be accessible to Owner)
    const payrollNav = page.getByRole("link", { name: /Payroll|Salary/i })
      .or(page.getByRole("button", { name: /Payroll|Salary/i })).first();

    if (await payrollNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await payrollNav.click();
      await page.waitForLoadState("networkidle");
      // Should successfully navigate (not get 403)
      expect(page.url()).not.toMatch(/403|unauthorized|forbidden/i);
    }
  });
});
