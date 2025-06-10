# DrawingBoard.tsx リファクタリング設計書 (v2)

## 1. 目的

`frontend/src/pages/DrawingBoard.tsx` は、初回のリファクタリングにより描画ボード機能の多くのロジックがカスタムフックに抽出され、コードの可読性、保守性、テスト容易性が大幅に向上しました。本設計書 (v2) では、さらなるコード品質の向上を目指し、以下の目的を達成するための追加のリファクタリング計画を提示します。

-   **コードの簡潔性向上**: 不要な重複や複雑な条件分岐を解消し、コンポーネントのロジックをよりシンプルにする。
-   **責務の明確化の徹底**: `DrawingBoard.tsx` がUIのオーケストレーションに専念できるよう、関連性の高いロジックを適切なフックまたはコンポーネントに再配置する。
-   **型定義の適切な管理**: 型定義を適切なファイルに配置し、再利用性と見通しを向上させる。

## 2. 既存のコードの確認とデグレード防止

追加のリファクタリングも、既存の機能を損なわないように慎重に進めます。以下の点に特に注意し、デグレードがないことを確認します。

-   **現状の機能**:
    -   描画ツールの選択（ペン、色、ブラシサイズ）
    -   リアルタイム描画（Action Cable経由での送受信）
    -   描画データの初期読み込みと表示
    -   描画データの保存
    -   Undo/Redo機能
    -   エクスポート機能（PNG/JPEG）
    -   ページ離脱時の警告（`useDrawingPersistence` にて管理）
    -   ローディング・エラー表示
-   **既存のテスト**:
    -   `frontend/src/tests/pages/DrawingBoard.test.ts` に存在するユニットテストがリファクタリング後も全てパスすることを確認します。
    -   新しく作成された各カスタムフックのユニットテスト (`useDrawingTools.test.ts`, `useDrawingElements.test.ts`, `useDrawingPersistence.test.ts`, `useDrawingChannelIntegration.test.ts`, `useDrawingExport.test.ts`) も全てパスすることを確認します。
    -   `drawingElementsParser.test.ts` もパスすることを確認します。

#### テスト実行方法

`README.md` に記載の通り、以下のコマンドでフロントエンドのテストを実行します。

```bash
docker compose exec frontend npm test
# または
docker compose exec frontend npx vitest run [対象ファイル]
```

## 3. リファクタリング計画

### 3.1. 主要なカスタムフックの抽出（現状維持）

以下のカスタムフックは既に抽出済みであり、今回のリファクタリングで大きな変更はありません。

-   `useDrawingTools.ts`: 描画ツールの状態管理。
-   `useDrawingElements.ts`: 描画要素の状態、Undo/Redoスタック管理、描画完了時の処理。
-   `useDrawingPersistence.ts`: 描画データのフェッチ、保存、ダーティ状態、最終保存時刻管理。
-   `useDrawingChannelIntegration.ts`: Action Cableチャネルとの連携（受信データ処理と描画データ送信）。
-   `useDrawingExport.ts`: キャンバスのエクスポート機能。

### 3.2. ヘルパー関数の抽出（現状維持）

-   `utils/drawingElementsParser.ts`: 描画要素のデータパースロジック。

### 3.3. `DrawingBoard.tsx` の追加変更点

`DrawingBoard.tsx` のさらなる簡潔化と責務の明確化のため、以下の変更を行います。

#### a. ローディング・エラー表示ロジックの整理

-   **現状**: ローディングとエラーの表示ロジックがコンポーネントのトップレベル（`if (loadingDrawing)`）とJSX内（`{loadingDrawing ? (...) : errorDrawing ? (...) : (...) }`）で重複している。
-   **変更内容**: コンポーネントのトップレベルで早期リターンを使用して、ローディング中とエラー発生時の表示を完全に分離します。
-   **影響**: JSXが簡潔になり、メインの描画ボードUIのレンダリングロジックが明確になる。

#### b. `isDrawing` ステートの移動

-   **現状**: `isDrawing` ステートが `DrawingBoard.tsx` で管理されている。
-   **変更内容**: `isDrawing` ステートとその管理ロジック (`setIsDrawing`) を、より密接に関連する `frontend/src/components/Canvas.tsx` コンポーネントの内部に移動します。
-   **影響**: `DrawingBoard.tsx` の責務がよりUIのオーケストレーションに集中し、`Canvas.tsx` が自身の描画状態を自己完結的に管理できるようになる。

#### c. `Drawing` インターフェースの移動

