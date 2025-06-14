# Undo/Redo機能の挙動に関する観察と要件

## 1. 現状の挙動（問題点）

Undo/Redo機能において、以下のような問題が観察されています。

1.  **描画アクション**: ユーザーがキャンバスに何かを描画します。
2.  **最初のUndoボタン押下**:
    *   Undoボタンが押下される。
    *   しかし、直前の描画は**元に戻らない**。
    *   Undoボタンは**まだ押せる状態**のままである。
3.  **二度目のUndoボタン押下**:
    *   再度Undoボタンが押下される。
    *   ようやく最初の描画が元に戻る。
    *   Redoボタンが押せる状態になるが、Undoボタンはまだ押せる可能性がある。
4.  **Redoボタン押下**:
    *   Redoボタンが押下される。
    *   最初の描画が再描画される。
    *   しかし、**Redoボタンはまだ押せる状態**のままである。

この現象により、Undo/Redoの履歴管理とボタンの活性状態が正しく連携していないことが示唆されます。特に、アクションが2回送信または受信されている、あるいは状態更新が適切に行われていない可能性があります。

## 2. 検証結果と修正点

### 2.1. 問題の特定

当初のUndo/Redo機能の問題は、以下の2点に集約されました。

1.  **描画要素とUndoスタックの重複**: 1回の描画操作で、`handleDrawComplete` と `addDrawingElementFromExternalSource` の両方が要素を `drawingElements` に追加し、`undoStack` に状態を積んでいました。特に、サーバーから返される描画要素に `temp_id` が含まれていないため、`addDrawingElementFromExternalSource` が自己ブロードキャストされた要素を正しく識別できず、重複して追加していました。
2.  **`handleUndo`/`handleRedo` ロジックの重複実行**: Undo/Redoボタンを1回クリックしても、対応する関数内部のロジックが2回実行されていました。

さらに、デバッグ中に `useDrawingElements` フックが複数回初期化されているように見える問題も確認されました。

### 2.2. 修正内容

上記の問題に対処するため、以下の修正を段階的に適用しました。

1.  **自己ブロードキャスト要素の重複排除**:
    *   `frontend/src/hooks/useDrawingElements.ts` に `pendingElementTempId` (useRef) を導入し、送信中の要素の `temp_id` を一時的に保持するようにしました。
    *   `addDrawingElementFromExternalSource` のロジックを修正し、`pendingElementTempId` を参照して自己ブロードキャストされた要素を識別し、その場合は `setUndoStack` を行わないようにしました。
    *   `frontend/src/hooks/useDrawingChannelIntegration.ts` を修正し、`pendingElementTempId` をプロパティとして受け取り、`handleReceivedData` 内で `temp_id` を比較して自己ブロードキャストされた要素の `addDrawingElement` 呼び出しをスキップするようにしました。
    *   `frontend/src/pages/DrawingBoard.tsx` を修正し、`useDrawingChannelIntegration` に `pendingElementTempId` を渡すようにしました。

2.  **`useDrawingElements` フックの再初期化問題の解決**:
    *   `useReducer` を `useDrawingElements.ts` に導入し、`useState` を `dispatch` アクションに置き換えました。
    *   `drawingReducer` に `SET_ELEMENTS` アクションを追加し、初期ロードされた要素が正しく設定され、Undo/Redoスタックも適切に初期化されるようにしました。
    *   `useDrawingElements` フック内で、`initialLoadedElements` の変更を監視し `SET_ELEMENTS` アクションをディスパッチする `useEffect` を追加しました。これにより、フックの再初期化ではなく、状態の更新として扱われるようになりました。

3.  **`handleUndo`/`handleRedo` の依存配列の修正**:
    *   `handleUndo` と `handleRedo` の `useCallback` 依存配列から `drawingElements` やスタックの `length` プロパティを削除し、代わりに `dispatch` と `state.undoStack.length`、`state.redoStack.length` を含めるように修正しました。

4.  **Linterエラーの解消**: 上記修正に伴い発生したLinterエラー（`pendingElementTempId` が型定義にない、`setRedoStack` が不要になった、`setDrawingElements` の型不一致など）を順次解消しました。

