# エクスポートAPI設計書


## 概要
Artamiraにおける描画内容をバックエンドで特定のフォーマットにエクスポートするAPIの設計。
現在フロントエンドで実装されている直接エクスポート機能（Canvas.toDataURL()）を補完し、より複雑なエクスポート処理や、サーバーサイドでの画像生成のニーズに対応する。

## 要件
- **目的**: 描画ボードのIDとエクスポートフォーマット、フロントエンドで生成された画像データ（Data URL）を受け取り、サーバーサイドで処理してファイルをダウンロードさせる。
- **認証・認可**: ログイン済みのユーザーのみがアクセス可能とし、当該描画ボードへのアクセス権限を持つユーザーのみがエクスポートを実行できること。
- **サポートフォーマット**: PNG, JPEG。（現時点ではSVGはサポートせず、今後の拡張として検討する）

## API設計

### エクスポートAPI
- **HTTPメソッド**: `POST`
- **パス**: `/api/v1/drawings/:drawing_id/export`
- **リクエスト**:
    - `drawing_id` (URLパラメータ): エクスポート対象の描画ボードのID。
    - `format` (string): エクスポートフォーマット ('png' or 'jpeg').
    - `image_data` (string): フロントエンドでCanvasから取得したData URL (例: `data:image/png;base64,...`)。
      - 注: リクエストボディのサイズ制限は、Webサーバー（例: Nginx）やRailsのミドルウェア設定で別途考慮が必要。
- **レスポンス**:
    - **成功時**: `HTTP 200 OK`
        - `Content-Disposition: attachment; filename=\"[ファイル名].(png|jpeg)\"` ヘッダーを設定し、バイナリファイルデータをレスポンスボディとして返す。
        - ファイル名は描画ボードのタイトルに`.png`または`.jpeg`を付与したものとする。
    - **失敗時**:
        - `HTTP 400 Bad Request`: 不正なリクエストパラメータ (例: 無効なフォーマット、`image_data`の欠如)。
        - `HTTP 401 Unauthorized`: 未認証ユーザー。
        - `HTTP 403 Forbidden`: 認可されていないユーザー。
        - `HTTP 404 Not Found`: 描画ボードが見つからない場合。
        - `HTTP 500 Internal Server Error`: サーバーサイドでの処理エラー (例: ファイル保存失敗)。

## 技術選定
- **Data URLデコード**: Rubyの標準ライブラリ `Base64` モジュールを使用してData URLからBase64エンコードされた文字列を抽出し、デコードする。
- **ファイル処理**: デコードされたバイナリデータを一時ファイルとして保存し、`send_data` メソッドでクライアントに送信する。
- **画像処理（将来的な拡張）**: 現状はフロントエンドからの `image_data` をそのまま利用するため、サーバーサイドでの高度な画像処理ライブラリは不要。将来的にサーバーサイドで描画要素から画像をレンダリングする場合は、`ImageMagick` (RMagick gem) や `Vips` (ruby-vips gem) の導入を検討する。

## 実装詳細

### 1. ルーティングの追加
`config/routes.rb` にエクスポートAPIのルートを追加する。

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # ... existing code ...
  namespace :api do
    namespace :v1 do
      resources :drawings do
        resources :elements, controller: 'drawing_elements', only: [:index, :create]
        post 'save', on: :member
        post 'export', on: :member # ここを追加
      end
      resources :drawing_elements, only: [:show, :update, :destroy]
    end
  end
end
```

### 2. Controllerの作成とロジックの実装
`app/controllers/api/v1/drawings_controller.rb` に `export` アクションを追加する。

- `image_data` からBase64データを抽出しデコードする。（Data URLのより厳密なパースと内容検証は今後の課題）
- ファイル名とMIMEタイプを決定する。
- `send_data` を使用してファイルを送信する。

```ruby
# app/controllers/api/v1/drawings_controller.rb (抜粋)
# ... existing code ...

class Api::V1::DrawingsController < ApplicationController
  before_action :set_drawing, only: [:show, :update, :destroy, :save, :export]

  # ... existing actions ...

  def export
    format = params[:format].to_s.downcase
    image_data_url = params[:image_data]

    unless ['png', 'jpeg'].include?(format) && image_data_url.present?
      render json: { error: 'Invalid format or missing image_data.' }, status: :bad_request
      return
    end

    # Data URLからBase64データを抽出
    # 例: data:image/png;base64,iVBORw0KGgo...
    #     -> iVBORw0KGgo...
    # 注: より厳密なData URLパース（例: 正規表現によるMIMEタイプやcharsetの抽出）や、
    #     デコード後のバイナリデータが有効な画像であるかのマジックバイトチェックは、
    #     本フェーズではスコープ外とし、将来的な拡張として検討する。
    base66_data = image_data_url.split(',').last

    unless base66_data
      render json: { error: 'Invalid image_data format.' }, status: :bad_request
      return
    end

    begin
      decoded_image = Base64.decode64(base66_data)

      filename = "#{@drawing.title.presence || 'untitled'}.#{format}"
      type = "image/#{format}"

      send_data decoded_image, filename: filename, type: type, disposition: 'attachment'
    rescue ArgumentError => e
      render json: { error: "Failed to decode image data: #{e.message}" }, status: :bad_request
    rescue => e
      Rails.logger.error("Drawing export failed: #{e.message}")
      render json: { error: 'Failed to export drawing.' }, status: :internal_server_error
    end
  end

  private

  def set_drawing
    @drawing = current_user.drawings.find(params[:id])
  end

  def drawing_params
    params.require(:drawing).permit(:title, :user_id)
  end
