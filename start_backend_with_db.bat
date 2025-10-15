@echo off
cd /d "%~dp0backend"
set "DATABASE_URL=sqlite:///C:/Projects/final_bahamm/bahamm1.db"
echo Starting backend with DATABASE_URL=%DATABASE_URL%
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

