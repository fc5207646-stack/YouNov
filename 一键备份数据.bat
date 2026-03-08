@echo off
cd /d "%~dp0"
title Younov Data Backup

echo ========================================================
echo Starting Data Backup Process (Database + Redis)...
echo Target Servers: PG [Primary/Replica], Redis
echo Config File: backup-config-data.json
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File ".\backup-run.ps1" -ConfigPath "backup-config-data.json"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Data backup completed!
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