@echo off
echo ========================================
echo 🚀 Starting FastAPI Backend Server (Persistent)
echo ========================================
echo 📁 Backend Directory: %CD%\backend
echo 🗄️  Database: bahamm.db.bak
echo 🌐 URL: http://127.0.0.1:8001
echo 📱 SMS: Melipayamak API Enabled
echo ========================================
echo ✅ Server will run independently of Cursor
echo ✅ Close Cursor anytime - server stays running
echo ✅ Press Ctrl+C to stop the server
echo ========================================

REM Kill any existing processes on port 8001
echo Cleaning up existing processes on port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001"') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Starting FastAPI Backend Server...

REM Change to the backend directory
cd /d "%~dp0\backend"

REM Start the FastAPI server using uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

echo.
echo Backend server stopped.
pause
