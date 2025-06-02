FROM node:20-slim

# アプリケーションディレクトリの作成
WORKDIR /app

# パッケージファイルをコピーして依存関係をインストール
COPY package*.json ./
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# 開発サーバーのポートを公開
EXPOSE 5173

# 開発サーバーを起動
CMD ["npm", "run", "dev"]
