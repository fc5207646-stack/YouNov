#!/usr/bin/env bash
# 在数据库服务器（10.50.0.4 或 10.50.0.5）上执行，检查小说 nifeng-fanpan 是否存在。
# 用法：ssh 登录到 10.50.0.4 或 10.50.0.5 后执行。
# 需要本机有 psql 且能连上本机 PostgreSQL（或从 .env 读 DATABASE_URL 需在 API 机上跑）。
# 若 DB 机未装 psql，可在 API 机上用 node 执行 scripts/check-db-via-api.js（见仓库）。

set -e
DB_HOSTNAME=$(hostname)
echo "========== 数据库服务器: $DB_HOSTNAME ($(date -Iseconds)) =========="

echo ""
echo "--- 1. PostgreSQL 进程与监听 ---"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep -E ':5432|:6432' || true
else
  netstat -tlnp 2>/dev/null | grep -E ':5432|:6432' || true
fi
echo ""

echo "--- 2. 若本机有 psql，检查小说 slug=nifeng-fanpan（需本地可连且知道库名/用户）---"
echo "以下需根据你实际 DATABASE_URL 修改：库名、用户、端口。"
echo "示例（主库 10.50.0.4）："
echo '  PGPASSWORD=xxx psql -h 127.0.0.1 -p 5432 -U younov_app -d younov -t -c "SELECT id, slug, title, \"isPublished\" FROM \"Novel\" WHERE slug = '\''nifeng-fanpan'\'';"'
echo ""
echo "若无法在 DB 机执行 psql，请在 API 机（10.50.0.2 或 10.50.0.3）进入 API 目录执行："
echo "  cd /opt/younov/api && node scripts/check-novel-in-db.js nifeng-fanpan"
echo ""

echo "========== 数据库检查结束 =========="
