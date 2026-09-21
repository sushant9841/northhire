import { test, expect } from "./fixtures/base";
import { loginAsSeeker, loginAsEmployer, loginAsAdmin, loginAsHr, HR_PERSONAS } from "./fixtures/auth";
import { API_BASE } from "./fixtures/server";

/* Playbook §21 row 1 — sign-in for every persona this suite exercises, plus logout and the
   unauthorized-401 guard. Each spec below fails on any uncaught client-side error (see
   fixtures/base.ts). */
test.describe("auth", () => {
  test("seeker login (Sarah)", async ({ page }) => {
    await loginAsSeeker(page);
    await expect(page).toHaveURL(/\/(matched|jobs)?$|\/$/);
  });

  test("employer login (PCL)", async ({ page }) => {
    await loginAsEmployer(page);
    await expect(page).toHaveURL(/\/employer/);
  });

  test("admin login", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("HR Owner login (Rachel)", async ({ page }) => {
    await loginAsHr(page, HR_PERSONAS.owner);
    await expect(page).toHaveURL(/\/hr\/dashboard/);
  });

  test("HR Admin login (Priya)", async ({ page }) => {
    await loginAsHr(page, HR_PERSONAS.admin);
    await expect(page).toHaveURL(/\/hr\/dashboard/);
  });

  test("HR Linda login", async ({ page }) => {
    await loginAsHr(page, HR_PERSONAS.hr);
    await expect(page).toHaveURL(/\/hr\/dashboard/);
  });

  test("HR Isaac login", async ({ page }) => {
    await loginAsHr(page, HR_PERSONAS.finance);
    await expect(page).toHaveURL(/\/hr\/dashboard/);
  });

  test("HR Daniel login", async ({ page }) => {
    await loginAsHr(page, HR_PERSONAS.employee);
    await expect(page).toHaveURL(/\/hr\/dashboard/);
  });

  test("logout returns to signed-out state", async ({ page, dismissCookieBanner }) => {
    await loginAsSeeker(page);
    // Seeker shell exposes sign-out from the profile/account tab.
    await page.goto("/account");
    await dismissCookieBanner();
    await page.getByRole("button", { name: /Sign out/i }).click();
    await page.waitForURL(/\/(login)?$|\/$/, { timeout: 10_000 });
    const res = await page.request.get(`${API_BASE}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("unauthorized request returns 401", async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/auth/me`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
