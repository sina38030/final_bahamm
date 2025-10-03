@echo off
echo ========================================
echo FORCE RESTART WITH REAL DATA
echo ========================================

echo Killing ALL Python and Node processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul

echo Clearing environment variables...
set DATABASE_URL=

echo Starting Backend with REAL DATA...
cd /d "C:\Users\User\OneDrive\Desktop\final_project\backend"
set "DATABASE_URL=sqlite:///C:/Users/User/OneDrive/Desktop/final_project/bahamm1.db"
echo.
echo ===========================================
echo USING REAL DATABASE: %DATABASE_URL%
echo This should contain your real products:
echo   - هدفون بلوتوث بی‌سیم
echo   - ردیاب هوشمند تناسب اندام  
echo   - تی‌شرت مردانه راحتی
echo ===========================================
echo.
call .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause

