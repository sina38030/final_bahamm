@echo off
REM ngrok Paid Plan Setup Script for Telegram Mini App Testing
REM Requires ngrok paid plan for persistent URLs

echo ============================================
echo Telegram Mini App - ngrok Paid Plan Setup
echo ============================================
echo.
echo Starting ngrok tunnels with persistent domains...
echo.
echo This script assumes you have:
echo 1. ngrok paid plan ($5/month)
echo 2. Reserved domains: frontend.ngrok.io and backend.ngrok.io
echo 3. ngrok config file with your domains
echo.
echo Two PowerShell windows will open:
echo 1. Frontend Tunnel (port 3000) -> frontend.ngrok.io
echo 2. Backend Tunnel (port 8001) -> backend.ngrok.io
echo.
echo These URLs will be persistent!
echo.


REM Start frontend tunnel with reserved domain
start "ngrok Frontend (3000)" powershell.exe -NoExit -Command "Write-Host '============================================' -ForegroundColor Cyan; Write-Host '   Frontend Tunnel (Port 3000)' -ForegroundColor Cyan; Write-Host '   Domain: frontend.ngrok.io' -ForegroundColor Green; Write-Host '============================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting tunnel...' -ForegroundColor Yellow; Write-Host ''; cd $env:USERPROFILE\ngrok; .\ngrok.exe http 3000 --subdomain=frontend"

REM Wait before starting second tunnel
timeout /t 3 /nobreak >nul

REM Start backend tunnel with reserved domain
start "ngrok Backend (8001)" powershell.exe -NoExit -Command "Write-Host '============================================' -ForegroundColor Cyan; Write-Host '   Backend Tunnel (Port 8001)' -ForegroundColor Cyan; Write-Host '   Domain: backend.ngrok.io' -ForegroundColor Green; Write-Host '============================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting tunnel...' -ForegroundColor Yellow; Write-Host ''; cd $env:USERPROFILE\ngrok; .\ngrok.exe http 8001 --subdomain=backend"

echo.
echo ============================================
echo Persistent Tunnels Starting!
echo ============================================
echo.
echo IMPORTANT: Your URLs will be:
echo.
echo Frontend: https://frontend.ngrok.io
echo Backend:  https://backend.ngrok.io
echo.
echo These URLs NEVER change with paid plan!
echo.
echo Next steps:
echo 1. Wait for tunnels to start (green status)
echo 2. Run: configure-app.bat https://frontend.ngrok.io https://backend.ngrok.io
echo 3. Update Telegram bot once with the frontend URL
echo.
echo That's it! No more URL changes ever!
echo.
pause
