# Canvas.tsx リファクタリング設計書

## 1. 目的

`frontend/src/components/Canvas.tsx` の保守性、可読性、およびテスト容易性を向上させることを目的とします。特に、以下の課題に対する改善を目指します。

- `canvasRef` と `localCanvasRef` の冗長な使用。
- 描画ロジックとReactコンポーネントのロジックの密結合。

## 2. 変更内容

### 2.1. `canvasRef` と `localCanvasRef` の統合

#### 現状

`Canvas` コンポーネントは `canvasRef` を `props` として受け取り、それを `localCanvasRef` という内部変数に代入して使用しています。

```typescript
// ...
const localCanvasRef = canvasRef; // Propとして渡されたrefを使用
// ...
```

#### 改善案

`canvasRef` を直接使用するように変更し、`localCanvasRef` の宣言を削除します。

#### メリット

- コードの冗長性を排除し、可読性を向上させます。
- 変数の数を減らし、コンポーネントの理解を容易にします。

#### デメリット

- なし。

### 2.2. 描画ロジックの分離

#### 現状

`drawElement` および `drawElements` 関数が `Canvas.tsx` コンポーネント内に定義されており、キャンバスへの描画ロジックがコンポーネントと密結合しています。

#### 改善案

キャンバスへの描画に特化したユーティリティ関数を新しいファイル（例: `frontend/src/utils/canvasDrawing.ts`）に分離します。

**新しいファイル: `frontend/src/utils/canvasDrawing.ts`**

```typescript
import { DrawingElementType, Point } from './drawingElementsParser';

/**
 * 単一の描画要素をキャンバスに描画します。
 * @param ctx CanvasRenderingContext2D オブジェクト
 * @param element 描画する要素
 */
export const drawElement = (
  ctx: CanvasRenderingContext2D,
  element: DrawingElementType
) => {
  try {
    ctx.beginPath();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.brushSize;

    if (element.type === 'line' && element.color === '#FFFFFF') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (element.type === 'line') {
      if (element.points.length > 0) {
        ctx.moveTo(element.points[0].x, element.points[0].y);
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y);
        }
      }
    } else if (element.type === 'rectangle') {
      const width = element.end.x - element.start.x;
      const height = element.end.y - element.start.y;
      ctx.rect(element.start.x, element.start.y, width, height);
    } else if (element.type === 'circle') {
      ctx.arc(element.center.x, element.center.y, element.radius, 0, 2 * Math.PI);
    }

    ctx.stroke();
    ctx.closePath();
  } catch (error) {
    console.error('描画中にエラーが発生しました:', error);
  }
};

/**
 * 複数の描画要素と一時描画要素をキャンバスに描画します。
 * @param ctx CanvasRenderingContext2D オブジェクト
 * @param canvas HTMLCanvasElement オブジェクト
 * @param drawingElements 描画する要素の配列
 * @param tempDrawingElement 一時描画要素 (存在する場合)
 */
export const drawAllElements = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  drawingElements: DrawingElementType[],
  tempDrawingElement: DrawingElementType | null
) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawingElements.forEach(element => {
    drawElement(ctx, element);
  });
  if (tempDrawingElement) {
    drawElement(ctx, tempDrawingElement);
  }
};
```

**`frontend/src/components/Canvas.tsx` の変更**

- `drawElement` と `drawElements` 関数を削除し、`frontend/src/utils/canvasDrawing.ts` からインポートします。
- `useEffect` および `useCallback` 内で、インポートした関数を使用するように変更します。

#### メリット

- **関心事の分離 (Separation of Concerns)**: 描画ロジックがコンポーネントから独立し、コンポーネントは状態管理とイベントハンドリングに集中できます。
- **再利用性**: 描画ロジックを他のコンポーネントや異なる描画コンテキストで簡単に再利用できるようになります。
- **テスト容易性**: 描画ユーティリティ関数を独立してテストできるようになります。

#### デメリット

- 新しいファイルが追加され、ファイル構造がわずかに複雑になります。

## 3. テスト計画

### 3.1. 既存のユニットテストの実行と確認

リファクタリング前と後に、既存のユニットテスト (`frontend/src/tests/components/Canvas.test.tsx`) を実行し、すべてのテストがパスすることを確認します。

#### テスト実行方法（`README.md` を参照）

`README.md` に記載のテスト実行コマンドを使用します。通常、以下のコマンドです。

```bash
npm test
# または
yarn test
```

### 3.2. 新規ユニットテストの作成

`frontend/src/utils/canvasDrawing.ts` で定義された `drawElement` および `drawAllElements` 関数に対して、新しいユニットテストファイル（例: `frontend/src/tests/utils/canvasDrawing.test.ts`）を作成します。

#### テスト観点

- `drawElement` が様々な `DrawingElementType`（line, rectangle, circle）を正しく描画すること。
- `drawElement` が色 (`strokeStyle`) やブラシサイズ (`lineWidth`) を正しく適用すること。
- `drawElement` が消しゴムの場合に `globalCompositeOperation` を `destination-out` に設定すること。
- `drawAllElements` が `clearRect` を呼び出し、すべての描画要素と一時描画要素を正しく描画すること。

## 4. 実装手順

1. `docs/design/Canvas_refactoring_design.md` ファイルを作成し、この設計書の内容を記述します。
2. `frontend/src/utils/canvasDrawing.ts` ファイルを作成し、描画ロジックを移動します。
3. `frontend/src/components/Canvas.tsx` を修正し、`localCanvasRef` の削除と、描画ロジックのインポート/利用に切り替えます。
4. 既存のユニットテストを実行し、デグレーションがないことを確認します。
5. `frontend/src/tests/utils/canvasDrawing.test.ts` ファイルを作成し、新しい描画ユーティリティ関数のユニットテストを実装します。

## 5. ロールバック計画

もしリファクタリング中に重大な問題が発生した場合、または期待される結果が得られない場合は、Gitの履歴を用いて以前のコミット状態に戻すことでロールバックします。

```bash
git log
git reset --hard <commit_hash_before_refactoring>
```
