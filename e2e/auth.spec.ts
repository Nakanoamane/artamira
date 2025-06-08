import { test, expect, Page } from "@playwright/test";
import { registerAndLogin } from "./utils";

// ヘルパー関数: ユニークなユーザー情報を生成
function generateUniqueUser() {
  const randomString = Math.random().toString(36).substring(2, 15);
  return {
    email: `testuser-${randomString}@example.com`,
    password: "password",
  };
}

// ユーザー登録テスト
test("新規ユーザー登録ができること", async ({ page }) => {
  const user = generateUniqueUser();

  await page.goto("/register");
  await expect(page.locator('h3:has-text("アカウント作成")')).toBeVisible();
  await expect(page).toHaveTitle(/Artamira - 登録/);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="password_confirmation"]', user.password);
  const registerButton = page.locator('button:has-text("登録")');
  await expect(registerButton).toBeVisible();
  await expect(registerButton).toBeEnabled();
  await registerButton.click();

  await page.waitForURL("/");
  await expect(page).toHaveURL(/\/drawings/);
  await expect(page).toHaveTitle(/Artamira - Boards/);
});

// ログインテスト
test("既存ユーザーがログインできること", async ({ page }) => {
  const user = await registerAndLogin(page);

  await page.locator('button:has(span:has-text("ログアウト"))').click();
  await page.waitForURL("/login");
  await expect(page).toHaveTitle(/Artamira - ログイン/);

  await expect(page.locator('h3:has-text("ログイン")')).toBeVisible();
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.getByRole('button', { name: 'ログイン' }).click();

  await page.waitForURL("/drawings");
  await expect(page).toHaveTitle(/Artamira - Boards/);
});

test("無効な認証情報でログインに失敗すること", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('h3:has-text("ログイン")')).toBeVisible();
  await page.fill('input[name="email"]', "invalid@example.com");
  await page.fill('input[name="password"]', "wrongpassword");
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page.locator("text=Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

// ログアウトテスト
test("ログインユーザーがログアウトできること", async ({ page }) => {
  const user = await registerAndLogin(page);

  await page.locator('button:has(span:has-text("ログアウト"))').click();

  await page.waitForURL("/login");
  await expect(page).toHaveTitle(/Artamira - ログイン/);
});
