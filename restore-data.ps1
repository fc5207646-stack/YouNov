param(
  [string]$BackupDir,
  [string]$ConfigPath = "backup-config-data.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($msg) { Write-Error $msg; exit 1 }
function Log($msg) { Write-Host $msg }

# Load Config
if (-not (Test-Path $ConfigPath)) { Fail "Config not found: $ConfigPath" }
$config = Get-Content -Raw $ConfigPath | ConvertFrom-Json
$sshKey = $config.sshPrivateKey
$jumpConfig = $config.jump
$sshOptions = $config.sshOptions

# Helper for SSH
function Get-SshArgs([string]$HostName, [string]$User) {
    $args = @("-i", $sshKey) + $sshOptions
    if ($jumpConfig.enabled) {
        $args += "-J"
        $args += "$($jumpConfig.sshUser)@$($jumpConfig.sshHost)"
    }
    return $args
}

if (-not $BackupDir) {
    # Auto-detect latest backup
    $baseDir = "backup-data"
    if (-not (Test-Path $baseDir)) { Fail "No backup-data directory found." }
    $latest = Get-ChildItem $baseDir | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { Fail "No backups found." }
    $BackupDir = $latest.FullName
}

if (-not (Test-Path $BackupDir)) { Fail "Backup directory not found: $BackupDir" }

Log "== Starting Recovery from: $(Split-Path -Leaf $BackupDir) =="

# 1. Restore Postgres (Primary Only)
$pgDump = Join-Path $BackupDir "pg_primary.dump"
if (Test-Path $pgDump) {
    Log "[PG] Restoring Primary Database..."
    $target = $config.pg.targets | Where-Object { $_.name -eq "primary" } | Select-Object -First 1
    if ($target) {
        $remoteDump = "/tmp/restore_pg.dump"
        $sshArgs = Get-SshArgs -HostName $target.sshHost -User $target.sshUser
        $scpArgs = $sshArgs # Same args for scp
        
        Log "  Uploading dump..."
        # Note: In PowerShell, passing array to external command requires @
        # But for scp/ssh with complex args, sometimes it's easier to build string or careful array splatting.
        # Let's use the same logic as backup script but simplified.
        
        # We need to construct the command line carefully.
        # Using a simpler approach: construct the jump argument string
        $jumpArg = ""
        if ($jumpConfig.enabled) {
            $jumpArg = "-J $($jumpConfig.sshUser)@$($jumpConfig.sshHost)"
        }
        
        # Upload
        # scp -i key -J jump file user@host:/path
        $scpCmd = "scp -i `"$sshKey`" $jumpArg -o StrictHostKeyChecking=accept-new `"$pgDump`" $($target.sshUser)@$($target.sshHost):$remoteDump"
        Invoke-Expression $scpCmd
        
        Log "  Restoring DB..."
        # Stop services -> Drop DB -> Create DB -> Restore
        # NOTE: This is destructive!
        $restoreCmd = "sudo -u postgres pg_restore -d younov --clean --if-exists -c $remoteDump"
        # We might need to terminate connections first:
        # NOTE: PowerShell string escaping is tricky with single quotes inside double quotes inside Invoke-Expression
        # We'll use a simpler approach: put the SQL command in a variable and escape it carefully
        
        $killSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'younov' AND pid <> pg_backend_pid();"
        $killCmd = "sudo -u postgres psql -c `"$killSql`""
        
        # Combine commands for SSH
        $remoteScript = "$killCmd; $restoreCmd; rm -f $remoteDump"
        
        # Use single quotes for the outer SSH command to protect the inner bash string
        # But we need to handle the jump arg and key which are variables
        
        $sshCmd = "ssh -i `"$sshKey`" $jumpArg -o StrictHostKeyChecking=accept-new $($target.sshUser)@$($target.sshHost) `"$remoteScript`""
        
        Log "  Executing restore command..."
        # Write-Host "DEBUG: $sshCmd"
        Invoke-Expression $sshCmd
        
        Log "  PG Restore Complete."
    }
} else {
    Log "[PG] Warning: pg_primary.dump not found."
}

# 2. Restore Redis
$redisDump = Join-Path $BackupDir "redis_redis.rdb"
if (Test-Path $redisDump) {
    Log "[Redis] Restoring Redis..."
    $target = $config.redis.targets | Where-Object { $_.name -eq "redis" } | Select-Object -First 1
    if ($target) {
        $remoteDump = "/tmp/dump.rdb"
        $jumpArg = ""
        if ($jumpConfig.enabled) { $jumpArg = "-J $($jumpConfig.sshUser)@$($jumpConfig.sshHost)" }
        
        Log "  Uploading RDB..."
        $scpCmd = "scp -i `"$sshKey`" $jumpArg -o StrictHostKeyChecking=accept-new `"$redisDump`" $($target.sshUser)@$($target.sshHost):$remoteDump"
        Invoke-Expression $scpCmd
        
        Log "  Swapping RDB file..."
        # Stop redis -> swap file -> fix permissions -> start redis
        $cmds = @(
            "systemctl stop redis-server",
            "cp $remoteDump /var/lib/redis/dump.rdb",
            "chown redis:redis /var/lib/redis/dump.rdb",
            "chmod 660 /var/lib/redis/dump.rdb",
            "rm -f $remoteDump",
            "systemctl start redis-server"
        )
        $fullCmd = $cmds -join " && "
        $sshCmd = "ssh -i `"$sshKey`" $jumpArg -o StrictHostKeyChecking=accept-new $($target.sshUser)@$($target.sshHost) `"$fullCmd`""
        Invoke-Expression $sshCmd
        Log "  Redis Restore Complete."
    }
}

Log "== Recovery Complete =="
