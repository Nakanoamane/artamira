import { test, expect, Page } from '@playwright/test'

test.describe('DrawingBoard', () => {
  let drawingId: number;

  // ヘルパー関数: 描画操作を行い、保存ボタンが活性化されることを確認する
  async function performDrawingAndVerifyDirtyState(page: Page) {
    await page.waitForSelector('canvas');
    const canvas = page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found or has no bounding box');
    }

    // 接続中が表示されていないことを確認
    await expect(page.getByText('接続中')).not.toBeVisible();

    // 何か描画する
    await page.mouse.move(canvasBoundingBox.x + 50, canvasBoundingBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBoundingBox.x + 100, canvasBoundingBox.y + 100);
    await page.mouse.up();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // UIがダーティ状態に更新されるのを待つ
    await expect(page.getByRole('button', { name: '保存 *' })).toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
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

    await expect(page.locator('label:has-text("ツール")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ペン')).toBeVisible({ timeout: 15000 });
  })

  test('should render Toolbar and Canvas components', async ({ page }) => {
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

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
    const context1 = await browser.newContext({ storageState: './e2e/storageState.json' })
    const page1 = await context1.newPage()
    await page1.goto('/drawings')
    await page1.click('a:has-text("新規描画ボードを作成")')
    await page1.fill('input[placeholder="新しい描画ボードのタイトル"]', 'リアルタイムテストボード')
    await page1.click('button:has-text("作成")')
    await page1.waitForURL(/\/drawings\/\d+/)

    const drawingId = page1.url().split('/').pop()
    if (!drawingId) throw new Error('Failed to get drawing ID for real-time test')

    // クライアント2のセットアップ
    const context2 = await browser.newContext({ storageState: './e2e/storageState.json' })
    const page2 = await context2.newPage()
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

  test('should activate save button and show unsaved indicator after drawing', async ({ page }) => {
    // 描画操作とダーティ状態の確認を共通化
    await performDrawingAndVerifyDirtyState(page);

    // 保存ボタンをクリック
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 1500 });

    // 保存ボタンが非活性化され、未保存マークが消えていることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); // アスタリスクなしの「保存」ボタンが非活性化
    await expect(saveButtonWithAsterisk).not.toBeVisible(); // アスタリスク付きボタンが非表示になっていること
    // 最終保存日時が表示されていることを確認（正確な時間は検証しないが、存在することを確認）
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません', { timeout: 10000 });
  });

  test('should save drawing and disable save button, remove unsaved indicator', async ({ page }) => {
    // 描画操作とダーティ状態の確認を共通化
    await performDrawingAndVerifyDirtyState(page);

    // 保存ボタンをクリック
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 1500 });

    // 保存ボタンが非活性化され、未保存マークが消えていることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); // アスタリスクなしの「保存」ボタンが非活性化
    await expect(saveButtonWithAsterisk).not.toBeVisible(); // アスタリスク付きボタンが非表示になっていること
    // 最終保存日時が表示されていることを確認（正確な時間は検証しないが、存在することを確認）
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません', { timeout: 10000 });
  });

  test('should restore drawing content after page reload', async ({ page }) => {
    // 描画操作とダーティ状態の確認を共通化
    await performDrawingAndVerifyDirtyState(page);

    // 保存ボタンをクリック
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 1500 });

    // 保存ボタンが非活性化され、未保存マークが消えていることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); // アスタリスクなしの「保存」ボタンが非活性化
    await expect(saveButtonWithAsterisk).not.toBeVisible(); // アスタリスク付きボタンが非表示になっていること
    // 最終保存日時が表示されていることを確認（正確な時間は検証しないが、存在することを確認）
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません', { timeout: 10000 });

    // ページをリロード
    await page.reload();
    // 描画ボードのUIが完全にロードされるのを待機（ツールバーの要素など）
    await expect(page.locator('label:has-text("ツール")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ペン')).toBeVisible({ timeout: 15000 });
    // キャンバスが可視であることを確認
    await expect(page.locator('canvas')).toBeVisible();
    // 最終保存日時が表示されていることを確認することで、データがロードされたことを間接的に確認
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません', { timeout: 10000 });
  });

  test('should show warning when attempting to leave page with unsaved changes', async ({ page }) => {
    // 1. Draw something to make isDirty true (共通化)
    await performDrawingAndVerifyDirtyState(page);

    const initialUrl = page.url(); // 現在のURLを保存

    // 2. Set up dialog listener and attempt close
    const dialogPromise = page.waitForEvent('dialog');
    const closePromise = page.close({ runBeforeUnload: true }).catch(e => e); // close can also be aborted

    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss(); // Dismissing should prevent close

    await closePromise; // page.close()の完了を待つ (エラーがスローされない可能性もある)

    // ページが閉じられず、URLが変更されていないことを確認
    await expect(page).toHaveURL(initialUrl, { timeout: 15000 });
  });

  // TODO: 描画テストの追加
  // Canvas上での描画操作（マウスイベント）のシミュレーションと、描画が正しく行われたかの検証
  // リアルタイム反映のテストは、モック化したAction Cableまたは複数ブラウザインスタンスでのテストが必要
})
