@echo off
echo Starting Backend Server...
cd /d "C:\Projects\final_bahamm\backend"

REM Kill any existing backend processes
echo Stopping existing backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do taskkill /F /PID %%a >nul 2>&1

REM Set database URL to the project root bahamm1.db
set "DATABASE_URL=sqlite:///C:/Projects/final_bahamm/bahamm1.db"
echo Using DATABASE_URL=%DATABASE_URL%

REM Start backend server
echo Starting FastAPI backend on port 8000...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause