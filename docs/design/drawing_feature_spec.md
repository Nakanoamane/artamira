# 描画ボード機能の要件・仕様まとめ

このドキュメントは、Artamira アプリケーションの描画ボード機能における一部の仕組みと仕様を、現在のプロジェクトファイルに基づいてまとめたものです。

---

## 1. ページを表示したときに取得する仕組み

描画ボードページ (`frontend/src/pages/DrawingBoard.tsx`) が表示されると、描画データの取得と初期化が行われます。

1.  **`DrawingBoard.tsx` からのデータ取得トリガー**:
    *   `DrawingBoard.tsx` コンポーネントは `useDrawingPersistence` フック (`frontend/src/hooks/useDrawingPersistence.ts`) を利用して描画データを取得します。このフックは `drawingId` パラメータに基づいて動作します。
2.  **`useDrawingPersistence` によるAPI呼び出し**:
    *   `useDrawingPersistence` 内部の `useEffect` が、指定された `drawingId` に基づいてバックエンドAPI (`/api/v1/drawings/:id`) にフェッチリクエストを送信します。
    *   **APIエンドポイント**: `app/controllers/api/v1/drawings_controller.rb` の `Api::V1::DrawingsController#show` アクションがこのリクエストを処理します。
3.  **バックエンドでのデータ処理**:
    *   `show` アクションでは、まず対象の `Drawing` オブジェクトが取得されます。
    *   `last_saved_at` が存在する場合、その日時以降に作成された `DrawingElement` (増分データ) が `@drawing_elements_after_save` として取得されます。`last_saved_at` がない場合は、全ての `DrawingElement` が取得されます。
    *   **JSONレスポンス**: `app/views/api/v1/drawings/show.json.jbuilder` を使用して、描画データがJSON形式で返されます。これには、以下の情報が含まれます:
        *   `id`, `title`, `last_saved_at` (描画ボードの基本情報)
        *   `canvas_data` (過去に保存されたキャンバス全体のデータ。これは`DrawingElementType[]`のJSON文字列として保存されています。)
        *   `drawing_elements_after_save` (最後の保存以降に個別に追加された描画要素の配列。これは`DrawingElement`モデルの生データ形式です: `id`, `element_type`, `data`, `created_at`など)
4.  **フロントエンドでのデータ結合と初期化**:
    *   `useDrawingPersistence` は、受信したJSONデータから `canvas_data` をパースし、それに `drawing_elements_after_save` を結合して、最終的な `initialDrawingElements` 配列を作成します。
    *   この `initialDrawingElements` と `initialLastSavedAt` は `useDrawingPersistence` フックの戻り値として提供されます。

## 2. 初期表示の内容をCanvasに反映する仕組み

取得した描画データは、以下の流れでキャンバスに反映され、初期表示が行われます。

1.  **`DrawingBoard.tsx` から `useDrawingElements` への伝達**:
    *   `DrawingBoard.tsx` は、`useDrawingPersistence` から受け取った `initialDrawingElements` を `useDrawingElements` フック (`frontend/src/hooks/useDrawingElements.ts`) の `initialLoadedElements` 引数として渡します。
2.  **`useDrawingElements` でのステート初期化**:
    *   `useDrawingElements` は、内部の `drawingElements` ステートを `initialLoadedElements` で初期化します。
    *   また、`initialLoadedElements` が変更された場合に、`drawingElements` ステートを再初期化するための `useEffect` が存在します。
3.  **`DrawingBoard.tsx` から `Canvas` への伝達**:
    *   `DrawingBoard.tsx` は、`useDrawingElements` から提供される `drawingElements` ステートを `Canvas` コンポーネント (`frontend/src/components/Canvas.tsx`) の `drawingElements` プロパティとして渡します。
