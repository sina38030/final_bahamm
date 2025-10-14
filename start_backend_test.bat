@echo off
cd /d "%~dp0backend"

REM Kill any existing backend processes on port 8001
echo Stopping existing backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001"') do taskkill /F /PID %%a >nul 2>&1

REM Set database URL
set "DATABASE_URL=sqlite:///%CD%\..\bahamm1.db"
echo Using DATABASE: %CD%\..\bahamm1.db

REM Start backend server
echo Starting FastAPI backend on port 8001...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
pause