end
```

### 3. セキュリティ考慮事項
- `image_data` のサイズ制限: 悪意のある大きなデータを送信されることを防ぐため、リクエストボディのサイズ制限を検討する。これはWebサーバー（Nginx, Apacheなど）やRailsのミドルウェア設定（例: `config/initializers/rack_attack.rb`での制限）で実装可能。
- データ検証: `image_data` が本当に画像データであることを確認するための、より厳密な検証（例: マジックバイトのチェック、`mimemagic` などのgem利用）を将来的に追加する。これにより、不正なファイルタイプによる攻撃や不具合を防ぐ。

## テスト
- テストの実行方法はREADME.mdを参照する
- エクスポートAPIの成功/失敗ケースの単体テスト (`spec/requests/api/v1/drawings_spec.rb` に追加)。
  - **成功シナリオ**:
    - 有効な`drawing_id`、`format`、`image_data`でリクエストした場合、`HTTP 200 OK`が返され、正しいファイル名とMIMEタイプでダウンロードされること。
  - **失敗シナリオ**:
    - 無効な`format`が指定された場合、`HTTP 400 Bad Request`が返されること。
    - `image_data`が欠落している、または無効な形式の場合、`HTTP 400 Bad Request`が返されること。
    - 存在しない`drawing_id`でリクエストした場合、`HTTP 404 Not Found`が返されること。
    - サーバーサイドで予期せぬエラーが発生した場合、`HTTP 500 Internal Server Error`が返されること。
- 認証・認可に関するテスト。
  - **認証シナリオ**:
    - 未認証ユーザーがアクセスした場合、`HTTP 401 Unauthorized`が返されること。
    - 他のユーザーの描画ボードにアクセスした場合、`HTTP 403 Forbidden`または`HTTP 404 Not Found`（`set_drawing`の認可ロジックによる）が返されること。

## 今後の拡張
- SVGエクスポートのサポート: SVGはベクターデータであるため、バックエンドで`DrawingElement`のデータからSVGを生成するロジックが必要となる。これは複雑なため、別フェーズで検討する。
- サーバーサイドでの画像レンダリング: フロントエンドからのData URLに依存せず、`DrawingElement`のデータから直接画像を生成する機能。これにより、より高品質なエクスポートや、異なる解像度でのエクスポートが可能になる。適切な画像処理ライブラリ（ImageMagickなど）の導入が必要。

### フロントエンド実装

#### 1. エクスポートボタンとモーダル

*   `DrawingBoard.tsx`にエクスポートを開始するためのボタン（またはメニュー項目）を配置する。
*   ボタンクリック時に`isExportModalOpen`ステートを`true`に設定し、`ExportModal`を表示する。
*   `ExportModal`は、PNGとJPEGの選択肢を提供し、エクスポートボタンを持つ。
*   `ExportModal`の閉じるボタンやモーダルの外側クリックで`isExportModalOpen`ステートを`false`に設定し、モーダルを閉じる。

#### 2. `handleExport`関数の実装

`frontend/src/pages/DrawingBoard.tsx`の`handleExport`関数を以下のように実装する。

1.  `canvasRef.current`からCanvas要素を取得する。
2.  Canvasが存在しない場合はエラーハンドリングを行う。
3.  `canvasRef.current.toDataURL(mimeType)`を使用して、選択された`format`に応じたData URL（例: `image/png` または `image/jpeg`）を取得する。
4.  取得したData URL、`format`、および`drawingId`をペイロードとして、バックエンドのエクスポートAPI（`/api/v1/drawings/:drawing_id/export`）に`POST`リクエストを送信する。
    *   `Content-Type`ヘッダーは`application/json`とする。
    *   `credentials: 'include'`を設定し、Cookieを送信する。
5.  APIレスポンスのステータスコードをチェックし、成功(`HTTP 200 OK`)した場合は、レスポンスボディ（バイナリデータ）をBlobとして取得し、ファイルダウンロードをトリガーする。
    *   ファイルダウンロードは、BlobからURLを作成し、アンカータグを動的に生成して`click()`イベントを発火させることで実現する。
    *   バックエンドからの`Content-Disposition`ヘッダーに含まれる`filename`を使用して、ダウンロードファイル名を設定する。
6.  APIリクエストが失敗した場合は、ユーザーにエラーメッセージを表示する。
    *   `HTTP 400`, `401`, `403`, `404`, `500`など、各エラーコードに対応したメッセージ表示を検討する。
7.  エクスポート処理中は、ユーザーに分かりやすいローディング表示を検討する。

#### 3. エラー・ローディング表示

*   エクスポート処理の開始時と終了時に、ローディング状態を示すUI（例: スピナー）を表示する。
*   APIエラーが発生した場合、モーダル内またはトースト通知などでエラーメッセージを表示する。

#### 4. `ExportModal.tsx`の改修

*   `ExportModal`コンポーネントに、エクスポートフォーマットを選択するためのラジオボタンまたはドロップダウンを追加する。
*   エクスポートボタンクリック時に、選択されたフォーマットと`handleExport`関数を親コンポーネントから受け取り、実行する。

## 最終レビューとブラッシュアップ
- 上記設計書を基に実装を行い、テストを通じて動作を確認する。
- パフォーマンス、セキュリティ、スケーラビリティの観点から再評価する。特に大きな描画ボードのエクスポート時のパフォーマンスを考慮する。
- エラーメッセージのユーザーフレンドリー化を検討する。