### 2.3. 検証結果

これらの修正を適用後、完全に新規のボードで描画-Undo-Redo操作を行った結果、以下の重要な進捗が確認されました。

*   **`handleDrawComplete` 関数の重複呼び出しが解消**され、ログが一度しか出力されなくなりました。
*   **`addDrawingElementFromExternalSource` による描画要素の重複追加が解消**され、`Self-broadcasted element received, skipping addDrawingElement` のログが表示されるようになりました。
*   **`handleUndo`/`handleRedo` 関数のロジックの重複実行が解消**され、ログが一度しか出力されなくなりました。
*   ユーザーの報告から、Undo/Redo操作が1回で効果を発揮し、Redoボタンの状態も正しく制御されるようになったことが確認できました。
*   当初懸念された `useDrawingElements` フックの複数回初期化のログも解消されました。

## 3. 期待される挙動

Undo/Redo機能は以下のように動作するべきです。

1.  **描画アクション**: ユーザーがキャンバスに何かを描画します。
2.  **Undoボタン押下**:
    *   Undoボタンが押下される。
    *   直前の描画が**元に戻る**。
    *   Undoボタンは**押せなくなる**（履歴がなくなる場合）。
    *   Redoボタンが押せる状態になる。
3.  **Redoボタン押下**:
    *   Redoボタンが押下される。
    *   元に戻された描画が**再描画される**。
    *   Redoボタンは**押せなくなる**（進む履歴がなくなる場合）。
    *   Undoボタンが押せる状態になる。

これにより、Undo/Redo操作が1回で完了し、ボタンの状態が履歴の有無に正しく連動するようになります。

## 4. 今回の修正によるデグレと新たな課題

今回のUndo/Redo機能の修正により、以下のデグレと新たな課題が確認されました。

1.  **描画してリロードすると、描画した内容が表示されない**:
    *   **原因**: この問題は、`useDrawingElements` フック内で `useReducer` を使用した状態管理において、`drawingReducer` の `SET_ELEMENTS` アクションが、本来 `DrawingState` インターフェースで `elements` と定義されている状態プロパティを誤って `drawingElements` として更新していたために発生しました。これにより、`useDrawingElements` フック内部で状態が正しく更新されても、その変更がフックから返される `drawingElements` に反映されず、結果として `DrawingBoard` コンポーネントに最新の描画要素が伝播されない状態でした。
    *   **修正方法**: `frontend/src/hooks/useDrawingElements.ts` 内の `drawingReducer` の `SET_ELEMENTS` アクションにおいて、状態を更新する際のプロパティ名を `drawingElements` から `elements` に修正しました。
    *   **修正完了**: この修正により、リロード後も描画された内容が正しく表示されることが確認されました。

2.  **画面AがUndoしたとき、画面BではUndoされない**: 複数画面で同じ描画ボードを共有している場合、ある画面がUndo操作を行っても、他の画面にはその変更が反映されません。これは、Undo/Redoの状態変化がWebSocketを通じて他のクライアントにブロードキャストされていないか、またはブロードキャストされたとしても他のクライアントでの適用処理に問題があることを示唆しています。
    *   **原因**:
        *   **フロントエンド側**: `frontend/src/hooks/useDrawingElements.ts` 内の `handleUndoWithBroadcast` および `handleRedoWithBroadcast` 関数において、`useReducer` の `dispatch` 処理が非同期であるため、`onUndoRedoAction` コールバックが呼び出される際に、`dispatch` による状態更新がまだ反映されていない古い `state.elements` （多くの場合、空の配列）を参照して送信していました。
        *   **バックエンド側**: `api/app/channels/drawing_channel.rb` に `undo_redo` アクションが定義されておらず、フロントエンドから送信されたUndo/RedoイベントがAction Cableを通じて他のクライアントにブロードキャストされていませんでした。
    *   **修正内容**:
        *   **フロントエンド側**: `frontend/src/hooks/useDrawingElements.ts` の `handleUndoWithBroadcast` と `handleRedoWithBroadcast` 関数内で、`onUndoRedoAction` の呼び出しを `setTimeout(..., 0)` でラップすることにより、`dispatch` による状態更新が完了した後のイベントループで `onUndoRedoAction` が実行され、最新の `state.elements` を参照してブロードキャストできるように修正しました。
        *   **バックエンド側**: `api/app/channels/drawing_channel.rb` に `undo_redo` アクションを追加し、フロントエンドから送信される `action_type` と `elements` データを受け取り、それを該当する描画ボードを購読しているすべてのクライアントにブロードキャストするように実装しました。
    *   **修正完了**: これらの修正により、描画要素のUndo/Redo操作がリアルタイムで他の画面に同期されることが確認できました。

