@echo off
echo 🚀 Starting Bahamm Project Servers...
echo.

echo 📡 Starting Backend Server on port 8002...
start cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload"

timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend Server on port 3001...
start cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Servers are starting...
echo 📡 Backend: http://127.0.0.1:8002
echo 🌐 Frontend: http://127.0.0.1:3001
echo.
echo Press any key to close this window...
pause > nul
