# ⚠️ 注意

このプロジェクトはアイデア・設計・製造をAIにお任せしています

<br>

# Artamira - リアルタイム共同お絵かきボード

Artamiraは、複数のユーザーが同時に同じキャンバスに絵を描き、その描画がリアルタイムで共有されるウェブアプリケーションです。

## 技術スタック

### バックエンド
- Ruby on Rails 8.0.2 (APIモード)
- SQLite3
- Action Cable (WebSocket)

### フロントエンド
- React + TypeScript
- Vite
- TailwindCSS

## セットアップ

### 必要条件
- Docker
- Docker Compose

### 環境構築

1. リポジトリのクローン
```bash
git clone [repository-url]
cd artamira
```

2. 環境変数の設定
必要な環境変数は以下の通りです：

```bash
# Rails環境設定
RAILS_ENV=development
RAILS_MASTER_KEY=your_master_key_here

# データベース設定
DATABASE_URL=sqlite3:/app/db/development.sqlite3

# フロントエンド設定
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/cable

# その他の設定
TZ=Asia/Tokyo
```

これらの環境変数を`.env`ファイルに設定してください。

3. Dockerコンテナの起動
```bash
docker compose up -d
```

4. データベースの作成とマイグレーション
```bash
docker compose run --rm api rails db:create db:migrate
```

## 開発用コマンド

### APIサーバーの起動
```bash
docker compose up api
```

### フロントエンドの開発サーバー起動
```bash
docker compose up frontend
```

### テストの実行
```bash
# DBのセットアップ
docker compose exec api bundle exec rails db:test:prepare

# 全てのバックエンドテストを実行
docker compose exec api bundle exec rspec

# 特定のバックエンドテストを実行
docker compose exec api bundle exec rspec spec/models/drawing_element_spec.rb

# フロントエンドのコンポーネント単体テストを実行
docker compose exec frontend npm test

# E2Eテストを実行
docker compose run --rm e2e
```

### コンソールの起動
```bash
docker compose run --rm api rails console
```

## 現在の実装状況

### 完了した機能
1. バックエンドの基本実装
   - モデルの実装（User, Drawing, DrawingElement）
   - Action Cableチャンネルの実装
   - APIエンドポイントの実装
   - 基本的なテストの実装

2. Docker環境の構築
   - 開発環境のコンテナ化
   - テスト環境の設定

3. フロントエンドの環境構築
   - React + TypeScriptプロジェクトのセットアップ
   - Viteの導入と設定
   - TailwindCSSの導入と設定
   - 基本的なディレクトリ構造（components, pages, hooks, services）の構築

4. 認証システムの完成
   - ユーザー登録、ログイン/ログアウト機能のバックエンドAPI実装。
   - フロントエンドにおけるユーザー認証UIとAPI連携ロジックの実装。
   - 認証関連のバックエンドテストの追加。

5. フロントエンドのコア機能実装
   - 描画キャンバスコンポーネントの作成と基本描画ロジック
   - Action Cableへの接続とリアルタイム描画データの送受信
   - 基本的なユーザーインターフェースの実装（例: ツール選択、カラーピッカー）

### 実装中の機能
- gitの設定
  - githubリポジトリの作成
  - first commit

## 今後のTODO

### 優先度の検討が必要な項目

- エラーページの整備
  - 想定外のパスの時、404ページを表示する
- ログイン中のログイン・登録の挙動
  - ログイン中に新規作成ページ・ログインページにアクセスしようとした場合は、アクセスもとのページにリダイレクトするかトップページにリダイレクトさせる
- メールアドレスではなく、ユーザーIDの項目を追加してユーザーIDでログインできるようにする
- マイページの作成
- デザインのブラッシュアップ
  - カラーパレットをもとにしたデザインの統一
- 保存機能
  - DBに書いた絵を保存する機能
  - 途中入場した時に書いた絵が表示されること
  - 保存前にページを離脱しようとして場合は警告を表示
  - 書いた絵をエクスポートする機能
- オフライン機能


### 優先度: 高
** 準備中 **

### 優先度: 中
1.  **テストの拡充**
    *   コントローラーテストの追加
    *   統合テストの実装
    *   フロントエンドのテスト実装
2.  **描画機能の拡張**
    *   描画ツールの追加（図形、テキスト等）
    *   アンドゥ/リドゥ機能
    *   レイヤー機能

### 優先度: 低
1.  **パフォーマンス最適化**
    *   キャッシュの実装
    *   バッチ処理の最適化
    *   通信処理の最適化
2.  **デプロイメント設定**
    *   Kamalを使用したデプロイ設定
    *   本番環境の構築手順の整備


<br>

# 初期プロンプト

> はい、承知いたしました。CursorのAgent AIに「リアルタイム共同お絵かきボード」アプリケーションの作成を依頼するためのプロンプトを以下に示します。

---

### Cursor Agent AI向けプロンプト：リアルタイム共同お絵かきボード

**プロジェクト名:** リアルタイム共同お絵かきボード

**目的:** 複数のユーザーが同時に同じキャンバスに絵を描き、その描画がリアルタイムで共有されるウェブアプリケーションを構築します。

