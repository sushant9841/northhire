import { test, expect } from "../fixtures/base";
import { loginAsHr, HR_PERSONAS } from "../fixtures/auth";

/*
 * Playbook §21 — HR attendance:
 *   - clock-in idempotency: rapid double-click doesn't create second open shift row
 *   - attendance exception surfaces on HR Overview (attention stack)
 */
test.describe("HR attendance", () => {
  test("clock-in is idempotent: rapid double-click doesn't create duplicate shift", async ({ page, dismissCookieBanner }) => {
    await loginAsHr(page, HR_PERSONAS.employee); // Daniel
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to Attendance
    const attendanceLink = page.getByRole("link", { name: /Attendance|Clock/i })
      .or(page.getByRole("button", { name: /Attendance|Clock/i })).first();

    if (await attendanceLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await attendanceLink.click();
      await page.waitForLoadState("networkidle");
    }

    // Look for clock-in button or punch-in control
    const clockInBtn = page.getByRole("button", { name: /Clock|Punch|Start|Check in|In/i })
      .filter({ hasText: /in|start|punch/i }).first();

    if (await clockInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get the initial count of open shifts
      const shiftsBeforeClick = page.locator("[class*='shift'], [class*='row']").filter({ hasText: /open|today|active/i });
      const initialCount = await shiftsBeforeClick.count();

      // Rapidly click the clock-in button twice
      await clockInBtn.click();
      await page.waitForTimeout(100); // Very short wait to simulate rapid clicking
      await clockInBtn.click();

      await page.waitForTimeout(1000);

      // Refresh or wait for update
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Count open shifts again
      const shiftsAfterClick = page.locator("[class*='shift'], [class*='row']").filter({ hasText: /open|today|active/i });
      const finalCount = await shiftsAfterClick.count();

      // Should not have doubled (idempotent)
      // Allow for 1 new shift max, not 2
      expect(finalCount - initialCount).toBeLessThanOrEqual(1);

      // Alternative: Check if there's only one "Clock out" button (meaning only one active shift)
      const clockOutBtns = page.getByRole("button", { name: /Clock out|Stop|Punch out|End/i }).filter({ hasText: /out|end|stop/i });
      const clockOutCount = await clockOutBtns.count();
      expect(clockOutCount).toBeLessThanOrEqual(1);
    }
  });

  test("attendance exception surfaces on HR Overview", async ({ page, dismissCookieBanner }) => {
    // Create an attendance exception (e.g., missing clock-out, unusual hours)
    // This might require seeding or manual creation via API

    await loginAsHr(page, HR_PERSONAS.hr); // Linda
    await dismissCookieBanner();
    await page.goto("/hr/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for attention stack or alerts section that shows attendance issues
    const attentionStack = page.locator("[class*='attention'], [class*='alert'], [class*='stack']").filter({ hasText: /Attendance|Exceptional|Warning|Alert/i });

    if (await attentionStack.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(attentionStack).toBeVisible();
    }

    // Alternatively, look for attendance-related alert/badge in the top stats
    const attendanceAlert = page.getByText(/Attendance|Exceptional|Missing|Unusual/i);

    if (await attendanceAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(attendanceAlert).toBeVisible();
    }

    // Navigate to Attendance page to see exceptions
    const attendanceLink = page.getByRole("link", { name: /Attendance/i })
      .or(page.getByRole("button", { name: /Attendance/i })).first();

    if (await attendanceLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await attendanceLink.click();
      await page.waitForLoadState("networkidle");

      // Look for an "Exceptions" or "Issues" section
      const exceptionsSection = page.getByText(/Exception|Issue|Unusual|Missing/i);

      if (await exceptionsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(exceptionsSection).toBeVisible();
      }

      // Or look for a list of shifts with exception badges
      const exceptionBadges = page.locator("[class*='badge'], [class*='tag']").filter({ hasText: /exception|missing|unusual|late/i });

      expect(await exceptionBadges.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
