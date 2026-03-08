# 部署「8 分类」更新：前端 + 后端 API 到线上
# 使用前：1) 已在本机执行过前端 build:clean  2) SSH 密钥可登录 107.174.174.123 及跳板到 10.50.0.2/10.50.0.3

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$LB_HOST = "107.174.174.123"
$API_HOSTS = @("10.50.0.2", "10.50.0.3")
$USER = "root"
$KEY = "C:\Users\Administrator\.ssh\id_ed25519"
$SSH_OPTS = @("-o", "StrictHostKeyChecking=accept-new", "-o", "Compression=yes", "-i", $KEY)

# 0. 前端干净构建（确保 8 分类等新代码打进包）
Write-Host "=== 0. 前端干净构建 ===" -ForegroundColor Cyan
Set-Location "$ProjectRoot\work\frontend"; npm run build:clean; Set-Location $ProjectRoot

Write-Host "=== 1. 上传前端到 Hub ($LB_HOST) ===" -ForegroundColor Cyan
$dist = "$ProjectRoot\work\frontend\dist"
if (-not (Test-Path "$dist\index.html")) { Write-Error "前端构建失败：缺少 dist\index.html" }
scp @SSH_OPTS "$dist\index.html" "${USER}@${LB_HOST}:/var/www/younov/dist/"
scp @SSH_OPTS -r "$dist\assets\*" "${USER}@${LB_HOST}:/var/www/younov/dist/assets/"
# 服务器上只保留 index.html 引用的 index-*.js，删除其余旧文件，避免用户加载到旧分类
ssh @SSH_OPTS "${USER}@${LB_HOST}" "REF=`$(grep -oE 'index-[^\"']+\.js' /var/www/younov/dist/index.html | head -1); cd /var/www/younov/dist/assets && for f in index-*.js; do [ \"`$f\" != \"`$REF\" ] && rm -f \"`$f\" && echo removed old: `$f; done; chown -R www-data:www-data /var/www/younov/dist 2>/dev/null || true; chmod -R 755 /var/www/younov/dist 2>/dev/null || true"
Write-Host "Frontend done." -ForegroundColor Green

Write-Host "=== 2. 上传后端到 API 节点 ===" -ForegroundColor Cyan
$apiSrc = "$ProjectRoot\work\api\src\index.js"
$apiPkg = "$ProjectRoot\work\api\package.json"
$apiPrisma = "$ProjectRoot\work\api\prisma"
$REMOTE_API = "/opt/younov/api"

foreach ($ip in $API_HOSTS) {
    Write-Host "Deploy to $ip ..."
    scp @SSH_OPTS -o "ProxyJump ${USER}@${LB_HOST}" $apiSrc "${USER}@${ip}:${REMOTE_API}/src/index.js"
    scp @SSH_OPTS -o "ProxyJump ${USER}@${LB_HOST}" $apiPkg "${USER}@${ip}:${REMOTE_API}/package.json"
    scp @SSH_OPTS -o "ProxyJump ${USER}@${LB_HOST}" -r $apiPrisma "${USER}@${ip}:${REMOTE_API}/"
    if ($ip -eq $API_HOSTS[0]) {
        ssh @SSH_OPTS -J "${USER}@${LB_HOST}" "${USER}@${ip}" "cd $REMOTE_API && npm install --production && npx prisma generate && systemctl restart younov-api"
    } else {
        ssh @SSH_OPTS -J "${USER}@${LB_HOST}" "${USER}@${ip}" "cd $REMOTE_API && npm install --production && npx prisma generate && systemctl restart younov-api"
    }
    Write-Host "  $ip OK" -ForegroundColor Green
}

Write-Host "`nDeploy completed. Check https://younov.com/browse and https://younov.com/free for 8 categories." -ForegroundColor Yellow
