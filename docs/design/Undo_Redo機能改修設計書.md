# Undo/Redo機能改修設計書

## 概要

本設計書は、描画ボードのUndo/Redo機能に存在する不具合（1回の描画操作をUndoするのに複数回Undoボタンを押す必要がある、描画するとこれまでの内容が消える）を解消するためのものです。主な原因は、リアルタイム同期機能における自己ブロードキャストと`undoStack`の不適切な管理、およびバックエンドからの`tempId`の欠落にあると特定されました。

## 要件

*   **1回の論理的な描画操作は1回のUndoで戻せること。**
*   **描画要素が重複して`drawingElements`に格納されないこと。**
*   **ボード上の描画内容が意図せず消去されないこと。**
*   **リアルタイム同期機能とUndo/Redo機能が正しく連携すること。**

## これまでの試行錯誤でわかっていること

1.  **`undoStack` の肥大化**: **(解決済み)**
    *   ユーザーが1回の描画操作（例: 1本の線）を行った際に、`handleDrawComplete` が呼び出されるだけでなく、Action Cableを介した自己ブロードキャストにより `addDrawingElementFromExternalSource` が複数回呼び出され、そのたびに`undoStack`に状態が追加されていることが判明しました。これにより、`undoStack`が意図しない数の履歴で満たされていました。これに対するフロントエンドの修正により、問題は解決されました。

2.  **バックエンドからの `tempId` の欠落**: **(解決済み)**
    *   フロントエンドから描画要素に一時的なID (`tempId`) を付与して送信しているにもかかわらず、バックエンドがブロードキャストする際にこの `tempId` を含めて返していないことが確認されました。バックエンドの`temp_id`カラム追加とブロードキャスト修正により、この問題は解決されました。

3.  **バックエンドが1つの論理的操作を複数要素としてブロードキャスト**: **(未解決 - 今後の検討事項)**
    *   1回の描画操作（例: 1本の線）に対して、バックエンドが複数の異なる永続IDを持つ `DrawingElement` としてブロードキャストしていることがログから強く示唆されています。フロントエンド側で`tempId`を用いた置き換えロジックで対応していますが、バックエンド側でこれらの要素を論理的にグループ化してブロードキャストする根本的な解決策は未実装です。

4.  **「描画すると、これまで描いた内容が消える」問題**: **(解決済み)**
    *   上記の`tempId`の欠落と要素の重複が原因で、`drawingElements`の状態が不正になり、新規描画時に既存の描画が消えてしまうという深刻な副作用が発生していました。`frontend/src/hooks/useDrawingPersistence.ts`の`canvas_data`パースロジック修正により、この問題は解決されました。

5.  **Redoした内容をUndoするとき、2回Undoする必要がある問題**: **(解決済み)**
    *   Undo機能が1回で動作するようになった後、Redo機能の動作検証中に、Redoされた描画内容をUndoする際に、Undoボタンを2回押す必要があるという新たな不具合が確認されました。一連の修正の中で、この問題も解決されました。

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
4.  **`useDrawingElements` フックの初期化ロジックとタイミングの改善**:
    *   `frontend/src/hooks/useDrawingElements.ts`において、`drawingElements`および`undoStack`の初期化に`initialLoadedElements`を正確に利用し、コンポーネントのライフサイクルと非同期データロードとの同期を改善しました。
5.  **`useDrawingPersistence`での`canvas_data`パースロジックの修正**:
    *   `frontend/src/hooks/useDrawingPersistence.ts`において、バックエンドから取得する`canvas_data`のJSONパース結果が直接`DrawingElementType[]`形式である場合、それを正しく認識して利用するよう修正しました。これにより、保存された描画要素が正しくロードされるようになりました。
6.  **`DrawingBoard.tsx`における`useEffect`の再導入と調整**:
    *   `frontend/src/pages/DrawingBoard.tsx`において、`useDrawingPersistence`から取得した`initialDrawingElements`と`initialLastSavedAt`を用いて`drawingElements`と`lastSavedAt`を初期化する`useEffect`を再度導入し、非同期データロード後の状態更新を適切に行うようにしました。

## 現在修正した内容 (バックエンド)

1.  **`DrawingElement` モデルへの `temp_id` カラム追加**:
    *   `temp_id:string` カラムを `drawing_elements` テーブルに追加するマイグレーションを作成・実行しました。
2.  **`DrawingElement` `create` アクションの修正**:
    *   `app/controllers/api/v1/drawing_elements_controller.rb` の `drawing_element_params` に `:temp_id` を許可するように修正しました。
3.  **Action Cable ブロードキャストの修正**:
    *   `app/channels/drawing_channel.rb` の `draw` メソッドが新しい `DrawingElement` をブロードキャストする際に、`temp_id` も含めてブロードキャストするように変更しました。

## 次にやるべきこと (今後の検討事項に更新)

Undo/Redo機能の主要な不具合は解決されましたが、今後の品質向上と機能拡張のために、以下の点を検討します。

