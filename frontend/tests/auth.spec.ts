import { test, expect, Page } from "@playwright/test";

// ヘルパー関数: ユニークなユーザー情報を生成
function generateUniqueUser() {
  const randomString = Math.random().toString(36).substring(2, 15);
  return {
    email: `testuser-${randomString}@example.com`,
    password: "password",
  };
}

// 共通のログイン処理を行うヘルパー関数
async function registerAndLogin(page: Page) {
  const user = generateUniqueUser();

  await page.goto("/register");
  await expect(page.locator('h3:has-text("アカウント作成")')).toBeVisible();
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="password_confirmation"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/drawings");
  await expect(page).toHaveTitle(/Artamira - Boards/);

  return user;
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
  await page.click('button[type="submit"]');

  await page.waitForURL("/drawings");
  await expect(page).toHaveTitle(/Artamira - Boards/);
});

// ログインテスト
test("既存ユーザーがログインできること", async ({ page }) => {
  const user = await registerAndLogin(page);

  await page.click('text="ログアウト"');
  await page.waitForURL("/login");
  await expect(page).toHaveTitle(/Artamira - ログイン/);

  await expect(page.locator('h3:has-text("ログイン")')).toBeVisible();
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');

  await page.waitForURL("/drawings");
  await expect(page).toHaveTitle(/Artamira - Boards/);
});

test("無効な認証情報でログインに失敗すること", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('h3:has-text("ログイン")')).toBeVisible();
  await page.fill('input[name="email"]', "invalid@example.com");
  await page.fill('input[name="password"]', "wrongpassword");
  await page.click('button[type="submit"]');

  await expect(page.locator("text=Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

// ログアウトテスト
test("ログインユーザーがログアウトできること", async ({ page }) => {
  await registerAndLogin(page);

  await page.click('text="ログアウト"');

  await page.waitForURL("/login");
  await expect(page).toHaveTitle(/Artamira - ログイン/);
});
