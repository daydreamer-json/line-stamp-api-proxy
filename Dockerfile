# Bunベースイメージを使用
# FROM oven/bun:alpine AS base
FROM oven/bun:alpine

# ユーザー設定（Hugging Faceの要件に従ってUID 1000）
# RUN adduser -D -u 1000 user

# 作業ディレクトリを設定
WORKDIR /app

# パッケージマネージャのキャッシュを利用するためにpackage.jsonを先にコピー
# COPY --chown=user:user package.json bun.lock ./

# 依存関係をインストール
# RUN bun install --frozen-lockfile

# ソースコードをコピー
COPY . .

# ユーザーを切り替え
# USER user

# ポートを公開（Hugging Face Spacesではapp_port設定と合わせる）
EXPOSE 3000

RUN apk add --no-cache ffmpeg \
  && bun install --production \
  && bun pm cache rm \
  && chmod -R 777 /app

# アプリケーションを起動
CMD ["bun", "run", "start"]