### 1. バックエンドでの描画要素の粒度見直し
*   **現状**: バックエンドが1つの論理的な描画操作（例: 1本の線）を複数の`DrawingElement`としてブロードキャストしている可能性があります。これに対し、フロントエンドは`tempId`を用いた置き換えロジックで対応していますが、バックエンド側でこれらの要素を論理的にグループ化してブロードキャストする根本的な解決策は未実装です。
*   **検討内容**: バックエンド側で、ユーザーの描画操作をより大きな「トランザクション」として扱い、一連の関連する`DrawingElement`を単一の単位としてブロードキャストする仕組みを導入することを検討します。これにより、データ管理の簡素化や、将来的なUndo/Redo以外の機能（例: 描画履歴の表示）における表示ロジックの簡素化が期待できます。

### 2. 初期ロードAPIの拡張
*   **現状**: 設計書「リアルタイム描画同期機能設計書」で言及されている「新規参加ユーザーがボードにアクセスした際に、保存された`canvas_data`と、それ以降の未保存の`DrawingElement`を`is_active`状態を考慮してまとめて取得できるようにする」というAPIの拡張は、今回のUndo/Redo機能改修の直接的なスコープ外であり、未実装です。
*   **検討内容**: 描画ボードのパフォーマンスとユーザー体験を向上させるため、このAPI拡張を実装することを検討します。これにより、新規ユーザーがボードに参加した際の描画ロード時間を短縮し、よりスムーズなコラボレーション体験を提供できる可能性があります。

### 3. バックエンドテストの拡充
*   **現状**: 設計書で提案された`temp_id`に関するモデル、API、Action Cableチャネルのテストは、実装されたか確認されていません。今回の改修で機能は改善されましたが、テストカバレッジの不足はデグレのリスクを高めます。
*   **検討内容**: `temp_id`の永続化、API応答、Action Cableブロードキャストが期待通りに行われていることを検証するバックエンドテストを実装します。これにより、将来の変更によるデグレを防止し、コードの品質と信頼性を維持します。

## 3. 設計 (セクション名を「詳細設計」に更新)

### 3.1. バックエンド詳細設計

Undo/Redo機能の改善とリアルタイム同期の実現のため、バックエンドに以下の修正を加えました。

#### 3.1.1. `DrawingElement` モデルへの `temp_id` カラム追加

*   **目的**: フロントエンドで一時的に生成された描画要素と、バックエンドで永続化された（かつAction Cableでブロードキャストされる）同一の描画要素を紐付けるための識別子として機能します。
*   **修正内容**: `drawing_elements` テーブルに `temp_id:string` カラムを追加するマイグレーションを作成・実行しました。デフォルト値は不要です。
*   **実装ファイル**: `db/migrate/xxxxxxxxxxxx_add_temp_id_to_drawing_elements.rb`

#### 3.1.2. `DrawingElement` `create` アクションの修正

*   **目的**: フロントエンドから送信される `tempId` をバックエンドで受け取り、`DrawingElement` レコードに保存します。
*   **修正内容**: `app/controllers/api/v1/drawing_elements_controller.rb` の `drawing_element_params` に `:temp_id` を許可するように修正しました。
*   **実装ファイル**: `app/controllers/api/v1/drawing_elements_controller.rb`

#### 3.1.3. Action Cable ブロードキャストの修正

*   **目的**: 新しい `DrawingElement` が作成された際に、`temp_id` を含めて全ての接続クライアントにブロードキャストすることで、フロントエンドが自己ブロードキャストされた要素を正しく識別し、重複を避けることを可能にします。
*   **修正内容**: `app/channels/drawing_channel.rb` の `draw` メソッド内で、`DrawingElement.create!` 時に `tempId` を保存し、`ActionCable.server.broadcast` する際に `drawing_element.as_json(methods: [:temp_id])` を使用して `temp_id` をJSONレスポンスに含めました。
*   **実装ファイル**: `app/channels/drawing_channel.rb`

#### 3.1.4. 初期ロードAPIの拡張（参考）

*   **目的**: 新規参加ユーザーがボードにアクセスした際に、保存された `canvas_data` と、それ以降の未保存の `DrawingElement` を`is_active`状態を考慮してまとめて取得できるようにします。（これはリアルタイム描画同期機能設計書の要件ですが、今回のUndo/Redoの修正との関連性も高いため、将来的な拡張として念のため記載）
*   **現状**: この機能は未実装です。
*   **検討内容**: `app/controllers/api/v1/drawings_controller.rb` の `show` アクションおよび対応するJbuilder/シリアライザを修正し、`canvas_data` と、その `last_saved_at` 以降の `DrawingElement` （`is_active` フラグも含む）を返すように拡張することを検討します。
*   **実装ファイル**: `app/controllers/api/v1/drawings/show.json.jbuilder` (または関連シリアライザ)

### 3.2. バックエンドテスト (現状と今後の検討事項を追記)

上記のバックエンド修正に伴い、以下のテストケースを追加または修正し、期待通りに動作することを確認します。

*   **`DrawingElement` モデルテスト**: `temp_id` が正しく保存されること。
*   **APIテスト**: `drawing_elements#create` エンドポイントが `temp_id` を受け入れ、保存すること。また、描画要素取得時に `temp_id` が含まれていること。
*   **Action Cableチャネルテスト**: `draw` メソッドが `temp_id` を含む描画要素をブロードキャストすること。

**現状**: これらのテストが実際に実装されたかどうかは確認されていません。
**今後の検討事項**: 既存の機能の品質を保証するため、これらのテストケースを実装し、テストカバレッジを向上させることを強く推奨します。

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
この設計書は、
