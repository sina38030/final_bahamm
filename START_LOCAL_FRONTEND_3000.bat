@echo off
echo ========================================
echo   BAHAMM LOCAL FRONTEND HOTLOAD
echo   Running on: http://localhost:3000
echo   Backend: https://bahamm.ir/backend
echo ========================================
echo.

cd frontend
echo Starting Next.js with Turbopack on PORT 3000...
set PORT=3000
npm run dev -- --turbo --port 3000

pause




















