# 使用 Bun 官方映像
FROM oven/bun:1 AS base
WORKDIR /app

# 安裝依賴
FROM base AS install
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# 最終映像
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY . .

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 暴露 port
EXPOSE 3000

# 啟動應用
CMD ["bun", "run", "src/app.ts"]
