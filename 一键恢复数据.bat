@echo off
cd /d "%~dp0"
title Younov Data Recovery

echo ========================================================
echo WARNING: THIS WILL OVERWRITE REMOTE DATABASE AND REDIS!
echo ========================================================
echo This script will restore the LATEST backup found in backup-data/
echo.
echo Press Ctrl+C to CANCEL, or any key to PROCEED.
pause

echo.
echo Starting Recovery...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\restore-data.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Recovery completed!
) else (
    echo.
    echo [ERROR] Recovery failed!
)
pause