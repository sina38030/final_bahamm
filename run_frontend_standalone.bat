@echo off
echo ====================================
echo Starting Next.js Frontend on localhost:3000
echo ====================================
echo.

cd /d "%~dp0frontend"

REM Ensure port 3000 is free
echo Checking and freeing port 3000 if needed...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1

REM Force Next.js to use port 3000
set "PORT=3000"
set "NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api"
set "NEXT_PUBLIC_ADMIN_API_URL=http://127.0.0.1:8001/api"
echo Using PORT=%PORT%
echo NEXT_PUBLIC_API_URL=%NEXT_PUBLIC_API_URL%
echo NEXT_PUBLIC_ADMIN_API_URL=%NEXT_PUBLIC_ADMIN_API_URL%

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting frontend development server...
echo Frontend will be available at: http://localhost:3000
echo Backend should be running at: http://127.0.0.1:8001
echo.

call npm run dev -- -p 3000

echo.
echo Frontend stopped. Press any key to exit...
pause

