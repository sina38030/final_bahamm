@echo off
echo Starting Frontend Server...
cd /d "%~dp0frontend"

REM Kill any existing frontend processes
echo Stopping existing frontend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1

REM Clear Next.js cache
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next

echo Setting environment variables...
set "PORT=3000"
set "NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api"
set "NEXT_PUBLIC_ADMIN_API_URL=http://127.0.0.1:8001/api"
echo Environment variables set:
echo   PORT=%PORT%
echo   NEXT_PUBLIC_API_URL=%NEXT_PUBLIC_API_URL%
echo   NEXT_PUBLIC_ADMIN_API_URL=%NEXT_PUBLIC_ADMIN_API_URL%
echo.
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting Next.js development server...
call npm run dev
pause