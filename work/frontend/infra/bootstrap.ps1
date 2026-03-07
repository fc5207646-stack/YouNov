$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Invoke-Compose {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Args
  )

  # Prefer `docker compose`, fallback to `docker-compose`
  try {
    & docker compose version *> $null
    & docker compose @Args
    return
  }
  catch {
    # ignore, fallback
  }

  $dockerCompose = Get-Command docker-compose -ErrorAction SilentlyContinue
  if (-not $dockerCompose) {
    throw "Docker Compose not found. Please install Docker Desktop or docker compose plugin."
  }
  & docker-compose @Args
}

Write-Host "[YouNov] Starting containers (build if needed)..."
Invoke-Compose up -d --build

Write-Host "[YouNov] Waiting for Prisma migrations to succeed..."
$maxTries = 30
for ($i = 1; $i -le $maxTries; $i++) {
  try {
    Invoke-Compose exec -T api sh -lc "npx prisma migrate deploy"
    break
  }
  catch {
    if ($i -eq $maxTries) {
      Write-Error "[YouNov] Timeout: API/DB may not be ready. Please check logs and retry."
      try { Invoke-Compose logs --tail=200 api db } catch {}
      exit 1
    }
    Write-Host "[YouNov] Try $i failed; retrying in 2s..."
    Start-Sleep -Seconds 2
  }
}

Write-Host "[YouNov] Running seed..."
Invoke-Compose exec -T api sh -lc "node prisma/seed.js"

Write-Host "[YouNov] Done:"
Write-Host "  - Web: http://localhost/"
Write-Host "  - API: http://localhost/api/health"