**主要な機能要件:**

1.  **ユーザー認証:** ユーザーはアカウントを作成し、ログインして描画ボードに参加できます。
2.  **描画ボードの管理:** ユーザーは新しい描画ボードを作成し、既存のボードに参加できます。
3.  **リアルタイム描画:** 参加しているすべてのユーザーの描画操作（線の描画、色の変更、太さの変更）が、他のユーザーのキャンバスに瞬時に反映されます。
4.  **描画の永続化:** 描画された内容はデータベースに保存され、ボードを再開した際に以前の状態が復元されます。
5.  **描画ツールの選択:** ユーザーはペンの色と太さを選択できるUIを提供します。

**技術スタックとRails 8の活用:**

このアプリケーションは、Ruby on Rails 8の以下の機能を最大限に活用して構築してください。

*   **バックエンド:**
    *   **フレームワーク:** Ruby on Rails 8 を **APIモード** (`rails new --api`) で初期化してください。
    *   **データベース:** **SQLite** を本番環境でも使用するように設定してください。Rails 8のProduction-Ready SQLite Integrationを活用します [1, 2, 3, 4]。
    *   **リアルタイム通信:** Action Cableのバックエンドとして **Solid Cable** を使用し、Redisなどの外部サービスへの依存を排除します [1, 2, 3, 4]。
    *   **認証:** Rails 8の **ネイティブ認証システム** (`bin/rails generate authentication`) を利用して、ユーザー登録とログイン機能を実装してください [1, 2, 3, 4]。
    *   **APIレンダリング:** JSON APIのレスポンス生成には **Jbuilder 3.0** を使用し、パフォーマンスを最適化します [3]。
    *   **CORS:** フロントエンドとの連携のため、CORS (Cross-Origin Resource Sharing) を適切に設定してください。
*   **フロントエンド:**
    *   **フレームワーク:** **React (TypeScript)** を使用して構築してください。Railsプロジェクトのルートディレクトリ内に `frontend/` などのサブディレクトリを作成し、そこにReactプロジェクトをセットアップします。
    *   **バンドラー:** React/TypeScriptのビルドには、Vite、Webpack、またはesbuildなどのモダンなJavaScriptバンドラーを使用してください。
    *   **リアルタイム連携:** React側からAction Cable (Solid Cable) に接続し、描画イベントの送受信を行います。
    *   **デプロイメント:**
    *   **ツール:** **Kamal** を使用したデプロイを想定し、必要な `Dockerfile` や `deploy.yml` の初期設定を準備してください。Rails 8はKamalをデフォルトでサポートしています [1, 2, 5, 4]。

**具体的な実装指示:**

1.  **Railsプロジェクトの初期化:**
    *   `rails new drawing_board --api --database=sqlite3` コマンドでプロジェクトを作成します。
2.  **モデルとマイグレーション:**
    *   `User` モデル: ネイティブ認証ジェネレータで生成します。
    *   `Drawing` モデル: `title` (string), `user_id` (integer) を持ち、`has_many :drawing_elements` を関連付けます。
    *   `DrawingElement` モデル: `drawing_id` (integer), `user_id` (integer), `element_type` (string, 例: 'line'), `data` (jsonb, 描画の詳細データ) を持ちます。
3.  **Action Cableチャネル (`DrawingChannel`):**
    *   クライアントからの描画データを受信し、接続しているすべてのクライアントにブロードキャストするロジックを実装します。
    *   `DrawingElement` モデルが作成された際に、そのJSONデータをブロードキャストするように設定します。
4.  **APIコントローラー:**
    *   `api/v1/drawings_controller.rb` と `api/v1/drawing_elements_controller.rb` を作成し、描画ボードの作成・取得、描画要素の保存・取得を行うJSON APIエンドポイントを定義します。
5.  **Reactアプリケーション:**
    *   `frontend/` ディレクトリ内にReact (TypeScript) プロジェクトをセットアップします。
    *   `DrawingCanvas.tsx` コンポーネントを作成し、HTML5 Canvas APIを使用して描画ロジックを実装します。
    *   `@rails/actioncable` ライブラリを使用してAction Cableに接続し、描画イベントを送信・受信します。
    *   受信した描画データに基づいてキャンバスをリアルタイムで更新します。
    *   ユーザー認証のためのログイン/登録フォームと、Rails APIへのリクエストロジックを実装します。
6.  **CORS設定:**
    *   `rack-cors` gem を使用して、Rails APIがReactフロントエンドからのリクエストを受け入れられるように設定します。
7.  **Kamal設定:**
    *   `Dockerfile` と `deploy.yml` の基本的な設定を生成し、アプリケーションがDockerコンテナとしてデプロイ可能であることを示します。

**期待される成果物:**

*   完全に機能するRails 8 APIアプリケーション。
*   TypeScriptとReactで構築されたフロントエンドアプリケーション。
*   リアルタイム描画機能が動作すること。
*   ユーザー認証機能が動作すること。
*   SQLiteデータベースが適切に設定されていること。
*   Kamalデプロイのための初期設定ファイル。

---
