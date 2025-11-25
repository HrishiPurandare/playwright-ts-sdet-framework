// src/tests/ui/login.spec.ts
import { test, expect } from '@playwright/test';
import config from '../../config/testConfig';

test.describe('Basic UI smoke', () => {
  test('homepage has expected title or heading', async ({ page }) => {
    await page.goto(config.baseUrl);
    // If your baseUrl is an HTML page with <h1>Example Domain</h1>, we check for it.
    // Adjust selector if your intended site differs.
    const h1 = await page.locator('h1').first();
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text && text.length).toBeGreaterThan(0);
  });
});
