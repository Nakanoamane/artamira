import { test, expect } from '@playwright/test';

test('ホームページが正しく表示されること', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await expect(page).toHaveTitle(/Artamira/);
});
