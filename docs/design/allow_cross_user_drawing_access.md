# 描画ボードアクセス権限改修設計書

## 1. 現在の仕様

### 1.1. 描画ボードアクセス制御
現在の `Api::V1::DrawingsController` において、`before_action :set_drawing` によって描画ボードの取得が行われています。この `set_drawing` メソッドは以下のようになっています。

```ruby
# api/app/controllers/api/v1/drawings_controller.rb
# ... existing code ...
      private

      def set_drawing
        @drawing = current_user.drawings.find(params[:id])
      end
# ... existing code ...
```

これにより、描画ボードは `current_user` が所有するもののみが取得可能となっています。つまり、ユーザーAが作成した描画ボードにはユーザーAしかアクセスできず、他のユーザー（ユーザーBなど）がアクセスしようとすると `ActiveRecord::RecordNotFound` 例外が発生し、結果として 404 Not Found が返されます。

### 1.2. 関連するテスト
既存のテストケース (`api/spec/requests/api/v1/drawings_spec.rb`) では、`set_drawing` メソッドによる認可ロジックが正しく機能していることを検証しています。
例えば、`POST /api/v1/drawings/:id/save` および `GET /api/v1/drawings/:drawing_id/elements` のテストにおいて、「他のユーザーの描画ボードの場合」は 404 Not Found を返すことが期待されています。

## 2. 改修要件

### 2.1. 異なるユーザーからの描画ボードアクセス
*   認証済みのユーザーであれば、誰でも任意の描画ボードを閲覧し、描画、保存、エクスポートできること。
*   認証済みのユーザーであれば、誰でも他のユーザーが作成した描画ボード上の個々の描画要素を参照、変更、削除できること。
*   描画ボードのタイトル変更およびボード自体の削除は、その描画ボードの所有者のみが実行できること。
*   具体的には、`drawings` の `index`, `show`, `save`, `export` アクション、および `drawing_elements` の `index`, `create`, `show`, `update`, `destroy` アクションは全認証ユーザーがアクセス可能とする。
*   `drawings` の `update` (タイトル変更) および `destroy` (ボード削除) アクションはボード所有者のみが実行可能とする。

## 3. 改修の詳細

### 3.1. `Api::V1::DrawingsController` の変更
`set_drawing` メソッドを変更し、描画ボードの取得ロジックを修正します。また、`authorize_drawing_owner` の適用範囲を限定します。

-   `index`, `show`, `save`, `export` アクションでは、`Drawing.find(params[:id])` で描画ボードを取得するように変更します。
-   `update`, `destroy` アクションでは、取得した描画ボードの `user_id` が `current_user.id` と一致するかどうかを確認する認可ロジックを適用します。

```ruby
# api/app/controllers/api/v1/drawings_controller.rb
module Api
  module V1
    class DrawingsController < ApplicationController
      before_action :set_drawing, only: [:show, :update, :destroy, :save, :export]
      before_action :authorize_drawing_owner, only: [:update, :destroy]

      # ... existing code ...

      private

      def set_drawing
        @drawing = Drawing.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Drawing not found." }, status: :not_found
      end

      def authorize_drawing_owner
        unless @drawing.user_id == current_user.id
          render json: { error: "You are not authorized to perform this action." }, status: :forbidden
        end
      end

      # ... existing code ...

    end
  end
end
```

## 4. テストケース

### 4.1. ユニットテスト (RSpec)
`api/spec/requests/api/v1/drawings_spec.rb` と `api/spec/requests/api/v1/drawing_elements_spec.rb` を更新し、以下のテストケースを追加・修正します。

#### `GET /api/v1/drawings/:id`
*   **修正**: 他のユーザーの描画ボードに認証済みユーザーがアクセスした場合、200 OK を返すこと。
*   **修正**: 存在しない描画ボードの場合、404 Not Found を返すこと。

#### `POST /api/v1/drawings/:id/save`, `POST /api/v1/drawings/:id/export`
*   **追加**: 他のユーザーの描画ボードに対し、認証済みユーザーが `save`, `export` を試みた場合、200 OK を返すこと。
*   **修正**: 存在しない描画ボードの場合、404 Not Found を返すこと。

#### `PUT/PATCH /api/v1/drawings/:id`
*   **追加**: 他のユーザーの描画ボードに対し、認証済みユーザーが `update` を試みた場合、403 Forbidden を返すこと。
*   **修正**: 存在しない描画ボードの場合、404 Not Found を返すこと。

#### `DELETE /api/v1/drawings/:id`
*   **追加**: 他のユーザーの描画ボードに対し、認証済みユーザーが `destroy` を試みた場合、403 Forbidden を返すこと。
*   **修正**: 存在しない描画ボードの場合、404 Not Found を返すこと。

#### `GET /api/v1/drawings/:drawing_id/elements` (DrawingElementsController)
*   **修正**: 他のユーザーが作成した描画ボードの要素を、認証済みユーザーが参照した場合、200 OK を返すこと。
*   **修正**: 存在しない描画ボードの要素を参照した場合、404 Not Found を返すこと。

#### `POST /api/v1/drawings/:drawing_id/elements` (DrawingElementsController)
*   **修正**: 他のユーザーが作成した描画ボードに、認証済みユーザーが新しい描画要素を作成した場合、201 Created を返すこと。
*   **修正**: 存在しない描画ボードに描画要素を作成しようとした場合、404 Not Found を返すこと。

#### `GET /api/v1/drawing_elements/:id`, `PUT/PATCH /api/v1/drawing_elements/:id`, `DELETE /api/v1/drawing_elements/:id` (DrawingElementsController)
*   **追加**: 他のユーザーが作成した描画ボードの要素を、認証済みユーザーが `show`, `update`, `destroy` しようとした場合、200 OK または 204 No Content を返すこと。
*   **修正**: 存在しない描画要素を `show`, `update`, `destroy` しようとした場合、404 Not Found を返すこと。

### 4.2. E2E テスト (Playwright)

#### **修正**: 他のユーザーの描画ボードの閲覧と描画
*   ユーザーAでログインし、描画ボードを作成する。
*   ユーザーBでログインし、ユーザーAが作成した描画ボードのURLに直接アクセスする。
*   ユーザーBが描画ボードを閲覧できることを確認する。
*   ユーザーBが描画ボードに新しい要素（例: 線や図形）を描画できることを確認する。
*   描画後、描画要素が正しく表示されることを確認する。

#### **修正**: 他のユーザーの描画ボードの情報の変更と保存
*   ユーザーAでログインし、描画ボードを作成する。
*   ユーザーBでログインし、ユーザーAが作成した描画ボードのURLに直接アクセスする。
*   ユーザーBが描画ボードのタイトルを変更しようとした際に、適切なエラーメッセージが表示される、または変更操作ができないことを確認する。
*   ユーザーBが描画ボードを保存できることを確認する。

#### **追加**: 他のユーザーの描画ボード上の描画要素の編集・削除
*   ユーザーAでログインし、描画ボードを作成し、いくつかの描画要素を追加する。
*   ユーザーBでログインし、ユーザーAが作成した描画ボードのURLに直接アクセスする。
*   ユーザーBがユーザーAの描画要素を動かしたり、削除したりできることを確認する。

#### **追加**: 他のユーザーの描画ボードの削除制限
*   ユーザーAでログインし、描画ボードを作成する。
*   ユーザーBでログインし、ユーザーAが作成した描画ボードのURLに直接アクセスする。
*   ユーザーBがユーザーAの描画ボードを削除しようとした際に、適切なエラーメッセージが表示される、または削除操作ができないことを確認する。

---
