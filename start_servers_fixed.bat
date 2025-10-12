@echo off
echo Starting Bahamm App Servers...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d "%~dp0" && python backend/main.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8001
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:3000/admin-full
echo.
echo Press any key to close this window...
pause >nul 