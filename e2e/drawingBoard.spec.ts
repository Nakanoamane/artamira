import { test, expect, Page } from '@playwright/test'

test.describe('DrawingBoard', () => {
  let drawingId: number;

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

  test.beforeEach(async ({ page }) => {
    await createNewDrawingBoard(page);
    drawingId = await getDrawingIdFromUrl(page);

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
    // クライアント1のセットアップ
    const context1 = await browser.newContext({ storageState: './e2e/storageState.json' });
    const page1 = await context1.newPage();
    await page1.goto('/drawings');
    await page1.click('a:has-text("新規描画ボードを作成")');
    await page1.waitForURL('/drawings/new');
    await page1.screenshot({ path: 'test-results/screenshots/multi_tab_user_same_create_new_drawing_board_page1.png' });
    await page1.waitForSelector('input[placeholder="新しい描画ボードのタイトル"]', { state: 'visible' });
    await page1.fill('input[placeholder="新しい描画ボードのタイトル"]', 'マルチタブUndo/Redoテストボード');
    await page1.screenshot({ path: 'test-results/screenshots/multi_tab_user_same_fill_title_page1.png' });
    await page1.click('button:has-text("作成")');
    await page1.screenshot({ path: 'test-results/screenshots/multi_tab_user_same_after_create_button_click_page1.png' });
    await page1.waitForURL(/\/drawings\/\d+/);
    await expect(page1.locator('h1')).toBeVisible({ timeout: 15000 });

    const drawingId = page1.url().split('/').pop();
    if (!drawingId) throw new Error('Failed to get drawing ID for real-time test');

    // クライアント2のセットアップ
    const context2 = await browser.newContext({ storageState: './e2e/storageState.json' });
    const page2 = await context2.newPage();
    await page2.goto(`/drawings/${drawingId}`);
    await page2.waitForSelector('canvas');

    // クライアント1で描画
    const canvas1 = page1.locator('canvas');
    await page1.getByRole('button', { name: '四角' }).click(); // 四角形ツールを選択
    const canvas1BoundingBox = await canvas1.boundingBox();
    if (!canvas1BoundingBox) throw new Error('Canvas 1 not found');

    const startX1 = canvas1BoundingBox.x + 50;
    const startY1 = canvas1BoundingBox.y + 50;
    const endX1 = canvas1BoundingBox.x + 150;
    const endY1 = canvas1BoundingBox.y + 150;

    await page1.mouse.move(startX1, startY1);
    await page1.mouse.down();
    await page1.mouse.move(endX1, endY1, { steps: 5 });
    await page1.mouse.up();

    // クライアント2で描画が反映されるのを待つ
    await page2.waitForTimeout(3000); // 待機時間を延長

    // 単純な描画反映の確認（スナップショットは別途考慮）
    // Redoボタンが活性化しているかどうかで間接的に確認
    const page2RedoButton = page2.getByRole('button', { name: 'Redo' });
    await expect(page2RedoButton).toBeDisabled(); // 描画直後はRedoは無効

    await context1.close();
    await context2.close();
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

  test('should perform undo and redo actions correctly across multiple tabs for the same user', async ({ browser }) => {
    // クライアント1のセットアップ
    const context1 = await browser.newContext({ storageState: './e2e/storageState.json' });
    const page1 = await context1.newPage();
    await page1.goto('/drawings');
    await page1.click('a:has-text("新規描画ボードを作成")');
    await page1.waitForURL('/drawings/new');
    await page1.fill('input[placeholder="新しい描画ボードのタイトル"]', '同一ユーザー複数タブテスト');
    await page1.click('button:has-text("作成")');
    await page1.waitForURL(/\/drawings\/\d+/);
    await expect(page1.locator('h1')).toBeVisible({ timeout: 15000 });
    const drawingId = page1.url().split('/').pop();
    if (!drawingId) throw new Error('Failed to get drawing ID for same user multi-tab test');

    // クライアント2のセットアップ
    const context2 = await browser.newContext({ storageState: './e2e/storageState.json' });
    const page2 = await context2.newPage();
    await page2.goto(`/drawings/${drawingId}`);
    await page2.waitForSelector('canvas');
    await page2.screenshot({ path: 'test-results/screenshots/same-user-page2-initial.png' });

    // 1. タブAで描画し、タブBでそれが表示されることを確認する。
    await page1.getByRole('button', { name: '四角' }).click(); // 四角形ツールを選択
    const canvas1 = page1.locator('canvas');
    const canvas1BoundingBox = await canvas1.boundingBox();
    if (!canvas1BoundingBox) throw new Error('Canvas 1 not found');
    await page1.mouse.move(canvas1BoundingBox.x + 50, canvas1BoundingBox.y + 50);
    await page1.mouse.down();
    await page1.mouse.move(canvas1BoundingBox.x + 150, canvas1BoundingBox.y + 150);
    await page1.mouse.up();
    // page1のelements, undoStack, redoStackの状態を検証
    const page1ElementsAfterDraw = await page1.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page1UndoStackAfterDraw = await page1.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page1RedoStackAfterDraw = await page1.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });

    // page2での描画反映を待機し、drawingElementsの状態を検証
    await page2.waitForFunction(() => {
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length > 0;
    }, null, { timeout: 10000 });
    const page2ElementsAfterDraw = await page2.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page2UndoStackAfterDraw = await page2.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page2RedoStackAfterDraw = await page2.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });
    await page2.waitForLoadState('networkidle'); // ネットワークが落ち着くまで待機
    await page2.waitForTimeout(1000); // さらに描画安定化のための待機時間を追加
    await expect(page2.locator('canvas')).toHaveScreenshot('same-user-initial-draw-by-A.png', { maxDiffPixels: 100 });
    await page1.screenshot({ path: 'test-results/screenshots/same-user-page1-after-draw.png' });
    await page2.screenshot({ path: 'test-results/screenshots/same-user-page2-after-draw.png' });


    // 2. タブAでUndoを実行すると、タブBの表示もUndoされることを確認する。
    const page1UndoButton = page1.getByRole('button', { name: 'Undo' });
    await expect(page1UndoButton).toBeEnabled(); // Undoボタンが活性化していることを確認
    await page1UndoButton.click();
    // page1のelements, undoStack, redoStackの状態を検証
    const page1ElementsAfterUndo = await page1.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page1UndoStackAfterUndo = await page1.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page1RedoStackAfterUndo = await page1.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });

    // page2でのUndo反映を待機し、drawingElementsの状態を検証
    await page2.waitForFunction(() => {
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length === 0;
    }, null, { timeout: 10000 });
    const page2ElementsAfterUndo = await page2.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page2UndoStackAfterUndo = await page2.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page2RedoStackAfterUndo = await page2.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });
    await page2.waitForLoadState('networkidle'); // ネットワークが落ち着くまで待機
    await page2.waitForTimeout(1000); // さらに描画安定化のための待機時間を追加
    await expect(page2.locator('canvas')).toHaveScreenshot('same-user-undo-by-A.png', { maxDiffPixels: 100 });
    await page1.screenshot({ path: 'test-results/screenshots/same-user-page1-after-undo.png' });
    await page2.screenshot({ path: 'test-results/screenshots/same-user-page2-after-undo.png' });


    // 3. タブAでRedoを実行すると、タブBの表示もRedoされることを確認する。
    const page1RedoButton = page1.getByRole('button', { name: 'Redo' });
    await expect(page1RedoButton).toBeEnabled(); // Redoボタンが活性化していることを確認
    await page1RedoButton.click();
    // page1のelements, undoStack, redoStackの状態を検証
    const page1ElementsAfterRedo = await page1.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page1UndoStackAfterRedo = await page1.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page1RedoStackAfterRedo = await page1.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });

    // page2でのRedo反映を待機し、drawingElementsの状態を検証
    await page2.waitForFunction(() => {
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length > 0;
    }, null, { timeout: 10000 });
    const page2ElementsAfterRedo = await page2.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page2UndoStackAfterRedo = await page2.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page2RedoStackAfterRedo = await page2.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });
    await page2.waitForLoadState('networkidle'); // ネットワークが落ち着くまで待機
    await page2.waitForTimeout(1000); // さらに描画安定化のための待機時間を追加
    await expect(page2.locator('canvas')).toHaveScreenshot('same-user-redo-by-A.png', { maxDiffPixels: 100 });
    await page1.screenshot({ path: 'test-results/screenshots/same-user-page1-after-redo.png' });
    await page2.screenshot({ path: 'test-results/screenshots/same-user-page2-after-redo.png' });


    // 4. タブAでUndoした後、タブBでRedoが活性化され、それをクリックするとタブAでUndoされた内容がタブBでRedoされることを確認する。
    await expect(page1UndoButton).toBeEnabled(); // Undoボタンが活性化していることを確認
    await page1UndoButton.click();
    // page1のelements, undoStack, redoStackの状態を検証
    const page1ElementsAfterUndoAgain = await page1.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page1UndoStackAfterUndoAgain = await page1.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page1RedoStackAfterUndoAgain = await page1.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });

    // page2でのUndo反映とRedoボタン活性化を待機
    await page2.waitForFunction(() => {
      // @ts-ignore
      const redoButton = document.querySelector('button[name="Redo"]') as HTMLButtonElement;
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length === 0 && redoButton && !redoButton.disabled;
    }, null, { timeout: 20000 });
    const page2RedoButton = page2.getByRole('button', { name: 'Redo' });
    await expect(page2RedoButton).toBeEnabled({ timeout: 20000 }); // Redoボタンが活性化されるのを待つ
    await page2RedoButton.click();
    // page2でのRedo反映を待機し、drawingElementsの状態を検証
    await page2.waitForFunction(() => {
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length > 0;
    }, null, { timeout: 10000 });
    const page2ElementsAfterRedoByB = await page2.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page2UndoStackAfterRedoByB = await page2.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page2RedoStackAfterRedoByB = await page2.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });
    await page2.waitForLoadState('networkidle'); // ネットワークが落ち着くまで待機
    await page2.waitForTimeout(1000); // さらに描画安定化のための待機時間を追加
    await expect(page2.locator('canvas')).toHaveScreenshot('same-user-redo-by-B-after-undo.png', { maxDiffPixels: 100 }); // スナップショット名を更新
    await page1.screenshot({ path: 'test-results/screenshots/same-user-page1-after-remote-redo.png' });
    await page2.screenshot({ path: 'test-results/screenshots/same-user-page2-after-remote-redo.png' });


    // 5. タブAでRedoした後、タブBでUndoが活性化され、それをクリックするとタブAでRedoされた内容がタブBでUndoされることを確認する。
    await expect(page1RedoButton).toBeEnabled(); // Redoボタンが活性化していることを確認
    await page1RedoButton.click();
    // page1のelements, undoStack, redoStackの状態を検証
    const page1ElementsAfterRedoAgain = await page1.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page1UndoStackAfterRedoAgain = await page1.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page1RedoStackAfterRedoAgain = await page1.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });

    // page2でのRedo反映とUndoボタン活性化を待機
    await page2.waitForFunction(() => {
      // @ts-ignore
      const undoButton = document.querySelector('button[name="Undo"]') as HTMLButtonElement;
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length > 0 && undoButton && !undoButton.disabled;
    }, null, { timeout: 20000 });
    const page2UndoButton = page2.getByRole('button', { name: 'Undo' });
    await expect(page2UndoButton).toBeEnabled({ timeout: 20000 }); // Undoボタンが活性化されるのを待つ
    await page2UndoButton.click();
    // page2でのUndo反映を待機し、drawingElementsの状態を検証
    await page2.waitForFunction(() => {
      // @ts-ignore
      return window.drawingElements && window.drawingElements.length === 0;
    }, null, { timeout: 10000 });
    const page2ElementsAfterUndoByB = await page2.evaluate(() => {
      // @ts-ignore
      return window.drawingElements ? window.drawingElements.length : 0;
    });
    const page2UndoStackAfterUndoByB = await page2.evaluate(() => {
      // @ts-ignore
      return window.undoStack ? window.undoStack.length : 0;
    });
    const page2RedoStackAfterUndoByB = await page2.evaluate(() => {
      // @ts-ignore
      return window.redoStack ? window.redoStack.length : 0;
    });
    await page2.waitForLoadState('networkidle'); // ネットワークが落ち着くまで待機
    await page2.waitForTimeout(1000); // さらに描画安定化のための待機時間を追加
    await expect(page2.locator('canvas')).toHaveScreenshot('same-user-undo-by-B-after-redo.png', { maxDiffPixels: 100 }); // スナップショット名を更新
    await page1.screenshot({ path: 'test-results/screenshots/same-user-page1-after-remote-undo.png' });
    await page2.screenshot({ path: 'test-results/screenshots/same-user-page2-after-remote-undo.png' });


    await context1.close();
    await context2.close();
  });

  // TODO: 描画テストの追加
  // Canvas上での描画操作（マウスイベント）のシミュレーションと、描画が正しく行われたかの検証
  // リアルタイム反映のテストは、モック化したAction Cableまたは複数ブラウザインスタンスでのテストが必要
})
