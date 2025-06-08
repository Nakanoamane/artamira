import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'; // fsモジュールをインポート

async function globalSetup(config: FullConfig) {
  // VITE_WS_URLがPlaywright環境で利用可能であることを確認するためにここで設定
  process.env.VITE_WS_URL = process.env.VITE_WS_URL || 'ws://localhost:3000/cable'
  process.env.TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
  process.env.TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password'

  const { baseURL, storageState } = config.projects[0].use

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${baseURL}/login`)

  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL)
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD)
  await page.getByRole('button', { name: 'ログイン' }).click()

  try {
    await page.waitForURL(`${baseURL}/drawings`, { timeout: 10000 })
    const storageStatePath = storageState as string;
    await page.context().storageState({ path: storageStatePath })
  } catch (error) {
    await browser.close();
    throw error; // エラーを再スローしてテストを失敗させる
  }

  await browser.close()
}

export default globalSetup
