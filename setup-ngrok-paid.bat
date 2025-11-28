@echo off
REM Setup ngrok Paid Plan with Reserved Domains
REM This will help you migrate from free to paid ngrok

echo ============================================
echo ngrok Paid Plan Setup Guide
echo ============================================
echo.
echo This script will help you set up persistent ngrok domains.
echo.
echo REQUIRED: ngrok paid plan ($5/month)
echo.
echo Steps to complete setup:
echo.
echo 1. Go to: https://dashboard.ngrok.com/reserved-domains
echo 2. Reserve two domains:
echo    - frontend.ngrok.io (for port 3000)
echo    - backend.ngrok.io (for port 8001)
echo.
echo 3. Wait for domain verification (usually instant)
echo.
echo 4. Run this command to start tunnels:
echo    start-ngrok-paid.bat
echo.
echo 5. Configure your app:
echo    configure-app.bat https://frontend.ngrok.io https://backend.ngrok.io
echo.
echo 6. Update Telegram bot once (these URLs never change!)
echo.
echo ============================================
echo Your persistent URLs will be:
echo ============================================
echo.
echo Frontend: https://frontend.ngrok.io
echo Backend:  https://backend.ngrok.io
echo.
echo These URLs will NEVER change again!
echo.
echo Press any key to open ngrok dashboard...
pause

start https://dashboard.ngrok.com/reserved-domains

echo.
echo Dashboard opened! Reserve your domains and run start-ngrok-paid.bat
echo.
pause






