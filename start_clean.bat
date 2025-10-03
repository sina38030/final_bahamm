@echo off
echo ========================================
echo   Starting Clean Server Environment
echo ========================================

echo.
echo 1. Killing any existing processes on ports 3000 and 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do taskkill /f /pid %%a >nul 2>&1

echo.
echo 2. Starting Backend Server (Port 8001)...
start "Backend Server" cmd /c "cd /d %~dp0\backend && poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8001"

echo.
echo 3. Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo.
echo 4. Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /c "cd /d %~dp0\frontend && npm run dev"

echo.
echo 5. Waiting for frontend to initialize...
timeout /t 8 /nobreak >nul

echo.
echo ========================================
echo   Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:3000
echo Admin:    http://localhost:3000/admin-full
echo.
echo Press any key to check server status...
pause >nul

echo.
echo Checking server status...
netstat -ano | findstr ":3000\|:8001"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo If you see ports 3000 and 8001 in the list above, both servers are running.
echo You can now access:
echo - Main Site: http://localhost:3000
echo - Admin Panel: http://localhost:3000/admin-full
echo.
pause 