@echo off
setlocal
cd /d "%~dp0"
set "DATABASE_URL=sqlite:///C:/Users/User/OneDrive/Desktop/final_project/bahamm1.db"
echo Using DATABASE_URL=%DATABASE_URL%
call .\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload

