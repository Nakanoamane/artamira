import { Page, expect } from '@playwright/test'

const TEST_USER_EMAIL = 'test@example.com'
const TEST_USER_PASSWORD = 'password'

export async function loginOrCreateUser(page: Page) {
  await page.goto('/login')

  // ログインフォームに情報を入力
  await page.fill('input[name="email"]', TEST_USER_EMAIL)
  await page.fill('input[name="password"]', TEST_USER_PASSWORD)
  await page.getByRole('button', { name: 'ログイン' }).click()

  // ログイン成功を待つ（例: トップページへのリダイレクト、特定要素の表示）
  await page.waitForURL('/drawings', { timeout: 10000 }).catch(async () => {
    // ログインに失敗した場合、新規登録を試みる
    await page.goto('/register')

    await page.fill('input[name="email"]', TEST_USER_EMAIL)
    await page.fill('input[name="password"]', TEST_USER_PASSWORD)
    await page.fill('input[name="password_confirmation"]', TEST_USER_PASSWORD)
    await page.getByRole('button', { name: '登録' }).click()

    // 新規登録後のリダイレクトを待つ
    await page.waitForURL('/drawings', { timeout: 10000 })
    await expect(page).toHaveTitle(/Artamira - Boards/)
  })

  // ログイン状態が成功したことを確認
  await expect(page.url()).toContain('/drawings')
  await expect(page).toHaveTitle(/Artamira - Boards/)

  // ログイン後のストレージ状態を返す
  return page.context().storageState();
}
