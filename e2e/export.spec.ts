import { test, expect } from '@playwright/test';

test.describe('Export Functionality', () => {
  let drawingId: string;

  test.beforeEach(async ({ page }) => {
    // 新しい描画ボードを作成してIDを取得
    await page.goto('/drawings');

    await page.waitForSelector('a:has-text("新規描画ボードを作成")');
    await page.click('a:has-text("新規描画ボードを作成")');
    await page.fill('input[placeholder="新しい描画ボードのタイトル"]', 'テスト描画ボード');
    await page.click('button:has-text("作成")');

    // 新しい描画ボードのURLに遷移したことを確認し、IDを抽出
    await page.waitForURL(/\/drawings\/\d+/, { timeout: 15000 });
    drawingId = page.url().split('/').pop() || '';
    expect(drawingId).not.toBe('');

    // 描画ボードのUIが完全にロードされるのを待機
    await expect(page.locator('label:has-text("ツール")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ペン')).toBeVisible({ timeout: 15000 });

    // キャンバスに何かを描画 (エクスポート対象のデータを作成)
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'red';
          ctx.fillRect(10, 10, 50, 50);
        }
      }
    });

    // エクスポートモーダルを開く
    const exportButton = page.locator('button:has-text("エクスポート")');
    await expect(exportButton).toBeEnabled({ timeout: 15000 });
    await exportButton.click();
    await expect(page.locator('h3:has-text("エクスポート")')).toBeVisible();
  });

  test('should successfully export drawing as PNG', async ({ page }) => {
    // ダウンロードを待機してからPNGボタンをクリック
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('png-export-button').click();
    const download = await downloadPromise;

    // ダウンロードされたファイル名の検証
    // ファイル名は 'untitled.png' になることを想定 (描画ボードのタイトルが設定されていない場合)
    // 描画ボードのタイトルを設定する機能がないため、現状は'untitled'がデフォルト
    expect(download.suggestedFilename()).toMatch(/\.png$/);

    // TODO: ダウンロードされたファイルの中身を検証（Playwright単体では困難なため、必要であれば外部ライブラリを検討）
    // 例: const path = await download.path();
    //    expect(fs.existsSync(path)).toBeTruthy();
    //    // 画像ヘッダーなどを検証するライブラリを使用
  });

  test('should successfully export drawing as JPEG', async ({ page }) => {
    // ダウンロードを待機してからJPEGボタンをクリック
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('jpeg-export-button').click();
    const download = await downloadPromise;

    // ダウンロードされたファイル名の検証
    expect(download.suggestedFilename()).toMatch(/\.jpeg$/);
  });
});