-   **現状**: `interface Drawing { ... }` が `DrawingBoard.tsx` の内部で定義されている。
-   **変更内容**: `Drawing` インターフェースを、このインターフェースが最も利用されている `frontend/src/hooks/useDrawingPersistence.ts` のファイル内に移動します。
-   **影響**: 型定義の配置がより適切になり、関連するロジックと共に管理されるため、見通しが良くなる。

#### d. 認証チェックの `useEffect` の整理

-   **現状**: `useEffect(() => { // TODO: 認証チェック }, [navigate]);` が `DrawingBoard.tsx` に残っており、TODOコメントが付いている。
-   **変更内容**: この `useEffect` を削除します。認証ロジックはUIコンポーネントの直接の責務ではないため、将来的に具体的な認証システムを導入する際に、認証機能に特化したカスタムフックや、ルーティングレベルでの認証ガード (例: React Router の `loader` や `auth context` ) を使用して実装することを推奨します。
-   **影響**: `DrawingBoard.tsx` が認証という関心事から完全に分離され、コンポーネントの関心がより明確になる。

### 3.4. 新しいファイル構造（追加変更なし）

主要なファイル構造は初回リファクタリングで確立済みのため、大きな変更はありません。

```
frontend/
└── src/
    ├── pages/
    │   └── DrawingBoard.tsx (追加変更後)
    ├── hooks/
    │   ├── useDrawingTools.ts
    │   ├── useDrawingElements.ts
    │   ├── useDrawingPersistence.ts (Drawingインターフェース移動)
    │   ├── useDrawingChannelIntegration.ts
    │   └── useDrawingExport.ts
    ├── components/
    │   └── Canvas.tsx (isDrawingステート移動)
    └── utils/
        └── drawingElementsParser.ts
```

## 4. テスト計画

### 4.1. 既存のユニットテストの確認

リファクタリング中および完了後、以下のテストが全てパスすることを確認します。

-   `frontend/src/tests/pages/DrawingBoard.test.tsx` (既存の機能デグレード防止)
-   `frontend/src/tests/hooks/useDrawingTools.test.ts`
-   `frontend/src/tests/hooks/useDrawingElements.test.ts`
-   `frontend/src/tests/hooks/useDrawingPersistence.test.ts`
-   `frontend/src/tests/hooks/useDrawingChannelIntegration.test.ts` (意図的にスキップされた `unsubscribe` テストは `useDrawingChannel.test.ts` に移動するか、将来のテスト戦略で検討)
-   `frontend/src/tests/hooks/useDrawingExport.test.ts`
-   `frontend/src/tests/utils/drawingElementsParser.test.ts`

### 4.2. 新しく作成したファイルへのユニットテスト作成（今回は該当なし）

今回のリファクタリングでは、既存のフックやコンポーネント内でロジックの再配置を行うため、新たにテストファイルを作成する必要はありません。ただし、`Canvas.tsx` に `isDrawing` ステートを移動した場合、そのステートに関連するロジックのテストを `Canvas.test.tsx` に追加または調整する必要があるかもしれません。

## 5. 実装手順

1.  `frontend/src/pages/DrawingBoard.tsx` 内のローディング・エラー表示ロジックを、トップレベルでの早期リターンを使用するように修正します。
2.  `frontend/src/pages/DrawingBoard.tsx` から `isDrawing` ステートと `setIsDrawing` を削除し、`frontend/src/components/Canvas.tsx` に移動して管理します。
3.  `frontend/src/pages/DrawingBoard.tsx` から `interface Drawing { ... }` の定義を削除し、`frontend/src/hooks/useDrawingPersistence.ts` のファイル内に移動します。
4.  `frontend/src/pages/DrawingBoard.tsx` 内の認証チェックに関する `useEffect` を削除します。
5.  全ての既存テストを実行し、デグレードがないことを確認します。

## 6. リファクタリング後の効果

今回の追加リファクタリングにより、以下の効果が期待されます。

-   **コンポーネントの純粋性向上**: `DrawingBoard.tsx` がUIのレンダリングとカスタムフックの統合という純粋な責務に集中する。
-   **コードの見通し改善**: 重複ロジックの排除とコンポーネント内ロジックの削減により、コードベースの理解が容易になる。
-   **テストの簡素化**: 各モジュールがより単一の責務を持つことで、テストがよりシンプルで焦点を絞ったものになる。
-   **長期的な保守性の向上**: 各部分の変更が他の部分に与える影響がさらに最小限になる。
