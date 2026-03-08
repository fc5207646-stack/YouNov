#!/usr/bin/env bash
# 在 API 服务器（10.50.0.2 或 10.50.0.3）上执行，收集与「小说详情 404」相关的真实状态。
# 用法：ssh 登录到 10.50.0.2 或 10.50.0.3 后执行：bash -s < scripts/check-api-server.sh
# 或直接把本脚本 scp 到服务器后：bash check-api-server.sh

set -e
API_HOSTNAME=$(hostname)
echo "========== API 服务器: $API_HOSTNAME ($(date -Iseconds)) =========="

echo ""
echo "--- 1. 进程与监听端口 ---"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep -E ':8080|:3000' || true
else
  netstat -tlnp 2>/dev/null | grep -E ':8080|:3000' || true
fi
echo ""

echo "--- 2. younov-api 服务状态 ---"
systemctl is-active younov-api 2>/dev/null || echo "(未找到 younov-api 或非 systemd)"
systemctl show younov-api --property=MainPID,ExecMainStart 2>/dev/null || true
echo ""

echo "--- 3. 工作目录与可执行文件 ---"
# 常见部署路径
for dir in /opt/younov/api /opt/younov /var/www/younov/api; do
  if [[ -d "$dir" ]]; then
    echo "目录存在: $dir"
    ls -la "$dir/" 2>/dev/null | head -20
    if [[ -f "$dir/package.json" ]]; then
      echo "  package.json 存在"
    fi
    if [[ -f "$dir/src/index.js" ]]; then
      echo "  src/index.js 存在, 行数: $(wc -l < "$dir/src/index.js")"
      grep -n "PEER_API_URL\|fetchFromPeer\|novels/:slug" "$dir/src/index.js" 2>/dev/null | head -20
    fi
  fi
done
echo ""

echo "--- 4. 环境变量（.env / api.env）---"
for envfile in /opt/younov/api/.env /opt/younov/.env /opt/younov/infra/prod/api/api.env; do
  if [[ -f "$envfile" ]]; then
    echo "文件: $envfile"
    # 只打印键名和是否为空，不打印密码全文
    grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$envfile" 2>/dev/null | while IFS= read -r line; do
      key="${line%%=*}"
      val="${line#*=}"
      if [[ "$key" == *PASSWORD* ]] || [[ "$key" == *SECRET* ]] || [[ "$key" == *TOKEN* ]]; then
        echo "  $key=<***>"
      else
        echo "  $key=$val"
      fi
    done
    echo ""
  fi
done
echo ""

echo "--- 5. 本机直接请求 /api/novels/nifeng-fanpan ---"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 "http://127.0.0.1:8080/api/novels/nifeng-fanpan" 2>/dev/null || echo "请求失败或超时"
echo ""

echo "--- 6. 本机直接请求 /api/novels (列表) ---"
curl -sS --connect-timeout 5 "http://127.0.0.1:8080/api/novels?take=3" 2>/dev/null | head -c 500
echo ""
echo ""

echo "--- 7. 是否包含 fetchFromPeer 与 PEER_API_URL 逻辑 ---"
for f in /opt/younov/api/src/index.js /opt/younov/src/index.js; do
  if [[ -f "$f" ]]; then
    if grep -q "fetchFromPeer" "$f" 2>/dev/null; then echo "  $f: 包含 fetchFromPeer"; else echo "  $f: 不包含 fetchFromPeer"; fi
    if grep -q "PEER_API_URL" "$f" 2>/dev/null; then echo "  $f: 包含 PEER_API_URL"; else echo "  $f: 不包含 PEER_API_URL"; fi
    break
  fi
done
echo ""

echo "--- 8. 本机 DATABASE_URL 下是否能看到小说 nifeng-fanpan（需在 API 目录执行）---"
echo "请在当前机执行: cd /opt/younov/api && node scripts/check-novel-in-db.js nifeng-fanpan"
echo ""

echo "========== API 检查结束 =========="
