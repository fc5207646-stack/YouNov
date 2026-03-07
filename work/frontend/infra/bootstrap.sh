#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "未检测到 Docker Compose：请安装 Docker Desktop / docker compose 插件。" >&2
  exit 1
fi

echo "[YouNov] 启动/构建基础设施容器…"
$COMPOSE up -d --build

echo "[YouNov] 等待 API 容器可执行 Prisma 迁移…"
i=0
until $COMPOSE exec -T api sh -lc "npx prisma migrate deploy"; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[YouNov] 等待超时：API/DB 可能尚未就绪。请查看日志后重试。" >&2
    $COMPOSE logs --tail=200 api db 2>/dev/null || true
    exit 1
  fi
  echo "[YouNov] 第 $i 次尝试失败，2 秒后重试…"
  sleep 2
done

echo "[YouNov] 执行种子数据（seed）…"
$COMPOSE exec -T api sh -lc "node prisma/seed.js"

echo "[YouNov] 初始化完成："
echo "  - Web: http://localhost/"
echo "  - API: http://localhost/api/health"

