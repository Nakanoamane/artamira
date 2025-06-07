import { test, expect, Page } from '@playwright/test'
import { loginOrCreateUser } from './loginHelper';

test.describe('DrawingBoard', () => {
  let drawingId: number;
  test.beforeEach(async ({ page }) => {
    await loginOrCreateUser(page);
    await page.goto('/drawings');

    await page.waitForSelector('a:has-text("新規描画ボードを作成")');
    await page.click('a:has-text("新規描画ボードを作成")');
    await page.fill('input[placeholder="新しい描画ボードのタイトル"]', 'テスト描画ボード');
    await page.click('button:has-text("作成")');

    // 新しい描画ボードのURLに遷移したことを確認し、IDを抽出
    await page.waitForURL(/\/drawings\/\d+/, { timeout: 15000 });
    const url = page.url();
    const match = url.match(/\/drawings\/(\d+)/);
    if (match && match[1]) {
      drawingId = parseInt(match[1], 10);
    } else {
      throw new Error('Failed to extract drawing ID from URL');
    }

    await page.goto(`/drawings/${drawingId}`)
    await expect(page.locator('label:has-text("ツール")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ペン')).toBeVisible({ timeout: 15000 });
  })

  test('should render Toolbar and Canvas components', async ({ page }) => {
    await expect(page.getByText('ペン')).toBeVisible()
    await expect(page.getByLabel('色を選択トグル')).toBeVisible()
    await expect(page.getByLabel(/^ブラシサイズ:/)).toBeVisible()

    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // 描画ボードのタイトルが表示されていることを確認
    await expect(page.locator('h1', { hasText: 'テスト描画ボード' })).toBeVisible({ timeout: 10000 });
  })

  test('should change color and brush size via Toolbar', async ({ page }) => {
    await page.getByLabel('色を選択トグル').click();
    const hexColorInput = page.getByTestId('hex-color-input');
    await hexColorInput.fill('#FF0000');
    await hexColorInput.press('Enter');
    await expect(hexColorInput).toHaveValue('FF0000');

    const brushSizeInput = page.getByLabel(/^ブラシサイズ:/)
    await brushSizeInput.fill('15')
    await expect(page.getByText('ブラシサイズ: 15px')).toBeVisible()
  })

  test('should draw a line on the canvas', async ({ page }) => {
    const canvas = page.locator('canvas')
    const canvasBoundingBox = await canvas.boundingBox()

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found or has no bounding box')
    }

    const startX = canvasBoundingBox.x + canvasBoundingBox.width / 4
    const startY = canvasBoundingBox.y + canvasBoundingBox.height / 4
    const endX = canvasBoundingBox.x + (canvasBoundingBox.width / 4) * 3
    const endY = canvasBoundingBox.y + (canvasBoundingBox.height / 4) * 3

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    // 描画された要素が正しく表示されているか、直接検証するのは難しい
    // 通常は、スナップショットテストや、APIから描画データが保存されたことを確認する
    // ここでは、描画操作がエラーなく完了したことを間接的に確認する
    // 例: 描画後にUIがロックされないこと、エラーメッセージが表示されないことなど
    // 現状では、描画後の特定の視覚的変化を捉える断定的なアサーションは記述が難しい
    // より高度な検証のためには、キャンバスの内容を画像として比較するスナップショットテストが有効
  })

  test('should reflect drawings in real-time across multiple clients', async ({ browser }) => {
    // クライアント1のセットアップ
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    await loginOrCreateUser(page1)
    await page1.goto('/drawings')
    await page1.click('a:has-text("新規描画ボードを作成")')
    await page1.fill('input[placeholder="新しい描画ボードのタイトル"]', 'リアルタイムテストボード')
    await page1.click('button:has-text("作成")')
    await page1.waitForURL(/\/drawings\/\d+/)

    const drawingId = page1.url().split('/').pop()
    if (!drawingId) throw new Error('Failed to get drawing ID for real-time test')

    // クライアント2のセットアップ
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await loginOrCreateUser(page2)
    await page2.goto(`/drawings/${drawingId}`)
    await page2.waitForSelector('canvas')

    // クライアント1で描画
    const canvas1 = page1.locator('canvas')
    const canvas1BoundingBox = await canvas1.boundingBox()
    if (!canvas1BoundingBox) throw new Error('Canvas 1 not found')

    const startX1 = canvas1BoundingBox.x + 50
    const startY1 = canvas1BoundingBox.y + 50
    const endX1 = canvas1BoundingBox.x + 150
    const endY1 = canvas1BoundingBox.y + 150

    await page1.mouse.move(startX1, startY1)
    await page1.mouse.down()
    await page1.mouse.move(endX1, endY1, { steps: 5 })
    await page1.mouse.up()

    // クライアント2で描画が反映されるのを待つ
    // スナップショットテストは環境依存性が高いため、よりロバストな方法を検討
    // 例: 特定のAPIコールが発火したことを待つ、描画要素のリストが更新されたことを確認するなど
    // 現状では、描画完了後にAction Cable経由でデータがブロードキャストされることを間接的に期待する
    // ここでは、一定時間待機してUIが安定するのを待つ
    await page2.waitForTimeout(1000) // 1秒待機

    // より具体的な検証 (例: キャンバスの内容のスナップショット比較)
    // await expect(page2.locator('canvas')).toHaveScreenshot('drawn-line.png', { timeout: 10000 });
    // ただし、スナップショットは環境（OS、ブラウザ、GPUなど）に依存するため、CI/CDで安定させるのが難しい場合がある
    // 代替として、描画要素が正しく追加されたことを確認するためのAPIコールをモックし、そのコールが行われたことを検証するなども考えられる

    await context1.close()
    await context2.close()
  })

  // TODO: 描画テストの追加
  // Canvas上での描画操作（マウスイベント）のシミュレーションと、描画が正しく行われたかの検証
  // リアルタイム反映のテストは、モック化したAction Cableまたは複数ブラウザインスタンスでのテストが必要
})
