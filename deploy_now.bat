@echo off
echo.
echo ================================
echo   Quick Deploy to Production
echo ================================
echo.

powershell -ExecutionPolicy Bypass -File deploy_quick.ps1 "quick fix"

pause

