const { test, expect } = require('@playwright/test');

test('home page keeps header fixed while scrolling', async ({ page }) => {
  await page.goto('/');

  const header = page.locator('header').first();

  await expect(header).toBeVisible();
  await expect(page.getByRole('link', { name: /nanny/i })).toBeVisible();

  const position = await header.evaluate((node) => window.getComputedStyle(node).position);
  expect(position).toBe('fixed');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await expect(header).toBeVisible();
});
