@echo off
echo Fixing Frontend Build Issues...
echo.

REM Kill any existing processes on port 3000
echo Cleaning up existing frontend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Navigating to frontend directory...
cd frontend

echo.
echo Removing corrupted build cache...
if exist .next rmdir /s /q .next

echo.
echo Building frontend with clean cache...
npm run build

echo.
echo Starting frontend development server...
npm run dev 