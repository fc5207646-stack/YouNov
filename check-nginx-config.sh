#!/bin/bash
# 在服务器 107.174.174.123 上运行，确认当前 Nginx 配置
# 用法：ssh root@107.174.174.123 'bash -s' < check-nginx-config.sh
# 或先 scp 到服务器再执行：chmod +x check-nginx-config.sh && ./check-nginx-config.sh

set -e
echo "========== 1. Nginx 主配置（包含的片段） =========="
cat /etc/nginx/nginx.conf 2>/dev/null | grep -E "include|conf.d|sites-enabled" || true

echo ""
echo "========== 2. 已启用的站点配置（sites-enabled） =========="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "目录不存在或为空"

echo ""
echo "========== 3. conf.d 下的配置 =========="
ls -la /etc/nginx/conf.d/*.conf 2>/dev/null || echo "无或不可读"

echo ""
echo "========== 4. 包含 younov 的配置文件名 =========="
grep -rl "younov\|server_name.*younov" /etc/nginx/ 2>/dev/null || true

echo ""
echo "========== 5. younov 相关 server 的 root 与 location / =========="
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null; do
  [ -f "$f" ] || continue
  if grep -q "younov\|server_name" "$f" 2>/dev/null; then
    echo "--- 文件: $f ---"
    grep -E "root |location /|try_files" "$f" | sed 's/^/  /'
    echo ""
  fi
done

echo "========== 6. 测试配置是否合法 =========="
nginx -t 2>&1 || true