4.  **`Canvas.tsx` での描画**:
    *   `Canvas.tsx` 内部では、`drawingElements` プロパティが変更されるたびに `useEffect` がトリガーされます。
    *   この `useEffect` は `drawAllElements` 関数 (`frontend/src/utils/canvasDrawing.ts`) を呼び出します。
    *   `drawAllElements` はキャンバスを一度クリアし、`drawingElements` 配列内の全ての描画要素をループで取り出し、個別に `drawElement` 関数を使ってキャンバスに描画します。

## 3. 描画したときに内部で行われていること

ユーザーがキャンバス上で描画操作（例: ペンで線を引く）を行った際に、内部で以下の処理が行われます。

1.  **`Canvas.tsx` でのマウスイベント処理**:
    *   `handleMouseDown`: 描画開始を検知し、`isDrawing` ステートを `true` に設定。描画ツールの種類に応じて `tempDrawingElement` (一時的な描画要素) を初期化します。
    *   `handleMouseMove`: `isDrawing` が `true` の間、マウスの動きに応じて `tempDrawingElement` の形状や点を更新します。`requestAnimationFrame` を利用して描画の最適化を行います。
    *   `handleMouseUp` / `handleMouseLeave`: 描画終了を検知し、`isDrawing` ステートを `false` に設定。`tempDrawingElement` が存在する場合、`onDrawComplete` コールバックを呼び出し、一時描画要素を渡します。
2.  **`useDrawingElements` での描画完了処理 (`handleDrawComplete`)**:
    *   `Canvas.tsx` の `onDrawComplete` は `useDrawingElements` の `handleDrawComplete` にマッピングされています。
    *   `handleDrawComplete` は、新しい描画要素が追加される前に、現在の `drawingElements` の状態を `undoStack` にプッシュします。
    *   `redoStack` をクリアします。
    *   `isDirty` フラグを `true` に設定します。
    *   `drawingElements` ステートに新しい描画要素 (`temp_id` 付き) を追加します。
    *   `onNewElementCreated` コールバック (後述の「描画要素を配信する仕組み」で利用) を呼び出します。

## 4. 描画要素をCanvasに反映する仕組み

`drawingElements` ステートの変更が、キャンバス上の表示に反映される仕組みです。

1.  **`useDrawingElements` ステートの更新**:
    *   `handleDrawComplete` (新規描画の追加)、`handleUndo`、`handleRedo`、`addDrawingElementFromExternalSource` (外部からの受信) など、`useDrawingElements` 内の任意の操作によって `drawingElements` ステートが更新されます。
2.  **プロパティの伝播**:
    *   `DrawingBoard.tsx` は、常に `useDrawingElements` からの最新の `drawingElements` を `Canvas` コンポーネントの `drawingElements` プロパティとして渡しています。
3.  **`Canvas.tsx` での再描画**:
    *   `Canvas.tsx` の `drawingElements` プロパティが変更されると、`useEffect` が再実行されます。
    *   この `useEffect` は `drawAllElements` 関数を呼び出し、キャンバスをクリアして、更新された `drawingElements` 配列内の全ての要素を再描画します。

## 5. 描画要素を配信する仕組み

ユーザーが新規描画を行うと、その要素はリアルタイムで他の接続ユーザーに配信されます。

1.  **`DrawingBoard.tsx` でのコールバック設定**:
    *   `DrawingBoard.tsx` は `useDrawingElements` に `onNewElementCreatedCallback` を渡します。このコールバックは `sendDrawingElement` 関数を呼び出します。
2.  **`useDrawingChannelIntegration` によるAction Cableへの送信**:
    *   `sendDrawingElement` 関数は、`useDrawingChannelIntegration` フック (`frontend/src/hooks/useDrawingChannelIntegration.ts`) から提供されます。
    *   この関数は、Action Cable を介してバックエンドの `DrawingChannel` に `draw` アクションを送信します。送信されるデータには、描画要素の `element_type`、`element_data`、および `temp_id` が含まれます。
