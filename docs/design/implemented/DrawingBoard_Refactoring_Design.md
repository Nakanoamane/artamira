# DrawingBoard.tsx リファクタリング設計書

## 1. 目的

`frontend/src/pages/DrawingBoard.tsx` は現在、描画ボード機能に関する多岐にわたるロジック（描画状態管理、リアルタイム通信、データ永続化、UIオーケストレーション、Undo/Redo、エクスポートなど）を単一のコンポーネントに集約しています。これにより、コードの可読性、保守性、テスト容易性が低下しています。

本設計書では、以下の目的を達成するために `DrawingBoard.tsx` のリファクタリング計画を提示します。

- **単一責任の原則の適用**: 各ロジックを独立したカスタムフックやヘルパー関数に分割し、コンポーネントの責務をUIのレンダリングと主要なイベントハンドリングに限定する。
- **関心の分離**: UI、データフェッチ、リアルタイム通信、ビジネスロジックを明確に分離する。
- **コードの再利用性向上**: 抽出したロジックを他のコンポーネントや将来の機能拡張で再利用可能にする。
- **テスト容易性の向上**: 各カスタムフックやヘルパー関数を独立してテストできるようにする。
- **可読性の向上**: コードブロックを短くし、各部分の機能を明確にする。
- **パフォーマンスの最適化**: `useCallback` の依存性最適化や `React.memo` の適用を検討する。
- **型安全性の向上**: `any` 型の使用を減らし、より厳密な型定義を適用する。

## 2. 既存のコードの確認とデグレード防止

リファクタリングは既存の機能を損なわないように慎重に進めます。特に以下の点に注意します。

- **現状の機能**:
    - 描画ツールの選択（ペン、色、ブラシサイズ）
    - リアルタイム描画（Action Cable経由での送受信）
    - 描画データの初期読み込み（`canvas_data` と `drawing_elements_after_save` の結合）
    - 描画データの保存
    - Undo/Redo機能
    - エクスポート機能（PNG/JPEG）
    - ページ離脱時の警告
    - ローディング・エラー表示
- **既存のテスト**:
    - `frontend/src/tests/pages/DrawingBoard.test.tsx` に存在するユニットテストがリファクタリング後も全てパスすることを確認します。これはデグレード防止のための最も重要な指標とします。

## 3. リファクタリング計画

### 3.1. 主要なカスタムフックの抽出

`DrawingBoard.tsx` のロジックを以下のカスタムフックに分割します。

#### a. `useDrawingTools.ts`

- **役割**: 描画ツールの状態（アクティブツール、色、ブラシサイズ）を管理し、それらを更新する関数を提供する。
- **抽出するステート/関数**:
    - `activeTool`, `setActiveTool`
    - `activeColor`, `setActiveColor`
    - `activeBrushSize`, `setActiveBrushSize`
- **依存関係**: なし

#### b. `useDrawingElements.ts`

- **役割**: 描画要素の状態、Undo/Redoスタック、描画完了時の処理を管理する。
- **抽出するステート/関数**:
    - `drawingElements`, `setDrawingElements`
    - `undoStack`, `setUndoStack`
    - `redoStack`, `setRedoStack`
    - `handleUndo`
    - `handleRedo`
    - `handleDrawComplete` (ただし、Action Cable送信ロジックは `useDrawingChannelIntegration.ts` に移動)
    - `setIsDirty` の呼び出し

#### c. `useDrawingPersistence.ts`

- **役割**: 描画ボードのデータフェッチ、保存、ダーティ状態、最終保存時刻を管理する。
- **抽出するステート/関数**:
    - `drawing`, `setDrawing`
    - `loadingDrawing`, `setLoadingDrawing`
    - `errorDrawing`, `setErrorDrawing`
    - `isDirty`, `setIsDirty`
    - `lastSavedAt`, `setLastSavedAt`
    - `fetchDrawingData` (API呼び出しロジック)
    - `handleSave` (API呼び出しロジック)
    - `useEffect` の `beforeunload` イベントリスナー

#### d. `useDrawingChannelIntegration.ts`

- **役割**: Action Cableチャネルとの連携（受信データの処理と描画データの送信）を管理する。
- **抽出するステート/関数**:
    - `handleReceivedData`
    - `channel.perform` 呼び出し（`handleDrawComplete` から移動）
    - `setActionCableError`
- **依存関係**: `drawingElements` (読み取り), `setDrawingElements`, `setUndoStack`, `setRedoStack`, `setIsDirty` (これらは `useDrawingElements` からプロパティまたはコールバックとして渡される)

#### e. `useDrawingExport.ts`

- **役割**: キャンバスのエクスポート機能に関連する状態とロジックを管理する。
- **抽出するステート/関数**:
    - `isExportModalOpen`, `setIsExportModalOpen`
    - `isExporting`, `setIsExporting`
    - `exportError`, `setExportError`
    - `handleExportClick`
    - `handleExport` (canvasRef へのアクセスを含む)

### 3.2. ヘルパー関数の抽出

- **描画要素のデータパース**: `handleReceivedData` と `fetchDrawingData` の両方で重複している `receivedActionCableData.drawing_element` や `data.drawing_elements_after_save` を `DrawingElementType` に変換するロジックを、`utils/drawingElementsParser.ts` のようなヘルパー関数として抽出します。

