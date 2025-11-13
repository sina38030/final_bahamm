@echo off
REM ngrok Setup Script for Telegram Mini App Testing
REM 
REM IMPORTANT: Before running this script, you need to:
REM 1. Sign up for free at https://ngrok.com/
REM 2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
REM 3. Run: ngrok config add-authtoken YOUR_AUTH_TOKEN
REM    (Replace YOUR_AUTH_TOKEN with your actual token from ngrok dashboard)

echo ============================================
echo Telegram Mini App - ngrok Setup
echo ============================================
echo.
echo Starting ngrok tunnels...
echo.
echo Frontend tunnel (port 3000) will open in a new window
echo Backend tunnel (port 8080) will open in a new window
echo.

REM Start both tunnels in a single window using the config file
start "ngrok - Telegram Mini App (Frontend + Backend)" "%USERPROFILE%\ngrok\ngrok.exe" start frontend backend

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo ngrok tunnels started!
echo ============================================
echo.
echo The ngrok window shows BOTH tunnels:
echo   - frontend (port 3000)
echo   - backend (port 8080)
echo.
echo Look for lines like:
echo   Forwarding: https://xxxxx.ngrok-free.app -> http://localhost:3000
echo   Forwarding: https://yyyyy.ngrok-free.app -> http://localhost:8080
echo.
echo.
echo ============================================
echo Getting URLs for you...
echo ============================================
timeout /t 2 /nobreak >nul

REM Run the get URLs script
call "%~dp0get-ngrok-urls.bat"

