@echo off
echo ========================================
echo 🚀 Starting Both Servers (Persistent Mode)
echo ========================================
echo 📁 Project Directory: %CD%
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://127.0.0.1:8001
echo 📊 Admin Panel: http://localhost:3000/admin-full
echo ========================================
echo ✅ Servers will run independently of Cursor
echo ✅ Close Cursor anytime - servers stay running
echo ✅ Close this window to stop both servers
echo ========================================

REM Kill any existing processes on both ports
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo Killing frontend process %%a
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001"') do (
    echo Killing backend process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Starting Backend Server on port 8001...
start "Backend Server (Port 8001)" cmd /c "cd /d %~dp0\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Server on port 3000...
cd /d "%~dp0\frontend"

REM Check if node_modules exists in frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

start "Frontend Server (Port 3000)" cmd /c "npm run dev"

echo.
echo ========================================
echo ✅ Both servers are starting...
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://127.0.0.1:8001
echo 📊 Admin Panel: http://localhost:3000/admin-full
echo ========================================
echo.
echo 🔥 SERVERS ARE NOW RUNNING INDEPENDENTLY!
echo 💡 You can close Cursor and servers will keep running
echo 💡 Close the server windows to stop them
echo.
echo Press any key to exit this launcher...
pause >nul
