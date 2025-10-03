@echo off
title FastAPI Backend Server
color 0A
echo.
echo ========================================
echo    FastAPI Backend Server Launcher    
echo ========================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"

echo Project directory: %PROJECT_DIR%
echo Backend directory: %BACKEND_DIR%
echo.

REM Check if backend directory exists
if not exist "%BACKEND_DIR%" (
    echo ❌ ERROR: Backend directory not found!
    echo Looking for: %BACKEND_DIR%
    pause
    exit /b 1
)

REM Change to backend directory
cd /d "%BACKEND_DIR%"
echo ✅ Changed to: %CD%
echo.

REM Check if main.py exists
if not exist "main.py" (
    echo ❌ ERROR: main.py not found in backend directory!
    echo Contents of current directory:
    dir
    pause
    exit /b 1
)

echo ✅ main.py found! Starting server...
echo.

REM Try multiple ports
set PORT=8001
:TRY_PORT
echo 🔄 Trying port %PORT%...
python -m uvicorn main:app --host 127.0.0.1 --port %PORT% --reload
if %ERRORLEVEL% neq 0 (
    set /a PORT+=1
    if %PORT% leq 8005 (
        echo Port %PORT% failed, trying next port...
        goto TRY_PORT
    ) else (
        echo ❌ All ports failed!
        pause
        exit /b 1
    )
)

echo.
echo 🛑 Server stopped.
pause
