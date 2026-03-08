param(
  [string]$ConfigPath = "$(Split-Path -Parent $MyInvocation.MyCommand.Path)\backup-config.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = $OutputEncoding
[Console]::InputEncoding = $OutputEncoding

function Fail($msg) {
  Write-Error $msg
  exit 1
}

function Log($msg) {
  Write-Host $msg
}

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
  }
}

function Escape-BashSingleQuote([string]$s) {
  if ($null -eq $s) { return "" }
  $replacement = "'" + '"' + "'" + '"' + "'"
  return $s -replace "'", $replacement
}

function Normalize-SshOptions($value) {
  if (-not $value) { return @() }
  if ($value -is [string]) { return $value -split "\s+" }
  if ($value -is [System.Collections.IEnumerable]) { return @($value) }
  return @()
}

function Get-ConfigValue($obj, [string]$name, $default = $null) {
  if ($null -eq $obj) { return $default }
  $prop = $obj.PSObject.Properties[$name]
  if ($null -eq $prop) { return $default }
  return $prop.Value
}

function Get-SshCommonArgs([string]$PrivateKey, [string[]]$Options, $JumpConfig, [string]$TargetHost) {
  $args = @()
  if ($Options) { $args += $Options }
  if ($PrivateKey) { $args += "-i"; $args += $PrivateKey }
  
  if ($JumpConfig -and $JumpConfig.enabled) {
     $jHost = $JumpConfig.sshHost
     if ($jHost -and $TargetHost -ne $jHost) {
        $jUser = Get-ConfigValue $JumpConfig "sshUser" "root"
        $args += "-J"
        $args += "$jUser@$jHost"
     }
  }
  return $args
}

function Invoke-SSH([string]$SshHost, [string]$SshUser, [int]$SshPort, [string]$Cmd, [string]$PrivateKey, [string[]]$Options, $JumpConfig) {
  $userHost = "$SshUser@$SshHost"
  $args = Get-SshCommonArgs -PrivateKey $PrivateKey -Options $Options -JumpConfig $JumpConfig -TargetHost $SshHost
  if ($SshPort) { $args += "-p"; $args += $SshPort }
  
  # Write-Host "DEBUG: ssh $args $userHost $Cmd"
  & ssh @args $userHost $Cmd
}

function Invoke-SCP([string]$SshHost, [string]$SshUser, [int]$SshPort, [string]$RemotePath, [string]$LocalPath, [string]$PrivateKey, [string[]]$Options, $JumpConfig) {
  $userHost = "$SshUser@$SshHost"
  $remote = "$userHost`:$RemotePath"
  $args = Get-SshCommonArgs -PrivateKey $PrivateKey -Options $Options -JumpConfig $JumpConfig -TargetHost $SshHost
  if ($SshPort) { $args += "-P"; $args += $SshPort }
  
  # Write-Host "DEBUG: scp $args $remote $LocalPath"
  & scp @args $remote $LocalPath
}

if (-not (Test-Path $ConfigPath)) {
  Fail "Config not found: $ConfigPath. Copy backup-config.example.json to backup-config.json and edit it."
}

$config = Get-Content -Raw $ConfigPath | ConvertFrom-Json
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Get-ConfigValue $config "baseDir" $scriptDir
if (-not (Test-Path $baseDir)) { $baseDir = $scriptDir }
$backupDataDir = Get-ConfigValue $config "backupDataDir" (Join-Path $baseDir "backup-data")
$backupCodeDir = Join-Path $baseDir "backup"
$workDir = Join-Path $baseDir "work"

$retainDays = [int](Get-ConfigValue $config "retainDays" 14)
$syncCode = [bool](Get-ConfigValue $config "syncCode" $true)
$updateWork = [bool](Get-ConfigValue $config "updateWork" $false)

$sshOptions = Normalize-SshOptions (Get-ConfigValue $config "sshOptions" $null)
$sshKey = Get-ConfigValue $config "sshPrivateKey" ""
$jumpConfig = Get-ConfigValue $config "jump" $null

$timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
Ensure-Dir $backupDataDir
$runDir = Join-Path $backupDataDir $timestamp
Ensure-Dir $runDir

