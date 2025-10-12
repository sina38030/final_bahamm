@echo off
REM ====================================
REM Bahamm Backend - Standalone Launcher
REM Run FastAPI on localhost:8001 with bahamm1.db
REM ====================================

echo.
echo ====================================
echo   Bahamm Backend - Standalone Mode
echo ====================================
echo.
echo 🚀 Starting FastAPI backend server...
echo 🌐 Server will run on: http://localhost:8001
echo 🗄️  Using database: bahamm1.db
echo 📖 API Documentation: http://localhost:8001/docs
echo.
echo ⚠️  Make sure you have installed Python dependencies!
echo    If not installed, run: pip install -r requirements.txt
echo.
echo Press Ctrl+C to stop the server
echo ====================================
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Run the standalone Python script
python run_backend_standalone.py

echo.
echo ====================================
echo Server stopped. Press any key to exit...
echo ====================================
pause
