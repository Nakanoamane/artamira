import { test, expect, Page, Browser } from '@playwright/test'

test.describe('DrawingBoard', () => {

  // ヘルパー関数: 新規ボードを作成する
  async function createNewDrawingBoard(page: Page, title: string = 'テスト描画ボード') {
    await page.goto('/drawings');

    await page.waitForSelector('a:has-text("新規描画ボードを作成")');
    await page.click('a:has-text("新規描画ボードを作成")');
    await page.waitForSelector('input[placeholder="新しい描画ボードのタイトル"]', { state: 'visible' });
    await page.fill('input[placeholder="新しい描画ボードのタイトル"]', title);
    await page.click('button:has-text("作成")');
    await page.waitForURL(/\/drawings\/\d+/, { timeout: 15000 });
    await expect(page.locator('h1', { hasText: title })).toBeVisible({ timeout: 15000 });
  }

  // ヘルパー関数: 描画ボードのURLからIDを抽出
  async function getDrawingIdFromUrl(page: Page) {
    const url = page.url();
    const match = url.match(/\/drawings\/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    throw new Error('Failed to extract drawing ID from URL');
  }

  // ヘルパー関数: canvasのboundingBoxを取得する
  async function getCanvasBoundingBox(page: Page) {
    await page.waitForSelector('canvas');
    const canvas = page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found or has no bounding box');
    }

    await expect(page.getByText('接続中')).not.toBeVisible();

    return canvasBoundingBox;
  }

  // ヘルパー関数: 予測可能な四角形を描画し、ダーティ状態になることを確認する
  async function drawRectangle(page: Page) {
    const canvasBoundingBox = await getCanvasBoundingBox(page);

    // 四角形ツールを選択
    await page.getByRole('button', { name: '四角' }).click();

    // 四角形を描画
    const startX = canvasBoundingBox.x + 50;
    const startY = canvasBoundingBox.y + 50;
    const endX = canvasBoundingBox.x + 150;
    const endY = canvasBoundingBox.y + 150;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();

    await expect(page.getByRole('button', { name: '保存 *' })).toBeVisible();
  }

  // ヘルパー関数: 線を描画する
  async function drawLine(page: Page) {
    const canvasBoundingBox = await getCanvasBoundingBox(page);

    const startX = canvasBoundingBox.x + canvasBoundingBox.width / 4
    const startY = canvasBoundingBox.y + canvasBoundingBox.height / 4
    const endX = canvasBoundingBox.x + (canvasBoundingBox.width / 4) * 3
    const endY = canvasBoundingBox.y + (canvasBoundingBox.height / 4) * 3

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()
  }

  async function setUpMultiTab(browser: Browser) {
    // クライアント1のセットアップ
    const context1 = await browser.newContext({ storageState: './e2e/storageState.json' });
    const page1 = await context1.newPage();
    await createNewDrawingBoard(page1, 'マルチタブUndo/Redoテストボード');
    const drawingId = await getDrawingIdFromUrl(page1);

    // クライアント2のセットアップ
    const context2 = await browser.newContext({ storageState: './e2e/storageState.json' });
    const page2 = await context2.newPage();
    await page2.goto(`/drawings/${drawingId}`);
    await page2.waitForSelector('canvas');

    // 描画: 初期状態として四角形を描画し、両方のタブで表示されることを確認
    await drawRectangle(page1);
    await expect(page2.locator('canvas')).toHaveScreenshot('same-user-initial-draw-by-A.png', { maxDiffPixels: 100 });
    return { page1, page2 };
  }

  async function closeMultiTab(page1: Page, page2: Page) {
    await page1.context().close();
    await page2.context().close();
  }

  test.beforeEach(async ({ page }) => {
    await createNewDrawingBoard(page);
    await expect(page.locator('label:has-text("ツール")')).toBeVisible();
    await expect(page.getByText('ペン')).toBeVisible();
  })

  test('should render Toolbar and Canvas components', async ({ page }) => {
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    await page.pause();
    await expect(page.locator('h1', { hasText: 'テスト描画ボード' })).toBeVisible();
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
    await drawLine(page);

    await expect(page.locator('canvas')).toHaveScreenshot('after_draw_line.png', {
      maxDiffPixels: 100,
    });
  })

  test('should reflect drawings in real-time across multiple clients', async ({ browser }) => {
    const { page1, page2 } = await setUpMultiTab(browser);

    // クライアント2で描画が反映されるのを待つ
    await expect(page2.locator('canvas')).toHaveScreenshot('after_draw_rectangle_page2.png', {
      maxDiffPixels: 100,
    });

    // Redoボタンが活性化しているかどうかで間接的に確認
    const page2RedoButton = page2.getByRole('button', { name: 'Redo' });
    await expect(page2RedoButton).toBeDisabled(); // 描画直後はRedoは無効

    await closeMultiTab(page1, page2);
  });

  test('should activate save button and show unsaved indicator after drawing', async ({ page }) => {
    // 描画操作とダーティ状態の確認を共通化
    await drawRectangle(page);

    // 保存ボタンをクリック
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 3000 });

    // 保存ボタンが非活性化され、未保存マークが消えていることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled({ timeout: 3000 }); // アスタリスクなしの「保存」ボタンが非活性化
    await expect(saveButtonWithAsterisk).not.toBeVisible(); // アスタリスク付きボタンが非表示になっていること
    // 最終保存日時が表示されていることを確認（正確な時間は検証しないが、存在することを確認）
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません');
  });

  test('should save drawing and disable save button, remove unsaved indicator', async ({ page }) => {
    // 描画操作とダーティ状態の確認を共通化
    await drawRectangle(page);

    // 保存ボタンをクリック
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 3000 });

    // 保存ボタンが非活性化され、未保存マークが消えていることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); // アスタリスクなしの「保存」ボタンが非活性化
    await expect(saveButtonWithAsterisk).not.toBeVisible(); // アスタリスク付きボタンが非表示になっていること
    // 最終保存日時が表示されていることを確認（正確な時間は検証しないが、存在することを確認）
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません');
  });

  test('should restore drawing content after page reload', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 描画操作とダーティ状態の確認を共通化
    await drawRectangle(page);

    // 保存ボタンをクリック
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 3000 });

    // 保存ボタンが非活性化され、未保存マークが消えていることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled(); // アスタリスクなしの「保存」ボタンが非活性化
    await expect(saveButtonWithAsterisk).not.toBeVisible(); // アスタリスク付きボタンが非表示になっていること
    // 最終保存日時が表示されていることを確認（正確な時間は検証しないが、存在することを確認）
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません');

    // ページをリロード
    await page.reload();
    // 描画ボードのUIが完全にロードされるのを待機（ツールバーの要素など）
    await expect(page.locator('label:has-text("ツール")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ペン')).toBeVisible({ timeout: 15000 });
    // キャンバスが可視であることを確認
    await expect(page.locator('canvas')).toBeVisible();
    // 最終保存日時が表示されていることを確認することで、データがロードされたことを間接的に確認
    await expect(page.getByText('最終保存:', { exact: false })).not.toContainText('まだ保存されていません');

    // 描画内容が正確に復元されていることをスナップショットで検証
    await expect(canvas).toHaveScreenshot('restored_rectangle.png', {
      maxDiffPixels: 100, // 描画のわずかな差異を許容
    });
  });

  // 新しいテスト: 単一タブでのUndo/Redo
  test('should perform undo and redo actions in a single tab', async ({ page }) => {
    // 1. 描画アクション
    await drawRectangle(page);

    // UndoボタンとRedoボタンのセレクター
    const undoButton = page.getByRole('button', { name: 'Undo' });
    const redoButton = page.getByRole('button', { name: 'Redo' });

    // Undoボタンが活性化していることを確認
    await expect(undoButton).toBeEnabled();
    // Redoボタンが非活性化していることを確認
    await expect(redoButton).toBeDisabled();

    // 2. Undoボタン押下: 直前の描画が元に戻ることを確認
    await undoButton.click();
    // キャンバス上の描画が消えたことを検証
    await expect(page.locator('canvas')).toHaveScreenshot('single_tab_after_undo.png', {
      maxDiffPixels: 100,
    });

    // Undoボタンが非活性化していることを確認 (描画が一つしかないので、Undo後は非活性になる)
    await expect(undoButton).toBeDisabled();
    // Redoボタンが活性化していることを確認
    await expect(redoButton).toBeEnabled();

    // 3. Redoボタン押下: 元に戻された描画が再描画されることを確認
    await redoButton.click();
    // キャンバス上の描画が再描画されたことを検証
    await expect(page.locator('canvas')).toHaveScreenshot('single_tab_after_redo.png', {
      maxDiffPixels: 100,
    });

    // Undoボタンが活性化していることを確認
    await expect(undoButton).toBeEnabled();
    // Redoボタンが非活性化していることを確認 (Redo後は進む履歴がないので非活性になる)
    await expect(redoButton).toBeDisabled();
  });

  test('should load drawing from canvas_data when available', async ({ page }) => {
    await drawRectangle(page);
    const saveButtonWithAsterisk = page.getByRole('button', { name: '保存 *' });
    await saveButtonWithAsterisk.click({ timeout: 3000 });
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled();

    // 描画ボードをリロード
    await page.reload();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('テスト描画ボード')).toBeVisible();
    await expect(page.getByText('最終保存:')).toBeVisible();

    // キャンバスの内容をスナップショットで検証
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('loaded_canvas_data_rectangle.png', {
      maxDiffPixels: 100,
    });

    // 保存ボタンがロード時に非活性であることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
  });

  test('should fallback to drawing_elements when canvas_data is not available', async ({ page }) => {
    await drawLine(page);
    const drawingId = await getDrawingIdFromUrl(page);

    // 描画ボードにアクセス
    await page.goto(`/drawings/${drawingId}`);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('テスト描画ボード')).toBeVisible();
    await expect(page.getByText('最終保存:')).toContainText('まだ保存されていません'); // 最終保存日時がないことを確認

    // キャンバスの内容をスナップショットで検証
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('loaded_drawing_elements_line.png', {
      maxDiffPixels: 100,
    });

    // 保存ボタンがロード時に非活性であることを確認
    await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
  });

  test('should show warning when attempting to leave page with unsaved changes', async ({ page }) => {
    // 1. Draw something to make isDirty true (共通化)
    await drawRectangle(page);

    const initialUrl = page.url(); // 現在のURLを保存

    // 2. Set up dialog listener and attempt close
    const dialogPromise = page.waitForEvent('dialog');
    const closePromise = page.close({ runBeforeUnload: true }).catch(e => e); // close can also be aborted

    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss(); // Dismissing should prevent close

    await closePromise; // page.close()の完了を待つ (エラーがスローされない可能性もある)

    // ページが閉じられず、URLが変更されていないことを確認
    await expect(page).toHaveURL(initialUrl);
  });

  test('should perform undo and redo actions correctly on a single tab', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 初期状態でUndo/Redoボタンが非活性であることを確認
    const undoButton = page.getByRole('button', { name: 'Undo' });
    const redoButton = page.getByRole('button', { name: 'Redo' });
    await expect(undoButton).toBeDisabled();
    await expect(redoButton).toBeDisabled();

    // 四角形を描画し、保存ボタンが活性化されることを確認
    await drawRectangle(page);
    await expect(page.getByRole('button', { name: '保存 *' })).toBeVisible();

    // 描画後、Undoボタンが活性化されることを確認
    await expect(undoButton).not.toBeDisabled();

    // 描画後のキャンバスの状態をスナップショットで保存
    await expect(canvas).toHaveScreenshot('drawn_rectangle_initial.png', {
      maxDiffPixels: 100,
    });

    // Undoを実行
    await undoButton.click();

    // Undo後のキャンバスの状態をスナップショットで検証（描画が消えていることを期待）
    await expect(canvas).toHaveScreenshot('drawn_rectangle_after_undo.png', {
      maxDiffPixels: 100,
    });

    // Undo後、Undoボタンが非活性、Redoボタンが活性化されることを確認
    await expect(undoButton).toBeDisabled();
    await expect(redoButton).not.toBeDisabled();

    // Redoを実行
    await redoButton.click();

    // Redo後のキャンバスの状態をスナップショットで検証（描画が再表示されていることを期待）
    await expect(canvas).toHaveScreenshot('drawn_rectangle_after_redo.png', {
      maxDiffPixels: 100,
    });

    // Redo後、Undoボタンが活性化、Redoボタンが非活性化されることを確認
    await expect(undoButton).not.toBeDisabled();
    await expect(redoButton).toBeDisabled();
  });

  // 複数タブでのUndo/Redoテスト
  test.describe('Multiple tabs Undo/Redo for the same user', () => {

    async function getUndoRedoButtons(page1: Page, page2: Page) {
      const page1UndoButton = page1.getByRole('button', { name: 'Undo' });
      const page1RedoButton = page1.getByRole('button', { name: 'Redo' });
      const page2UndoButton = page2.getByRole('button', { name: 'Undo' });
      const page2RedoButton = page2.getByRole('button', { name: 'Redo' });
      return { page1UndoButton, page1RedoButton, page2UndoButton, page2RedoButton };
    }

    // テストケース 1: Undoが複数タブで正しく機能すること
    test('should perform undo correctly across multiple tabs', async ({ browser }) => {
      const { page1, page2 } = await setUpMultiTab(browser);
      const { page1UndoButton, page1RedoButton, page2UndoButton, page2RedoButton } = await getUndoRedoButtons(page1, page2);

      // Tab AでUndoを実行
      await expect(page1UndoButton).toBeEnabled();
      await page1UndoButton.click();

      // Tab Bで描画が消えていることを確認
      await expect(page2.locator('canvas')).toHaveScreenshot('same-user-undo-by-A.png', { maxDiffPixels: 100 });

      // 各タブのボタンの状態を検証
      await expect(page1UndoButton).toBeDisabled();
      await expect(page1RedoButton).toBeEnabled();
      await expect(page2UndoButton).toBeDisabled();
      await expect(page2RedoButton).toBeEnabled();

      await closeMultiTab(page1, page2);
    });

    // テストケース 2: Redoが複数タブで正しく機能すること
    test('should perform redo correctly across multiple tabs', async ({ browser }) => {
      const { page1, page2 } = await setUpMultiTab(browser);
      const { page1UndoButton, page1RedoButton, page2UndoButton, page2RedoButton } = await getUndoRedoButtons(page1, page2);

      // Tab AでUndoを実行 (Redo可能な状態にするため)
      await expect(page1UndoButton).toBeEnabled();
      await page1UndoButton.click();

      // Tab AでRedoを実行
      await expect(page1RedoButton).toBeEnabled();
      await page1RedoButton.click();

      // Tab Bで描画が再表示されていることを確認
      await expect(page2.locator('canvas')).toHaveScreenshot('same-user-redo-by-A.png', { maxDiffPixels: 100 });

      // 各タブのボタンの状態を検証
      await expect(page1UndoButton).toBeEnabled();
      await expect(page1RedoButton).toBeDisabled();
      await expect(page2UndoButton).toBeEnabled();
      await expect(page2RedoButton).toBeDisabled();

      await closeMultiTab(page1, page2);
    });

    // テストケース 3: タブAでUndoした内容をタブBでRedoできること
    test('should allow Tab B to redo an action undone by Tab A', async ({ browser }) => {
      const { page1, page2 } = await setUpMultiTab(browser);
      const { page1UndoButton, page1RedoButton, page2UndoButton, page2RedoButton } = await getUndoRedoButtons(page1, page2);

      // Tab AでUndoを実行 (Redo可能な状態にするため)
      await expect(page1UndoButton).toBeEnabled();
      await page1UndoButton.click();

      // Tab BのRedoボタンが活性化していることを確認
      await expect(page2RedoButton).toBeEnabled();

      // Tab BでRedoを実行
      await page2RedoButton.click();

      // Tab Aで描画が再表示されていることを確認
      await expect(page1.locator('canvas')).toHaveScreenshot('same-user-tabB-redo-after-tabA-undo.png', { maxDiffPixels: 100 });

      // 各タブのボタンの状態を検証
      await expect(page1UndoButton).toBeEnabled();
      await expect(page1RedoButton).toBeDisabled();
      await expect(page2UndoButton).toBeEnabled();
      await expect(page2RedoButton).toBeDisabled();

      await closeMultiTab(page1, page2);
    });

    // テストケース 4: タブAでRedoした内容をタブBでUndoできること
    test('should allow Tab B to undo an action redone by Tab A', async ({ browser }) => {
      const { page1, page2 } = await setUpMultiTab(browser);
      const { page1UndoButton, page1RedoButton, page2UndoButton, page2RedoButton } = await getUndoRedoButtons(page1, page2);

      // Tab AでUndoを実行 (Redo可能な状態にするため)
      await expect(page1UndoButton).toBeEnabled();
      await page1UndoButton.click();

      // Tab AでRedoを実行 (Undo可能な状態にするため)
      await expect(page1RedoButton).toBeEnabled();
      await page1RedoButton.click();

      // Tab BのUndoボタンが活性化していることを確認
      await expect(page2UndoButton).toBeEnabled();

      // Tab BでUndoを実行
      await page2UndoButton.click();

      // Tab Aで描画が消えていることを確認
      await expect(page1.locator('canvas')).toHaveScreenshot('same-user-tabB-undo-after-tabA-redo.png', { maxDiffPixels: 100 });

      // 各タブのボタンの状態を検証
      await expect(page1UndoButton).toBeDisabled();
      await expect(page1RedoButton).toBeEnabled();
      await expect(page2UndoButton).toBeDisabled();
      await expect(page2RedoButton).toBeEnabled();

      await closeMultiTab(page1, page2);
    });
  });
})
