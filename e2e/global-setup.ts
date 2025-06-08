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

  // スクリーンショットディレクトリを作成
  const screenshotDir = './e2e/screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.goto(`${baseURL}/login`)
  await page.screenshot({ path: `${screenshotDir}/01_login_page.png` }); // ログインページ表示時のスクリーンショット

  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL)
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await page.screenshot({ path: `${screenshotDir}/02_after_login_click.png` }); // ログインボタンクリック後のスクリーンショット

  try {
    await page.waitForURL(`${baseURL}/drawings`, { timeout: 10000 })
    await page.screenshot({ path: `${screenshotDir}/03_drawings_page.png` }); // drawingsページ表示時のスクリーンショット

    const storageStatePath = storageState as string;
    console.log(`Saving storageState to: ${storageStatePath}`);
    const state = await page.context().storageState();
    console.log(`StorageState content (first 200 chars): ${JSON.stringify(state).substring(0, 200)}...`);
    await page.context().storageState({ path: storageStatePath })
  } catch (error) {
    console.error('ログイン後のリダイレクトに失敗しました:', error);
    await page.screenshot({ path: `${screenshotDir}/04_login_failed.png` }); // ログイン失敗時のスクリーンショット
    await browser.close();
    throw error; // エラーを再スローしてテストを失敗させる
  }

  await browser.close()
}

export default globalSetup
