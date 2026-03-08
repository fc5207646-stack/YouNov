# API-only deploy: upload index.js and restart. No frontend, no npm install.
# Runs sequentially so password prompts (if any) show in this window. Uses Compression=yes.

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$LB_HOST = "107.174.174.123"
$API_HOSTS = @("10.50.0.2", "10.50.0.3")
$USER = "root"
$KEY = "C:\Users\Administrator\.ssh\id_ed25519"
$SSH_OPTS = @("-o", "StrictHostKeyChecking=accept-new", "-o", "Compression=yes", "-i", $KEY)
$REMOTE_API = "/opt/younov/api"
$apiSrc = "$ProjectRoot\work\api\src\index.js"

if (-not (Test-Path $apiSrc)) { Write-Error "Missing: $apiSrc" }

Write-Host "=== Deploy API (index.js + restart) ===" -ForegroundColor Cyan
Write-Host "When you see 0% / stalled, type root@${LB_HOST} password here (no echo), then Enter." -ForegroundColor Yellow
foreach ($ip in $API_HOSTS) {
    Write-Host "  $ip upload..." -NoNewline
    scp @SSH_OPTS -o "ProxyJump ${USER}@${LB_HOST}" $apiSrc "${USER}@${ip}:${REMOTE_API}/src/index.js"
    Write-Host " restart..." -NoNewline
    ssh @SSH_OPTS -J "${USER}@${LB_HOST}" "${USER}@${ip}" "systemctl restart younov-api"
    Write-Host " OK" -ForegroundColor Green
}
Write-Host "Done. API updated and restarted." -ForegroundColor Yellow
