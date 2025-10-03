#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Both Servers (Persistent Mode)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📁 Project Directory: $PWD" -ForegroundColor Yellow
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "🔧 Backend API: http://127.0.0.1:8001" -ForegroundColor Yellow
Write-Host "📊 Admin Panel: http://localhost:3000/admin-full" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Servers will run independently of Cursor" -ForegroundColor Green
Write-Host "✅ Close Cursor anytime - servers stay running" -ForegroundColor Green
Write-Host "✅ Press Ctrl+C to stop both servers" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Kill any existing processes on both ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
try {
    $frontendProcesses = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($frontendProcesses) {
        $frontendProcesses | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Write-Host "Killed frontend processes on port 3000" -ForegroundColor Green
    }
    
    $backendProcesses = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($backendProcesses) {
        $backendProcesses | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Write-Host "Killed backend processes on port 8001" -ForegroundColor Green
    }
} catch {
    Write-Host "No existing processes to clean up" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Backend Server on port 8001..." -ForegroundColor Green

# Start backend in a new PowerShell window
$backendPath = Join-Path $PWD "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload" -WindowStyle Normal

Write-Host "Waiting 5 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Starting Frontend Server on port 3000..." -ForegroundColor Green

# Check if node_modules exists in frontend
$frontendPath = Join-Path $PWD "frontend"
$nodeModulesPath = Join-Path $frontendPath "node_modules"

if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    Set-Location $PWD
}

# Start frontend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "🔧 Backend: http://127.0.0.1:8001" -ForegroundColor Yellow
Write-Host "📊 Admin Panel: http://localhost:3000/admin-full" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔥 SERVERS ARE NOW RUNNING INDEPENDENTLY!" -ForegroundColor Red
Write-Host "💡 You can close Cursor and servers will keep running" -ForegroundColor Magenta
Write-Host "💡 Close the server windows to stop them" -ForegroundColor Magenta
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
