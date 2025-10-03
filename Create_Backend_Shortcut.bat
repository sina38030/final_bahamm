@echo off
echo Creating desktop shortcut for FastAPI Backend...

set "backend_path=%~dp0backend"
set "desktop=%USERPROFILE%\Desktop"
set "shortcut=%desktop%\Start Backend Server.lnk"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%shortcut%'); $Shortcut.TargetPath = '%backend_path%\run_backend.bat'; $Shortcut.WorkingDirectory = '%backend_path%'; $Shortcut.Description = 'Start FastAPI Backend Server (Port 8001)'; $Shortcut.Save()"

echo ✅ Desktop shortcut created: "Start Backend Server"
echo 🚀 Double-click it to start the backend server
echo 📱 SMS authentication will work perfectly!

pause
