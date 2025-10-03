@echo off
echo ========================================
echo Starting FastAPI Backend Server
echo ========================================
echo Database: bahamm.db.bak
echo Port: 8001
echo Host: 127.0.0.1
echo ========================================

cd /d "%~dp0"
echo Current directory: %CD%

echo.
echo Starting server...
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

pause
