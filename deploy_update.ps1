$ErrorActionPreference = "Stop"

# Configuration
$LB_HOST = "107.174.174.123"
$API_HOSTS = @("10.50.0.2", "10.50.0.3")
$USER = "root"
$KEY = "C:\Users\Administrator\.ssh\id_ed25519"
$SSH_OPTS = @("-o", "StrictHostKeyChecking=accept-new", "-i", $KEY)

# 1. Deploy Frontend
Write-Host "Deploying Frontend to $LB_HOST..."
$FRONTEND_DIST = "work\frontend\dist"
$REMOTE_DIST = "/var/www/younov/dist"

# Upload files
# scp $SSH_OPTS -r "$FRONTEND_DIST\*" "$USER@${LB_HOST}:$REMOTE_DIST"

# Upload specific files and folders to avoid large APK/IPA re-upload
Write-Host "Uploading frontend files with rsync..."
# Using rsync to efficiently sync the dist directory contents.
robocopy "$FRONTEND_DIST" "\\$LB_HOST\c$\var\www\younov\dist" /E
robocopy "work\frontend\public" "\\$LB_HOST\c$\var\www\younov\dist" favicon.ico

# Fix permissions
ssh $SSH_OPTS "$USER@$LB_HOST" "chown -R www-data:www-data $REMOTE_DIST && chmod -R 755 $REMOTE_DIST"
Write-Host "Frontend deployed successfully."

# 2. Deploy Backend
Write-Host "Deploying Backend..."
$BACKEND_SRC = "work\api\src\index.js"
$BACKEND_PKG = "work\api\package.json"
$BACKEND_PRISMA = "work\api\prisma"
$REMOTE_API_DIR = "/opt/younov/api"

foreach ($serverIp in $API_HOSTS) {
    Write-Host "Deploying to $serverIp (via Jump)..."
    
    # Upload index.js
    scp $SSH_OPTS -o "ProxyJump $USER@$LB_HOST" $BACKEND_SRC "$USER@${serverIp}:$REMOTE_API_DIR/src/index.js"
    
    # Upload package.json
    scp $SSH_OPTS -o "ProxyJump $USER@$LB_HOST" $BACKEND_PKG "$USER@${serverIp}:$REMOTE_API_DIR/package.json"

    # Upload prisma directory (schema + migrations)
    scp $SSH_OPTS -o "ProxyJump $USER@$LB_HOST" -r $BACKEND_PRISMA "$USER@${serverIp}:$REMOTE_API_DIR/"
    
    # Run npm install and restart
    # Also run DB migration on the first node only
    if ($serverIp -eq $API_HOSTS[0]) {
        Write-Host "Running DB Migrations on $serverIp..."
        ssh $SSH_OPTS -J "$USER@$LB_HOST" "$USER@$serverIp" "cd $REMOTE_API_DIR && npm install --production && npx prisma migrate deploy && systemctl restart younov-api"
    } else {
        ssh $SSH_OPTS -J "$USER@$LB_HOST" "$USER@$serverIp" "cd $REMOTE_API_DIR && npm install --production && systemctl restart younov-api"
    }
    
    Write-Host "Backend $serverIp deployed and restarted."
}

Write-Host "All deployments completed!"

# Cloudflare Configuration Hint
# To apply Cloudflare Nginx config, run:
# scp $SSH_OPTS "configure_cloudflare.sh" "$USER@$LB_HOST:/tmp/"
# ssh $SSH_OPTS "$USER@$LB_HOST" "chmod +x /tmp/configure_cloudflare.sh && sudo /tmp/configure_cloudflare.sh"
