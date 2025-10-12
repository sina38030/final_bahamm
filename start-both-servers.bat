@echo off
echo Starting both Frontend and Backend servers...
echo.
echo Frontend will run on: http://localhost:3000
echo Backend will run on: http://localhost:8001
echo.
echo Close this window to stop both servers
echo.

start "Frontend Server" cmd /k "cd /d "C:\Users\User\OneDrive\Desktop\final project\frontend" && npm run dev"
start "Backend Server" cmd /k "cd /d "C:\Users\User\OneDrive\Desktop\final project\backend" && python app.py"

echo Both servers are starting in separate windows...
echo You can close this window now.
pause