Write-Host "== Younov backup run: $timestamp =="

# 1. Code Backup
if ($syncCode) {
    Write-Host "[code] Starting code backup..."
    Ensure-Dir $backupCodeDir
    
    $codeConfig = Get-ConfigValue $config "code" $null
    if ($codeConfig -and [bool](Get-ConfigValue $codeConfig "enabled" $false)) {
        $servers = Get-ConfigValue $codeConfig "servers" @()
        foreach ($s in $servers) {
            $name = $s.name
            $targetHost = $s.sshHost
            $user = Get-ConfigValue $s "sshUser" "root"
            $port = [int](Get-ConfigValue $s "sshPort" 22)
            $path = $s.path
            
            Log "Processing server: $name ($targetHost)"
            
            if (-not $path) { Log "  Skipping: No path defined"; continue }
            
            # Check if remote path exists
            try {
                Invoke-SSH -SshHost $targetHost -SshUser $user -SshPort $port -Cmd "test -d '$path' && echo OK" -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig | Out-Null
            } catch {
                Log "  Skipping: Remote check failed or path not found."
                continue
            }
            
            $targetDir = Join-Path $backupCodeDir $targetHost
            Ensure-Dir $targetDir
            
            # Use tar to backup
            $remoteTar = "/tmp/younov_backup_${name}_${timestamp}.tgz"
            $excludes = Get-ConfigValue $s "excludes" @()
            $excludeArgs = ($excludes | ForEach-Object { "--exclude='$_'" }) -join " "
            
            Log "  Creating remote archive..."
            $tarCmd = "tar -czf $remoteTar $excludeArgs -C '$path' ."
            Invoke-SSH -SshHost $targetHost -SshUser $user -SshPort $port -Cmd $tarCmd -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
            
            Log "  Downloading archive..."
            $localTar = Join-Path $targetDir "backup.tgz"
            Invoke-SCP -SshHost $targetHost -SshUser $user -SshPort $port -RemotePath $remoteTar -LocalPath $localTar -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
            
            Log "  Cleaning up remote..."
            Invoke-SSH -SshHost $targetHost -SshUser $user -SshPort $port -Cmd "rm -f $remoteTar" -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
            
            Log "  Extracting local..."
            & tar -xzf $localTar -C $targetDir
            try {
    Remove-Item $localTar
} catch {
    Log "Failed to remove temp file: $_"
}
            
            # Update work dir if needed
            if ($updateWork) {
                if (Get-ConfigValue $s "skipWorkUpdate" $false) {
                    Log "  Skipping work update for $name (skipWorkUpdate=true)"
                } else {
                    $subDir = Get-ConfigValue $s "updateWorkSubdir" $name
                    $workTarget = Join-Path $workDir $subDir
                    Ensure-Dir $workTarget
                    Log "  Updating work dir: $workTarget"
                    & robocopy $targetDir $workTarget /MIR /XD $excludes /NFL /NDL /NJH /NJS /NP | Out-Null
                }
            }
        }
    }
}

# 2. PG Backup
$pgResult = $null
$pg = Get-ConfigValue $config "pg" $null
if ($pg -and [bool](Get-ConfigValue $pg "enabled" $false)) {
  $pgTargets = Get-ConfigValue $pg "targets" @()
  $pgResultList = @()
  
  foreach ($t in $pgTargets) {
      $tName = $t.name
      $tHost = $t.sshHost
      $tUser = Get-ConfigValue $t "sshUser" "root"
      $tPort = [int](Get-ConfigValue $t "sshPort" 22)
      $dbName = Get-ConfigValue $t "dbName" "postgres"
      
      $pgRemote = "/tmp/younov_pg_${tName}_${timestamp}.dump"
      $pgLocal = Join-Path $runDir "pg_${tName}.dump"
      
      Write-Host "[pg:$tName] Creating remote dump on $tHost..."
      
      # Assuming peer/socket auth for 'postgres' user or similar.
      # The config says "method": "sudo_postgres_socket" which implies `sudo -u postgres pg_dump ...`
      
      $pgCmd = "pg_dump -Fc $dbName -f $pgRemote"
      
      # If sudo is needed
      if ($t.method -eq "sudo_postgres_socket") {
          $pgCmd = "sudo -u postgres $pgCmd"
      }
      
      try {
          Invoke-SSH -SshHost $tHost -SshUser $tUser -SshPort $tPort -Cmd $pgCmd -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
          Invoke-SCP -SshHost $tHost -SshUser $tUser -SshPort $tPort -RemotePath $pgRemote -LocalPath $pgLocal -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
          Invoke-SSH -SshHost $tHost -SshUser $tUser -SshPort $tPort -Cmd "rm -f $pgRemote" -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
          
          $pgResultList += @{
            name = $tName
            dump = (Split-Path -Leaf $pgLocal)
            host = $tHost
          }
      } catch {
          Write-Host "[pg:$tName] Backup failed: $_" -ForegroundColor Red
      }
  }
  $pgResult = $pgResultList
}

