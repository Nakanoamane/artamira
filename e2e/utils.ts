import { Page, expect } from '@playwright/test';

// ヘルパー関数: ユニークなユーザー情報を生成
function generateUniqueUser() {
  const randomString = Math.random().toString(36).substring(2, 15);
  return {
    email: `testuser-${randomString}@example.com`,
    password: "password",
  };
}

// 共通の登録とログイン処理を行うヘルパー関数
export async function registerAndLogin(page: Page) {
  const user = generateUniqueUser();

  await page.goto("/register");
  await expect(page.locator('h3:has-text("アカウント作成")')).toBeVisible();
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="password_confirmation"]', user.password);
  const registerButton = page.locator('button:has-text("登録")');
  await expect(registerButton).toBeVisible();
  await expect(registerButton).toBeEnabled();
  await registerButton.click();

  await page.waitForURL("/"); // ルートパスへのリダイレクトを待機
  await expect(page).toHaveURL(/\/drawings/); // その後、/drawingsに到達していることを確認

  return user;
}
