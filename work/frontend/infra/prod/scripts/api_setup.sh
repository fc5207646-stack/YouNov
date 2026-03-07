#!/usr/bin/env bash
set -euo pipefail

# API 服务器（10.50.0.2 / 10.50.0.3）一键部署脚本
# 用法：
#   1) 把仓库放到 /opt/younov
#   2) 准备 /opt/younov/infra/prod/api/api.env
#   3) 在 API 机执行：bash /opt/younov/infra/prod/scripts/api_setup.sh

REPO_DIR="${REPO_DIR:-/opt/younov}"
COMPOSE_DIR="$REPO_DIR/infra/prod/api"
ENV_FILE="$COMPOSE_DIR/api.env"

echo "[api_setup] Installing docker..."
apt update
apt install -y docker.io docker-compose-plugin
systemctl enable --now docker

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[api_setup] Missing $ENV_FILE"
  echo "[api_setup] Create it from: $COMPOSE_DIR/api.env.example"
  exit 1
fi

echo "[api_setup] Starting API (build)..."
cd "$COMPOSE_DIR"
docker compose up -d --build

echo "[api_setup] Running Prisma migrate deploy..."
docker compose exec -T api sh -lc "npx prisma migrate deploy"

echo "[api_setup] Running seed..."
docker compose exec -T api sh -lc "node prisma/seed.js"

echo "[api_setup] Health check (local):"
curl -sS http://127.0.0.1:8080/api/health || true
echo

echo "[api_setup] Done."

