@echo off
cd /d "%~dp0"
title Younov Deployment

echo ========================================================
echo Starting Deployment Process...
echo This will compile frontend code and overwrite remote files.
echo Steps:
echo 1. Compile Frontend (Vite Build)
echo 2. Sync files to staging
echo 3. Distribute to servers (LB + API)
echo.
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File ".\deploy_update.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Deployment completed!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [ERROR] Deployment script failed. Error Code: %ERRORLEVEL%
    echo ========================================================
)

echo.
pause