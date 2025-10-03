@echo off
echo Starting servers...

echo Starting backend server...
start cmd /k "cd /d %~dp0 && python quick_server.py"

echo Starting frontend server...
start cmd /k "cd /d %~dp0/frontend && npx next dev --port 3000"

echo Servers started!
echo Backend: http://localhost:8002
echo Frontend: http://localhost:3000
pause 