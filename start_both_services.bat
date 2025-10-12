@echo off
echo ====================================
echo Starting Both Backend and Frontend
echo ====================================
echo.

echo This will open two separate terminal windows:
echo 1. Backend (FastAPI) on http://127.0.0.1:8001
echo 2. Frontend (Next.js) on http://localhost:3000
echo.
echo Press any key to continue...
pause

REM Start backend in a new window
start "Bahamm Backend" cmd /k "C:\Users\User\OneDrive\Desktop\final project\run_backend_standalone.bat"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
start "Bahamm Frontend" cmd /k "C:\Users\User\OneDrive\Desktop\final project\run_frontend_standalone.bat"

echo.
echo Both services are starting in separate windows.
echo Close this window when you're done.
echo.
pause

