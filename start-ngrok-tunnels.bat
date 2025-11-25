@echo off
REM Start ngrok tunnels for ports 3000 (frontend) and 8001 (backend)
REM This opens two separate windows for each tunnel

echo ============================================
echo Starting ngrok Tunnels
echo ============================================
echo.
echo Frontend tunnel (port 3000) will open in a new window
echo Backend tunnel (port 8001) will open in a new window
echo.
echo Please wait...
echo.

REM Start frontend tunnel (port 3000) in a new window
start "ngrok - Frontend (Port 3000)" cmd /k "cd /d %USERPROFILE%\ngrok && ngrok.exe http 3000"

REM Wait a moment before opening the second window
timeout /t 2 /nobreak >nul

REM Start backend tunnel (port 8001) in a new window
start "ngrok - Backend (Port 8001)" cmd /k "cd /d %USERPROFILE%\ngrok && ngrok.exe http 8001"

echo.
echo ============================================
echo ngrok tunnels started!
echo ============================================
echo.
echo Two windows have opened:
echo   - Frontend tunnel: http://localhost:3000
echo   - Backend tunnel: http://localhost:8001
echo.
echo Look for the "Forwarding" lines in each window:
echo   Forwarding: https://xxxxx.ngrok-free.app -> http://localhost:3000
echo   Forwarding: https://yyyyy.ngrok-free.app -> http://localhost:8001
echo.
echo Copy both HTTPS URLs and update your configuration files.
echo.
pause