# 3. Redis Backup
$redisResult = $null
$redis = Get-ConfigValue $config "redis" $null
if ($redis -and [bool](Get-ConfigValue $redis "enabled" $false)) {
  $redisTargets = Get-ConfigValue $redis "targets" @()
  $redisResultList = @()
  
  foreach ($t in $redisTargets) {
      $tName = $t.name
      $tHost = $t.sshHost
      $tUser = Get-ConfigValue $t "sshUser" "root"
      $tPort = [int](Get-ConfigValue $t "sshPort" 22)
      
      $redisRemote = "/tmp/younov_redis_${tName}_${timestamp}.rdb"
      $redisLocal = Join-Path $runDir "redis_${tName}.rdb"
      
      Write-Host "[redis:$tName] Creating remote RDB on $tHost..."
      
      # Redis command
      # Note: redis-cli --rdb takes a local filename.
      # If password provided in config?
      $rPass = Get-ConfigValue $t "password" ""
      if ($rPass) {
          # Use REDISCLI_AUTH env var to avoid password in process list, but we need to export it in the same command string
          $escaped = $rPass -replace "'", "'\''"
          # Important: We need to use redis-cli with --rdb. 
          # Some older redis-cli might not support --rdb remote saving if not configured, but --rdb <file> is standard for local save.
          # We run this on the REMOTE server, so it saves to a file on the remote server.
          $redisCmd = "export REDISCLI_AUTH='$escaped'; redis-cli --rdb $redisRemote"
      } else {
          $redisCmd = "redis-cli --rdb $redisRemote"
      }
      
      Invoke-SSH -SshHost $tHost -SshUser $tUser -SshPort $tPort -Cmd $redisCmd -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
      Invoke-SCP -SshHost $tHost -SshUser $tUser -SshPort $tPort -RemotePath $redisRemote -LocalPath $redisLocal -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
      Invoke-SSH -SshHost $tHost -SshUser $tUser -SshPort $tPort -Cmd "rm -f $redisRemote" -PrivateKey $sshKey -Options $sshOptions -JumpConfig $jumpConfig
      
      $redisResultList += @{
        name = $tName
        dump = (Split-Path -Leaf $redisLocal)
        host = $tHost
      }
  }
  $redisResult = $redisResultList
}

# 4. Manifest & Cleanup
$manifest = [ordered]@{
  timestamp = $timestamp
  backupDataDir = $backupDataDir
  codeSync = $syncCode
  pg = $pgResult
  redis = $redisResult
}

$manifestPath = Join-Path $runDir "manifest.json"
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $manifestPath

if ($retainDays -gt 0) {
  $cutoff = (Get-Date).AddDays(-$retainDays)
  Get-ChildItem $backupDataDir -Directory | Where-Object {
    $_.Name -match '^\d{8}_\d{6}$' -and $_.LastWriteTime -lt $cutoff
  } | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName
  }
  
  # Clean up logs too
  $logDir = Join-Path $baseDir "backup-logs"
  if (Test-Path $logDir) {
      Get-ChildItem -Path $logDir | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
        Remove-Item $_.FullName -Force
      }
  }
}

Write-Host "Backup complete: $runDir"
