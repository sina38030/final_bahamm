@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Change to project root (folder of this script)
cd /d "%~dp0"

echo --------------------------------------------------
echo Starting Backend (FastAPI on http://127.0.0.1:8001)
echo Starting Frontend (Next.js on http://localhost:3000)
echo These run in separate windows and will KEEP RUNNING
echo even if you close Cursor.
echo --------------------------------------------------

REM Optional: kill existing processes on ports 8001 and 3000
echo Cleaning up any existing processes on ports 8001 and 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1

REM Start Backend in a new terminal window (prefers venv python if present)
set BACKEND_DIR=%~dp0backend
set VENV_PY="%BACKEND_DIR%\.venv\Scripts\python.exe"
set HAVE_VENV=0
if exist %VENV_PY% set HAVE_VENV=1

if %HAVE_VENV%==1 (
  echo Launching backend with venv python...
  start "Backend Server" cmd /k "cd /d %BACKEND_DIR% && %VENV_PY% -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
) else (
  echo Launching backend with system Python...
  start "Backend Server" cmd /k "cd /d %BACKEND_DIR% && python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
)

REM Start Frontend in a new terminal window
set FRONTEND_DIR=%~dp0frontend
if not exist "%FRONTEND_DIR%\node_modules" (
  echo node_modules not found. Running npm install in frontend first...
  start "Frontend Install" cmd /k "cd /d %FRONTEND_DIR% && npm install"
  echo Waiting 10 seconds for install window to initialize...
  timeout /t 10 /nobreak >nul
)

echo Launching frontend dev server...
start "Frontend Server" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

echo --------------------------------------------------
echo Launched:
echo   Backend:  http://127.0.0.1:8001
echo   Frontend: http://localhost:3000  (will auto-pick next free port)
echo You can now close this window.
echo --------------------------------------------------

endlocal













