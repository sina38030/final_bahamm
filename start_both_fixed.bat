@echo off
echo Starting Backend and Frontend servers...
echo.

REM Kill any existing processes on ports 3000 and 8001
echo Killing any existing processes on ports 3000 and 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting Backend server on port 8001...
start "Backend" cmd /c "cd backend && poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8001"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend server on port 3000...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8001
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:3000/admin-full
echo.
echo Press any key to exit...
pause >nul 