3.  **Undoボタン押下後、Redoボタンが一瞬活性化し、すぐに非活性になる**: (および、タブBでUndo/Redoが非活性になる問題)
    *   **原因**: この問題は複数の要因が絡み合って発生していました。
        1.  **`APPLY_REMOTE_UNDO` / `APPLY_REMOTE_REDO` アクションの履歴リセット**: `frontend/src/hooks/useDrawingElements.ts` 内の `drawingReducer` における `APPLY_REMOTE_UNDO` および `APPLY_REMOTE_REDO` アクションが、外部からの要素更新を受け取った際に、そのタブの `undoStack` および `redoStack` をクリア（または初期状態にリセット）するように設計されていました。このため、リモートからのUndo/Redoアクションを受信すると、ローカルのRedo履歴が失われ、Redoボタンが非活性になっていました。
        2.  **Undo/Redoアクションの自己ブロードキャスト処理**: `frontend/src/hooks/useDrawingChannelIntegration.ts` において、`undo_redo_action` の自己ブロードキャストをスキップするロジックが一時的に削除されていました。このため、自身が発火したUndo/Redoアクションがサーバー経由で自分自身に「リモートアクション」として戻ってきてしまい、上記1.の原因によってローカルのRedoスタックが意図せずクリアされていました。
    *   **修正内容**: 以下の段階で修正を行いました。
        1.  **`APPLY_REMOTE_UNDO` / `APPLY_REMOTE_REDO` の履歴保持ロジック修正**: `frontend/src/hooks/useDrawingElements.ts` の `drawingReducer` 内で、`APPLY_REMOTE_UNDO` アクションは受信側の現在の状態を `redoStack` に追加し、`APPLY_REMOTE_REDO` アクションは受信側の現在の状態を `undoStack` に追加するように変更しました。これにより、リモートからの更新があっても、Redo/Undo可能な履歴を保持できるようになりました。
        2.  **`clientId` ベースの自己ブロードキャストスキップの再導入**: `frontend/src/hooks/useDrawingChannelIntegration.ts` の `handleReceivedData` 関数内に、`undo_redo_action` が受信された際に `receivedActionCableData.client_id` と現在の `clientId` を比較し、同一であれば処理をスキップするロジックを再導入しました。これにより、自身が発火したUndo/Redoアクションが「リモートアクション」として処理されることを防ぎ、ローカルの履歴管理が妨げられないようにしました。
        3.  **`handleUndo`/`handleRedo` が送信する要素の精査**: `useDrawingElements.ts` の `handleUndo` および `handleRedo` 関数内で `onUndoRedoAction` に渡される `elements` の値が、Reducerの`dispatch`による状態更新が完了した後の正確な状態のスナップショットになるように調整されました。
    *   **修正完了**: これらの修正により、タブAでUndoを実行するとタブAとタブBの両方でRedoボタンが正しく活性化されるようになり、Undo/Redo機能が期待通りに動作することが確認されました。

## 5. テストシナリオ

今回実装されたUndo/Redo機能について、以下のテストシナリオを追加します。

### 5.1. バックエンドユニットテスト (RSpec)

