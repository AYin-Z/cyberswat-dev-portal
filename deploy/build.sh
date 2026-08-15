# 生产构建脚本 — 宿主构建 → 镜像 COPY（沿用主站模式）
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"

echo "==> 1/4 构建 workspace"
pnpm -r build

echo "==> 2/4 生成 API 部署产物"
rm -rf deploy/api
pnpm --filter @cyberswat/dev-api deploy --prod --legacy deploy/api
# deploy 产物里的 dist 是构建产物；保留 prisma schema/migrations
cp -r apps/api/prisma deploy/api/prisma 2>/dev/null || true

echo "==> 3/4 构建镜像"
docker build -f Dockerfile.web -t cyberswat-dev-web:latest .
docker build -f Dockerfile.api -t cyberswat-dev-api:latest .

echo "==> 4/4 部署"
docker compose up -d --remove-orphans
docker ps --filter name=cyberswat-dev

echo "==> 完成: http://127.0.0.1:8092"
