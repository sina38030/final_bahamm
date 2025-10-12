@echo off
echo Starting Both Servers...
echo.

REM Kill any existing processes on ports 3000 and 8002
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8002"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Starting Backend Server on port 8002...
start "Backend Server" cmd /c "python quick_server.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server on port 3000...
cd frontend
start "Frontend Server" cmd /c "npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8002
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:3000/admin-full
echo.
echo Press any key to exit...
pause 