import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
  await page.goto('http://localhost:5173/login', {waitUntil:'networkidle'});
  await page.fill('input[type=email]', 'sarah.chen@example.ca');
  await page.fill('input[type=password]', 'Password123');
  await page.locator('button:has-text("Sign in"), button:has-text("Se connecter")').first().click();
  await page.waitForTimeout(1200);
  await page.goto('http://localhost:5173/settings', {waitUntil:'networkidle'});
  await page.waitForTimeout(500);
  await page.locator('button:has-text("English")').first().click();
  await page.waitForTimeout(800);
  console.log('url after click', page.url());
  await page.screenshot({path:'.claude/qa-screenshots/seeker/settings-en-desktop.png', fullPage:true});
  await browser.close();
})();
