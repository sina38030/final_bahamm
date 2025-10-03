@echo off
echo ========================================
echo 🚀 Starting Next.js Frontend Server (Persistent)
echo ========================================
echo 📁 Frontend Directory: %CD%\frontend
echo 🌐 URL: http://localhost:3000
echo 📊 Admin Panel: http://localhost:3000/admin-full
echo ========================================
echo ✅ Server will run independently of Cursor
echo ✅ Close Cursor anytime - server stays running
echo ✅ Press Ctrl+C to stop the server
echo ========================================

REM Kill any existing processes on port 3000
echo Cleaning up existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Starting Next.js Frontend Server...

REM Change to the frontend directory
cd /d "%~dp0\frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Start the Next.js development server
npm run dev

echo.
echo Frontend server stopped.
pause
