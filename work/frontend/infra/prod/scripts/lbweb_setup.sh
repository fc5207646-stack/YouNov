#!/usr/bin/env bash
set -euo pipefail

# LB + Web 服务器（107.174.174.123）一键部署脚本
# 用法：
#   1) 把仓库放到 /opt/younov
#   2) 在 LB 机执行：bash /opt/younov/infra/prod/scripts/lbweb_setup.sh

REPO_DIR="${REPO_DIR:-/opt/younov}"
COMPOSE_DIR="$REPO_DIR/infra/prod/lb-web"

echo "[lbweb_setup] Installing docker..."
apt update
apt install -y docker.io docker-compose-plugin
systemctl enable --now docker

echo "[lbweb_setup] Starting LB+Web (build)..."
cd "$COMPOSE_DIR"
docker compose up -d --build

echo "[lbweb_setup] Health check via LB (local):"
curl -sS http://127.0.0.1/api/health || true
echo

echo "[lbweb_setup] Done."

