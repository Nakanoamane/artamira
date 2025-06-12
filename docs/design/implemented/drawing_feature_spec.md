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

## 7. バグ修正の経緯と現在の設計

これまでの開発段階で発生した描画ボード機能のバグとその修正について、経緯と現在の設計をまとめます。

### 7.1. 元の設計における不具合

以下の二つの主要な問題がありました。

1.  **リロード後に以前の描画が消える/新しい描画を追加すると以前の描画が表示されなくなる問題**:
    *   **根本原因**: `drawing_elements` テーブルに `temp_id` カラムが永続化されていたこと、およびフロントエンドの `frontend/src/hooks/useDrawingElements.ts` 内の `isSelfBroadcastedElement` 判定ロジックに不備があったことです。
    *   `temp_id` がデータベースに保存されることで、本来一時的なIDであるべきものが永続的なIDと混同され、リロード後に要素の識別が正しく行われない問題が発生しました。
    *   `isSelfBroadcastedElement` の判定が不正確だったため、Action Cableで受信した要素が自身が描画したもの（サーバーで永続化されて返ってきたもの）であるにも関わらず、新しい要素として重複して追加されたり、逆に正しく更新されなかったりする問題が発生していました。

2.  **ユーザーAの描画がユーザーBの画面に表示されない問題 (リアルタイム同期の問題)**:
    *   **根本原因**: `drawing_elements` テーブルから `temp_id` カラムを削除したにも関わらず、バックエンドの `DrawingElement` モデルが `temp_id` を仮想属性として認識しておらず、Action Cableを介したブロードキャストのペイロードに `temp_id` が含まれていなかったことです。
    *   `app/channels/drawing_channel.rb` の `draw` メソッド内で `drawing_element.create!(temp_id: data['temp_id'])` のように直接 `create!` に `temp_id` を渡していたため、データベースカラムではない `temp_id` は無視され、モデルインスタンスに設定されませんでした。結果として、ブロードキャストされるJSONに `temp_id` が含まれず、フロントエンドでの `isSelfBroadcastedElement` 判定が機能しませんでした。

### 7.2. 実施した修正

上記の不具合を解消するために、以下の修正を行いました。

1.  **バックエンド: `drawing_elements` テーブルからの `temp_id` カラム削除**:
    *   `db/migrate/20250612144816_remove_temp_id_from_drawing_elements.rb` マイグレーションを実行し、データベースから `temp_id` カラムを完全に削除しました。
2.  **バックエンド: `DrawingElement` モデルへの `temp_id` 仮想属性の追加**:
    *   `app/models/drawing_element.rb` に `attr_accessor :temp_id` を追加し、`temp_id` を仮想属性として定義しました。これにより、`temp_id` はデータベースに永続化されることなく、モデルインスタンスのライフサイクル中に値を保持できるようになり、ブロードキャスト時に利用可能になりました。
3.  **バックエンド: `DrawingChannel#draw` メソッドの修正**:
    *   `app/channels/drawing_channel.rb` の `draw` メソッドで、`drawing_element = @drawing.drawing_elements.new(...)` でインスタンスを作成し、その後 `drawing_element.temp_id = data['temp_id']` で仮想属性に `temp_id` を設定し、`drawing_element.save!` で保存するように変更しました。これにより、データベースに永続化される `id` と同時に、フロントエンドから送られてきた `temp_id` もモデルインスタンスに保持され、ブロードキャスト時に含められるようになりました。
    *   ブロードキャストの際に `drawing_element.as_json(methods: [:temp_id])` を使用し、`temp_id` が確実にJSONペイロードに含まれるようにしました。
4.  **フロントエンド: `useDrawingChannelIntegration.ts` の修正**:
    *   `sendDrawingElement` 関数内で、`newElement.id`（永続ID）と `newElement.temp_id`（一時ID）をそれぞれ適切に送信するように変更しました。これにより、バックエンドが両方のIDを正確に受け取れるようになりました。
5.  **フロントエンド: `useDrawingElements.ts` の修正**:
    *   `addDrawingElementFromExternalSource` 関数内の `isSelfBroadcastedElement` 判定ロジックを修正しました。具体的には、受信した要素の `id` が数値であり（永続IDが割り当てられている）、かつ `temp_id` が存在し、現在の `drawingElements` の中にその `temp_id` を持つ要素が存在する場合に「自己ブロードキャストされた要素」とみなすようにしました。これにより、自身が描画してサーバーで永続化されて返ってきた要素が、既存の一時的な要素と正しく置き換えられ、重複を回避しました。

### 7.3. 修正後の設計

上記の修正により、描画ボード機能の設計は以下のようになりました。

*   **永続IDと一時IDの明確な分離**:
    *   データベースに保存される `DrawingElement` は、データベースによって割り当てられた永続的な `id` のみを持ちます。
    *   一時的な描画要素の識別、およびリアルタイム同期時の自己ブロードキャストされた要素の更新のために、フロントエンドでは `temp_id`（`temp-`プレフィックス付きの文字列）を使用します。
    *   バックエンドの `DrawingElement` モデルには `temp_id` が仮想属性として追加され、データベースに永続化されることなく、モデルインスタンスのライフサイクル中に一時的なIDを保持できます。
*   **Action Cable を介した正確なリアルタイム同期**:
    *   新規描画要素がフロントエンドからバックエンドに送信される際、永続ID（もしあれば）と一時IDの両方が送信されます。
    *   バックエンドは要素を永続化し、その際にデータベースによって永続IDが割り当てられます。
    *   バックエンドは、この永続IDと、受信した一時ID（仮想属性として設定されたもの）の両方を含むJSONペイロードを、接続している全てのクライアントにブロードキャストします。
*   **フロントエンドでの賢明な要素処理**:
    *   `useDrawingElements` の `addDrawingElementFromExternalSource` 関数は、Action Cableで受信した要素が「自身が描画したもので、サーバーで永続化されて返ってきたもの」なのか、「他のユーザーが描画した新規要素」なのかを、受信した永続IDと一時IDを組み合わせて正確に判定します。
    *   自己ブロードキャストされた要素の場合は、既存の一時的な要素を永続IDを持つ要素で置き換え、重複を回避します。
    *   他のユーザーの新規要素の場合は、素直に描画要素リストに追加します。

この新しい設計により、リロード後の描画の保持、および複数ユーザー間での描画のリアルタイム同期が正確に行われるようになりました。

---
