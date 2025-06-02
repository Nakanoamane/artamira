import { chromium, FullConfig } from '@playwright/test'
import { loginOrCreateUser } from './loginHelper'

async function globalSetup(config: FullConfig) {
  // VITE_WS_URLがPlaywright環境で利用可能であることを確認するためにここで設定
  process.env.VITE_WS_URL = process.env.VITE_WS_URL || 'ws://localhost:3000/cable'

  console.log('Global setup: Logging in user...')
  const { baseURL } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL })

  await loginOrCreateUser(page)

  await page.context().storageState({ path: './tests/storageState.json' })
  await browser.close()
  console.log('Global setup: User logged in and storage state saved.')
}

export default globalSetup
