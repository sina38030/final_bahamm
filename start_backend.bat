@echo off
echo Starting Backend Server...
cd /d "C:\Users\User\OneDrive\Desktop\final_project\backend"

REM Kill any existing backend processes
echo Stopping existing backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001"') do taskkill /F /PID %%a >nul 2>&1

REM Set database URL to the project root bahamm1.db
set "DATABASE_URL=sqlite:///C:/Users/User/OneDrive/Desktop/final_project/bahamm1.db"
echo Using DATABASE_URL=%DATABASE_URL%

REM Start backend server
echo Starting FastAPI backend on port 8001...
call .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause