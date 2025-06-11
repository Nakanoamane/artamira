# Undo/Redo機能改修設計書

## 概要

本設計書は、描画ボードのUndo/Redo機能に存在する不具合（1回の描画操作をUndoするのに複数回Undoボタンを押す必要がある、描画するとこれまでの内容が消える）を解消するためのものです。主な原因は、リアルタイム同期機能における自己ブロードキャストと`undoStack`の不適切な管理、およびバックエンドからの`tempId`の欠落にあると特定されました。

## 要件

*   **1回の論理的な描画操作は1回のUndoで戻せること。**
*   **描画要素が重複して`drawingElements`に格納されないこと。**
*   **ボード上の描画内容が意図せず消去されないこと。**
*   **リアルタイム同期機能とUndo/Redo機能が正しく連携すること。**

## これまでの試行錯誤でわかっていること

1.  **`undoStack` の肥大化**:
    *   ユーザーが1回の描画操作（例: 1本の線）を行った際に、`handleDrawComplete` が呼び出されるだけでなく、Action Cableを介した自己ブロードキャストにより `addDrawingElementFromExternalSource` が複数回呼び出され、そのたびに`undoStack`に状態が追加されていることが判明しました。これにより、`undoStack`が意図しない数の履歴で満たされていました。
    *   `handleDrawComplete` 内の `setDrawingElements` コールバックが複数回実行されること（React StrictModeの影響など）も、`undoStack` への重複プッシュの一因である可能性があります。

2.  **バックエンドからの `tempId` の欠落**:
    *   フロントエンドから描画要素に一時的なID (`tempId`) を付与して送信しているにもかかわらず、バックエンドがブロードキャストする際にこの `tempId` を含めて返していないことが確認されました。
    *   これにより、`addDrawingElementFromExternalSource` での実装（自己ブロードキャストされた要素を識別し、置き換えるロジック）が正しく機能せず、`drawingElements` 内で同じ論理的な描画要素が一時IDと永続IDを持つ別々の要素として重複して存在していました。

3.  **バックエンドが1つの論理的操作を複数要素としてブロードキャスト**:
    *   1回の描画操作（例: 1本の線）に対して、バックエンドが複数の異なる永続IDを持つ `DrawingElement` としてブロードキャストしていることがログから強く示唆されています。これは、`drawingElements` の管理とUndo/Redoの粒度を複雑にしています。

4.  **「描画すると、これまで描いた内容が消える」問題**:
    *   上記の`tempId`の欠落と要素の重複が原因で、`drawingElements`の状態が不正になり、新規描画時に既存の描画が消えてしまうという深刻な副作用が発生しています。

## 現在修正した内容 (フロントエンド)

1.  **`DrawingElementType` に `tempId` を追加**:
    *   `frontend/src/utils/drawingElementsParser.ts` 内の `LineElement`, `RectangleElement`, `CircleElement` インターフェースに `tempId?: string;` プロパティを追加しました。
2.  **`handleDrawComplete` で `tempId` を付与**:
    *   `frontend/src/hooks/useDrawingElements.ts` 内の `handleDrawComplete` 関数を修正し、新しい描画要素に `tempId: \`temp-\${Date.now()}\`` を付与するようにしました。この `tempId` を含む要素は `onNewElementCreated` コールバックを通じて `DrawingBoard.tsx` に渡され、そこからバックエンドに送信されます。
3.  **`addDrawingElementFromExternalSource` で要素を置き換え**:
    *   `frontend/src/hooks/useDrawingElements.ts` 内の `addDrawingElementFromExternalSource` 関数を修正しました。
    *   受信した要素が、自身が描画した一時要素の永続化されたバージョンである場合（`element.id` が数値で、`element.tempId` が既存の`drawingElements` 内の一時要素の `tempId` と一致する場合）、既存の一時要素を受信した永続要素で置き換えるようにしました。
    *   この置き換え操作の際には、`undoStack` には新しい状態をプッシュしないように変更しました。
    *   他のユーザーからの描画要素の場合は、これまで通り `undoStack` にプッシュし、`drawingElements` に追加します。
4.  **デバッグログの追加**:
    *   `frontend/src/hooks/useDrawingElements.ts` と `frontend/src/pages/DrawingBoard.tsx` の関連関数に詳細なデバッグログを追加し、関数の呼び出し状況、スタックの長さ、要素の内容などを追跡できるようにしました。

## 次にやるべきこと

現在の問題の根本的な原因は、**バックエンドがフロントエンドから送信された `tempId` を保存し、ブロードキャスト時にそれを返していないこと**です。この問題が解決されない限り、フロントエンドで実装した自己ブロードキャスト要素の置き換えロジックが機能せず、Undo/Redoの不具合も解消されません。

### 1. バックエンド修正 (最優先)

以下のバックエンド修正を、設計書「リアルタイム描画同期機能設計書」の「3. 設計」および「4. 実行計画」の内容に沿って、再度確認し、実装およびデプロイを行ってください。

*   **`DrawingElement` モデルへの `temp_id` カラム追加**: `temp_id:string` カラムを `drawing_elements` テーブルに追加するマイグレーションを作成・実行します。
*   **`DrawingElement` の `create` アクション修正**: `app/controllers/api/v1/drawing_elements_controller.rb` の `create` アクションで、フロントエンドから送られてきた `tempId` を `drawing_element` レコードの `temp_id` として保存できるようにします。
*   **Action Cable ブロードキャスト修正**: `app/channels/drawing_channel.rb` の `draw` メソッドが新しい `DrawingElement` をブロードキャストする際に、`temp_id` も含めてブロードキャストするように変更します。特に、`drawing_element.as_json` に `methods: [:temp_id]` を含めるか、適切なシリアライザを修正して `temp_id` がJSONレスポンスに含まれるようにしてください。

### 2. フロントエンドの再検証 (バックエンド修正後)

バックエンドの修正が完了し、Action Cable経由で受信する描画要素に `tempId` が含まれるようになったことを確認した後、以下の点を再検証します。

*   **Undo/Redo機能の動作確認**: 1回の描画操作が1回のUndoで正しく戻ることを確認します。
*   **コンソールログの確認**: `addDrawingElementFromExternalSource: element.tempId =` のログに正しい `tempId` が表示されていること、そして `addDrawingElementFromExternalSource: Replaced self-broadcasted element.` のログが表示され、`undoStack` が肥大化しないことを確認します。
*   **「描画が消える」問題の解消確認**: これまでの描画内容が、新しい描画操作によって消えたり上書きされたりしないことを確認します。

### 3. 追加で検討すべき修正 (必要に応じて)

上記のバックエンド修正とフロントエンドの再検証後も問題が継続する場合、以下の修正を検討します。

*   **`handleDrawComplete` 内の `setUndoStack` 呼び出しタイミングの変更**:
    *   `handleDrawComplete` の `setDrawingElements` コールバック内部での `setUndoStack` の呼び出しが、Reactのバッチ処理やStrictModeの影響で重複して実行されている場合、`setUndoStack` の呼び出しを `setDrawingElements` の外に移動することを検討します。これにより、`undoStack` への重複プッシュをさらに確実に防ぎます。
*   **バックエンドでの描画要素の粒度見直し**:
    *   もしバックエンドが1つの論理的な描画操作（例: 1本の線）を複数の `DrawingElement` としてブロードキャストしている場合、可能であればバックエンド側でこれらの要素を論理的にグループ化してブロードキャストするか、フロントエンド側でそれらを単一のUndo/Redo単位として扱うロジックを検討する必要があります。ただし、これはより複雑な変更になるため、上記`tempId`の問題が解決された後に行うのが適切です。

## 3. 設計

