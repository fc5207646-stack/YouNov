@echo off
cd /d "%~dp0"
title Younov Code Backup

echo ========================================================
echo Starting Code Backup Process...
echo Target Servers: LB, API(1), API(2)
echo Config File: backup-config-code.json
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File ".\backup-run.ps1" -ConfigPath "backup-config-code.json"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Code backup completed!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [ERROR] Backup script failed. Error Code: %ERRORLEVEL%
    echo Please check the output above for details.
    echo ========================================================
)

echo.
pause