3.  **バックエンド `DrawingChannel` での処理**:
    *   `app/channels/drawing_channel.rb` の `DrawingChannel#draw` メソッドがこのアクションを受け取ります。
    *   受信したデータを使用して、新しい `DrawingElement` レコードをデータベースに作成します。この際、データベースによって永続的な `id` が割り当てられます。
    *   新しく作成された `DrawingElement` (永続的な `id` と元の `temp_id` を含む) は、`DrawingChannel.broadcast_to` を使って、同じ描画ボードに接続している全てのクライアントにブロードキャストされます。ブロードキャストのタイプは `'drawing_element_created'` です。

## 6. 受信した描画要素をCanvasに反映する仕組み

他のユーザーが描画した要素、または自身が描画した要素がバックエンドで永続化されて返ってきたものを受け取った際に、キャンバスに反映される仕組みです。

1.  **`useDrawingChannelIntegration` でのAction Cable受信**:
    *   `useDrawingChannelIntegration` フックは、Action Cable チャネル (`drawing_#{@drawing.id}`) を購読しています。
    *   `'drawing_element_created'` タイプのメッセージを受信すると、`addDrawingElement` コールバックを呼び出します。このコールバックは `DrawingBoard.tsx` で `useDrawingElements` の `addDrawingElementFromExternalSource` にマッピングされています。
2.  **`useDrawingElements` での外部要素追加処理 (`addDrawingElementFromExternalSource`)**:
    *   `addDrawingElementFromExternalSource` は、受信した描画要素 (`element`) を処理します。
    *   `redoStack` をクリアし、`isDirty` フラグを `true` に設定します。
    *   **自己ブロードキャストされた要素の更新**: 受信した `element` に永続的な `id` があり、かつ現在の `drawingElements` の中に同じ `temp_id` を持つ要素が存在する場合（つまり、自身が描画した要素がサーバーで永続化されて返ってきた場合）、既存の `temp_id` 付き要素を、受信した `id` 付き要素で置き換えるために `drawingElements` を `map` して更新します。
    *   **他ユーザーからの新規要素の追加**: 上記の条件に当てはまらない場合（他ユーザーが描画した新規要素の場合など）、現在の `drawingElements` の状態を `undoStack` にプッシュし、受信した `element` を `drawingElements` に追加します。
3.  **`Canvas.tsx` での再描画**:
    *   `drawingElements` ステートが更新されると、前述の「描画要素をCanvasに反映する仕組み」と同様に `Canvas` コンポーネントが再描画され、全ての描画要素（初期ロードされたもの、自身が新規描画したもの、他ユーザーから受信したもの）がキャンバスに表示されます。

---

## バグの事象（解決ずみ）

1.  描画をして保存する
2.  画面をリロードする。保存した内容が表示される。
3.  新たに描画する
4.  2で表示されていた内容が表示されなくなり、3で描画した内容だけが表示される

正しくは、2、3どちらの内容も表示されるべき。

## これまでの調査からたてた知見・仮説

*   ~~サーバーから返ってきた「永続化された」要素が、すでに `drawingElements` に存在している初期ロードされた要素と同じと誤認される~~
*   ~~新規描画された要素が自己ブロードキャストされたときに、既存の要素を更新するのではなく、新しい要素として追加すべきなのに、上書きしてしまっている~~
*   描画データがメモリ上では正しく存在しても、何らかの理由で `Canvas` に正しく描画されていない
*   `Canvas` へのプロパティ伝達後に別の要因でデータが変更されている

- 描画データはフロントエンドのステート（drawingElements）内では正しく保持されている。 ページリロード後も新規描画後も、配列の要素数は期待通りに増減しており、過去の描画も新規描画も、配列には含まれています。
- バックエンドからのデータロードも正しく結合されている。 canvas_data と drawing_elements_after_save が結合されて initialDrawingElements が生成されるプロセスも問題ありません。

このことから、当初の仮説のうち、「描画データがメモリ上では正しく存在しても、何らかの理由でCanvasに正しく描画されていない」 または 「Canvasへのプロパティ伝達後に別の要因でデータが変更されている」 という可能性が最も高くなりました。