### 3.1. バックエンド設計

Undo/Redo機能の改善とリアルタイム同期の実現のため、バックエンドに以下の修正を加えます。

#### 3.1.1. `DrawingElement` モデルへの `temp_id` カラム追加

*   **目的**: フロントエンドで一時的に生成された描画要素と、バックエンドで永続化された（かつAction Cableでブロードキャストされる）同一の描画要素を紐付けるための識別子として機能します。
*   **修正内容**: `drawing_elements` テーブルに `temp_id:string` カラムを追加するマイグレーションを作成・実行します。デフォルト値は不要です。
*   **実装ファイル**: `db/migrate/xxxxxxxxxxxx_add_temp_id_to_drawing_elements.rb`

#### 3.1.2. `DrawingElement` `create` アクションの修正

*   **目的**: フロントエンドから送信される `tempId` をバックエンドで受け取り、`DrawingElement` レコードに保存します。
*   **修正内容**: `app/controllers/api/v1/drawing_elements_controller.rb` の `drawing_element_params` に `:temp_id` を許可するように修正します。
*   **実装ファイル**: `app/controllers/api/v1/drawing_elements_controller.rb`

#### 3.1.3. Action Cable ブロードキャストの修正

*   **目的**: 新しい `DrawingElement` が作成された際に、`temp_id` を含めて全ての接続クライアントにブロードキャストすることで、フロントエンドが自己ブロードキャストされた要素を正しく識別し、重複を避けることを可能にします。
*   **修正内容**: `app/channels/drawing_channel.rb` の `draw` メソッド内で、`DrawingElement.create!` 時に `tempId` を保存し、`ActionCable.server.broadcast` する際に `drawing_element.as_json(methods: [:temp_id])` を使用して `temp_id` をJSONレスポンスに含めます。（シリアライザを使用している場合は、そのシリアライザに `attribute :temp_id` を追加）
*   **実装ファイル**: `app/channels/drawing_channel.rb`

#### 3.1.4. 初期ロードAPIの拡張（参考）

*   **目的**: 新規参加ユーザーがボードにアクセスした際に、保存された `canvas_data` と、それ以降の未保存の `DrawingElement` を`is_active`状態を考慮してまとめて取得できるようにします。（これはリアルタイム描画同期機能設計書の要件ですが、今回のUndo/Redoの修正との関連性も高いため、将来的な拡張として念のため記載）
*   **修正内容**: `app/controllers/api/v1/drawings_controller.rb` の `show` アクションおよび対応するJbuilder/シリアライザを修正し、`canvas_data` と、その `last_saved_at` 以降の `DrawingElement` （`is_active` フラグも含む）を返すように拡張します。
*   **実装ファイル**: `app/controllers/api/v1/drawings_controller.rb`, `app/views/api/v1/drawings/show.json.jbuilder` (または関連シリアライザ)

### 3.2. バックエンドテスト

上記のバックエンド修正に伴い、以下のテストケースを追加または修正し、期待通りに動作することを確認します。

*   **`DrawingElement` モデルテスト**: `temp_id` が正しく保存されること。
*   **APIテスト**: `drawing_elements#create` エンドポイントが `temp_id` を受け入れ、保存すること。また、描画要素取得時に `temp_id` が含まれていること。
*   **Action Cableチャネルテスト**: `draw` メソッドが `temp_id` を含む描画要素をブロードキャストすること。

テストの実行方法は、`README.md` を参照してください。

```bash
# 全てのバックエンドテストを実行
docker compose exec api bundle exec rspec

# 特定のバックエンドテストを実行（例: DrawingElementのテスト）
docker compose exec api bundle exec rspec spec/models/drawing_element_spec.rb
# 特定のバックエンドテストを実行（例: DrawingChannelのテスト）
docker compose exec api bundle exec rspec spec/channels/drawing_channel_spec.rb
```

---
この設計書は、`
