@echo off
echo ====================================
echo Starting FastAPI Backend with bahamm.db
echo ====================================
echo.

cd /d "C:\Users\User\OneDrive\Desktop\final_project\backend"

REM Set the database URL to use bahamm.db
set "DATABASE_URL=sqlite:///C:/Users/User/OneDrive/Desktop/final_project/bahamm1.db"
echo Using database: %DATABASE_URL%
echo.

REM Check if virtual environment exists
if exist ".venv\Scripts\python.exe" (
    echo Using virtual environment...
    call .\.venv\Scripts\activate
    .\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
) else (
    echo Virtual environment not found. Using system Python...
    python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
)

echo.
echo Backend stopped. Press any key to exit...
pause
