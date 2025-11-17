@echo off
REM Cloudflare Tunnel Setup Script for Telegram Mini App Testing
REM No account or auth token needed!

echo ============================================
echo Telegram Mini App - Cloudflare Tunnel Setup
echo ============================================
echo.
echo Starting Cloudflare tunnels...
echo.
echo Two PowerShell windows will open:
echo 1. Frontend Tunnel (port 3000)
echo 2. Backend Tunnel (port 8001)
echo.
echo In each window, look for the line:
echo   https://random-words.trycloudflare.com
echo.
echo Copy both URLs!
echo.

REM Start frontend tunnel
start "Cloudflare Tunnel - Frontend (3000)" powershell.exe -NoExit -Command "Write-Host '============================================' -ForegroundColor Cyan; Write-Host '   Frontend Tunnel (Port 3000)' -ForegroundColor Cyan; Write-Host '============================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting tunnel...' -ForegroundColor Yellow; Write-Host ''; cd $env:USERPROFILE; .\cloudflared.exe tunnel --url http://localhost:3000"

REM Wait before starting second tunnel
timeout /t 3 /nobreak >nul

REM Start backend tunnel
start "Cloudflare Tunnel - Backend (8001)" powershell.exe -NoExit -Command "Write-Host '============================================' -ForegroundColor Cyan; Write-Host '   Backend Tunnel (Port 8001)' -ForegroundColor Cyan; Write-Host '============================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting tunnel...' -ForegroundColor Yellow; Write-Host ''; cd $env:USERPROFILE; .\cloudflared.exe tunnel --url http://localhost:8001"

echo.
echo ============================================
echo Tunnels Starting!
echo ============================================
echo.
echo IMPORTANT: Look at the two PowerShell windows
echo.
echo In the FRONTEND window, find the URL like:
echo   https://abc-def-ghi.trycloudflare.com
echo.
echo In the BACKEND window (port 8001), find the URL like:
echo   https://xyz-123-456.trycloudflare.com
echo.
echo.
echo After you have both URLs, I'll help you configure them!
echo.
echo Next steps:
echo 1. Copy the Frontend URL from the first window
echo 2. Copy the Backend URL from the second window
echo 3. Run: configure-app.bat FRONTEND_URL BACKEND_URL
echo.
echo Example:
echo configure-app.bat https://abc.trycloudflare.com https://xyz.trycloudflare.com
echo.
pause