*   **DrawingChannelの`undo_redo`アクション**:
    *   `DrawingChannel`が`undo_redo`アクションを正しく受信し、指定された`action_type`、`elements`、`drawing_id`、`user_id`、`client_id`をブロードキャストすることを確認する。
    *   `drawing_id`が存在しない場合、ブロードキャストが行われないことを確認する。

### 5.2. フロントエンドユニットテスト (Vitest)

*   **`useDrawingElements.ts`**:
    *   **要素の追加**: `ADD_ELEMENT`アクションにより、新しい要素が`elements`に追加され、現在の`elements`のスナップショットが`undoStack`に積まれ、`redoStack`がクリアされること。
    *   **Undo操作**: `UNDO`アクションにより、`elements`が`undoStack`の前の状態に戻り、`redoStack`に現在の`elements`のスナップショットが積まれること。
    *   **Redo操作**: `REDO`アクションにより、`elements`が`redoStack`の次の状態に進み、`undoStack`に現在の`elements`のスナップショットが積まれ、`redoStack`がクリアされること。
    *   **`canUndo`/`canRedo`の状態**: `undoStack`と`redoStack`の長さに基づいて`canUndo`と`canRedo`が正しく`true`/`false`になること。
    *   **リモートUndoの適用**: `APPLY_REMOTE_UNDO`アクションにより、指定された`elements`が現在の状態になり、その直前の状態が`redoStack`に積まれること。
    *   **リモートRedoの適用**: `APPLY_REMOTE_REDO`アクションにより、指定された`elements`が現在の状態になり、その直前の状態が`undoStack`に積まれ、`redoStack`がクリアされること。

*   **`useDrawingChannelIntegration.ts`**:
    *   **`sendUndoRedoAction`の送信**: `sendUndoRedoAction`が、正しい`action_type`、`elements`、`drawing_id`、`client_id`を含むペイロードでAction Cableにメッセージを送信すること。
    *   **`handleReceivedData`によるUndo/Redoアクションの処理**: `handleReceivedData`が`undo_redo_action`を受信した際に、送信元`client_id`と現在の`client_id`が異なる場合にのみ`applyRemoteUndo`または`applyRemoteRedo`が呼び出されること。
    *   **自己ブロードキャストのスキップ**: `handleReceivedData`が`undo_redo_action`を受信した際に、送信元`client_id`と現在の`client_id`が同じ場合に`applyRemoteUndo`または`applyRemoteRedo`が呼び出されず、処理がスキップされること。

### 5.3. E2Eテスト (Playwright)

*   **単一タブでのUndo/Redo**: 描画ボードで線を描画し、Undoを実行すると線が消え、Redoを実行すると線が再描画され、それぞれボタンの活性状態が正しく反映されること。
*   **複数タブ（同一ユーザー）でのUndo/Redo連携**:
    1.  タブAで描画し、タブBでそれが表示されることを確認する。
    2.  タブAでUndoを実行すると、タブBの表示もUndoされることを確認する。
    3.  タブAでRedoを実行すると、タブBの表示もRedoされることを確認する。
    4.  タブAでUndoした後、タブBでRedoが活性化され、それをクリックするとタブAでUndoされた内容がタブBでRedoされることを確認する。
    5.  タブAでRedoした後、タブBでUndoが活性化され、それをクリックするとタブAでRedoされた内容がタブBでUndoされることを確認する。
*   **複数タブ（異なるユーザー）でのUndo/Redo連携**:
    1.  ユーザーAでタブA、ユーザーBでタブBを開く。
    2.  タブA（ユーザーA）で描画し、タブB（ユーザーB）でそれが表示されることを確認する。
    3.  タブA（ユーザーA）でUndoを実行すると、タブB（ユーザーB）の表示もUndoされることを確認する。
    4.  タブB（ユーザーB）で、タブAのUndoをRedoできることを確認する。
    5.  タブB（ユーザーB）で描画し、タブA（ユーザーA）でそれが表示されることを確認する。
    6.  タブB（ユーザーB）でUndoを実行すると、タブA（ユーザーA）の表示もUndoされることを確認する。
    7.  タブA（ユーザーA）で、タブBのUndoをRedoできることを確認する。

---