### 3.3. `DrawingBoard.tsx` の変更点

- 上記で定義したカスタムフックをインポートし、利用する。
- 各カスタムフックから返される状態と関数をコンポーネント内で使用する。
- UI要素（`Toolbar`, `Canvas`, `ExportModal`, `DrawingHeader`）へのプロップを、各カスタムフックから取得した値に置き換える。
- `useEffect` フックを整理し、各カスタムフック内で管理されるロジックはそこから削除する。

### 3.4. 新しいファイル構造

```
frontend/
└── src/
    ├── pages/
    │   └── DrawingBoard.tsx (リファクタリング後)
    ├── hooks/
    │   ├── useDrawingTools.ts (新規)
    │   ├── useDrawingElements.ts (新規)
    │   ├── useDrawingPersistence.ts (新規)
    │   ├── useDrawingChannelIntegration.ts (新規)
    │   └── useDrawingExport.ts (新規)
    └── utils/
        └── drawingElementsParser.ts (新規)
```

## 4. テスト計画

### 4.1. 既存のユニットテストの確認

リファクタリング中および完了後、`frontend/src/tests/pages/DrawingBoard.test.tsx` のテストが全てパスすることを確認します。

#### テスト実行方法

`README.md` に記載の通り、以下のコマンドでフロントエンドのテストを実行します。

```bash
docker compose exec frontend npm test
```
または
```bash
docker compose exec frontend npx vitest run src/tests/pages/DrawingBoard.test.tsx
```

### 4.2. 新しく作成したファイルへのユニットテスト作成

抽出した各カスタムフックおよびヘルパー関数に対して、専用のユニットテストファイルを作成します。これにより、各モジュールの単体での動作保証とテスト容易性を確保します。

#### a. `useDrawingTools.test.ts` (新規)

- `activeTool`, `activeColor`, `activeBrushSize` の初期値と、それぞれの `setActive` 関数による更新が正しく行われることをテスト。

#### b. `useDrawingElements.test.ts` (新規)

- `drawingElements` の追加、`handleUndo`, `handleRedo` が正しく動作し、`undoStack`, `redoStack` が適切に管理されることをテスト。
- `handleDrawComplete` が `drawingElements` を更新し、Undo/Redoスタックをクリアすることをテスト。
- `addDrawingElementFromExternalSource` が外部からの要素追加時に `drawingElements` とUndo/Redoスタックを正しく更新することをテスト。

#### c. `useDrawingPersistence.test.ts` (新規)

- `fetchDrawingData` がAPIからデータを取得し、`drawingElements`, `lastSavedAt`, `isDirty` などの状態を正しく更新することをテスト。
- `handleSave` がAPI呼び出しを行い、`isDirty` と `lastSavedAt` を更新することをテスト。
- `beforeunload` イベントリスナーが `isDirty` に応じて警告をトリガーすることをテスト。

#### d. `useDrawingChannelIntegration.test.ts` (新規)

- `sendDrawingElement` がAction Cableを通じて描画データを正しく送信することをテスト。
- `addDrawingElement` コールバックが受信した描画データを正しく渡し、Action Cableのエラーが適切に処理されることをテスト。

#### e. `useDrawingExport.ts` (新規)

- `handleExportClick` がモーダルを開く状態を正しく設定することをテスト。
- `handleExport` が `canvasRef` から `toDataURL` を呼び出し、ファイルをダウンロードするロジックを正しく実行することをテスト。成功時と失敗時の状態変化を確認。

#### f. `drawingElementsParser.test.ts` (新規)

- さまざまな形式の生データ（line, rectangle, circle）が `DrawingElementType` に正しく変換されることをテスト。
- 無効なデータが渡された場合の挙動をテスト。

## 5. 実装手順

1.  `utils/drawingElementsParser.ts` を作成し、関連するパースロジックを抽出する。
2.  `hooks/` ディレクトリ配下に各カスタムフックのファイルを新規作成する。
3.  各カスタムフックのファイルに、対応するロジックと状態を移動させる。
4.  `DrawingBoard.tsx` から、移動したロジックを削除し、代わりに新しいカスタムフックをインポートして利用する。
5.  `frontend/src/tests/pages/DrawingBoard.test.tsx` のテストを実行し、デグレードがないことを確認する。
6.  各カスタムフックおよびヘルパー関数に対応するユニットテストファイルを作成し、テストを実装する。
7.  全てのテストがパスすることを確認する。
8.  必要に応じて、`useCallback` の依存性配列の見直しや `React.memo` の適用を行う。
9.  型定義の厳密化を行う。

## 6. リファクタリング後の効果

- **高凝集・疎結合**: 各モジュールが単一の責務を持ち、相互の依存性が低減される。
- **変更容易性**: 特定の機能変更が他の部分に与える影響が最小限になる。
- **再利用性**: 抽出されたロジックは他のコンポーネントや将来の機能拡張で容易に再利用可能になる。
- **テスト容易性**: 各モジュールを独立してテストできるため、網羅性の高いテストカバレッジが実現できる。
- **可読性**: `DrawingBoard.tsx` 自体が簡潔になり、コンポーネントの役割が明確になる。

---
