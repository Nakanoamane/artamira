import { test, expect } from "@playwright/test";

test.describe("DrawingList", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drawings");
  });

  test("should display a list of drawing boards and a creation button", async ({
    page,
  }) => {
    await expect(page.getByText("Boards")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "新規描画ボードを作成" })
    ).toBeVisible();
    // 既存の描画ボードが表示されていることを確認する（存在する場合）
    // await expect(page.locator('ul > li')).not.toHaveCount(0); // リストアイテムが存在するか
  });

  test("should navigate to new drawing board creation page", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "新規描画ボードを作成" }).click();
    await expect(page).toHaveURL("/drawings/new");
    await expect(page.getByText("新規描画ボードを作成")).toBeVisible();
  });

  test("should create a new drawing board and navigate to its detail page", async ({
    page,
  }) => {
    await page.goto("/drawings/new");
    const boardTitle = `テストボード_${Date.now()}`;
    await page.getByPlaceholder("描画ボードのタイトル").fill(boardTitle);
    await page.getByRole("button", { name: "作成" }).click();

    // 成功後、新しい描画ボードのURLにリダイレクトされることを期待
    await expect(page).toHaveURL(/\/drawings\/\d+/);
    await expect(page.getByRole('link', { name: boardTitle })).toBeVisible(); // 作成したボードのタイトルが表示されていることを確認
  });

  test("should navigate to an existing drawing board detail page", async ({
    page,
  }) => {
    // まず、描画ボードを作成し、そのIDを取得する
    await page.goto("/drawings/new");
    const existingBoardTitle = `既存ボード_${Date.now()}`;
    await page
      .getByPlaceholder("描画ボードのタイトル")
      .fill(existingBoardTitle);
    await page.getByRole("button", { name: "作成" }).click();

    // リダイレクトされたURLからIDを取得
    // 描画ボード詳細ページに遷移するまで待機
    await page.waitForURL(/\/drawings\/\d+/);
    const newBoardId = page.url().split("/").pop();

    // 一覧ページに戻る
    await page.goto("/drawings");
    await expect(page.getByText("Boards")).toBeVisible();
    // 描画ボードがリストに表示されるまで待機
    await page.getByRole('link', { name: existingBoardTitle }).waitFor({ state: 'visible' });

    // 作成したボードへのリンクをクリック
    await page.getByRole('link', { name: existingBoardTitle }).click();

    // 既存の描画ボード詳細ページに遷移したことを確認
    await expect(page).toHaveURL(`/drawings/${newBoardId}`);
    await expect(page.getByRole('link', { name: existingBoardTitle })).toBeVisible();
  });
});
