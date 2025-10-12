# PowerShell script to start both servers properly
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Starting Both Servers Clean" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Kill existing processes
Write-Host "1. Killing existing processes on ports 3000 and 8001..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 2

# Start backend server
Write-Host "2. Starting Backend Server (Port 8001)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\User\OneDrive\Desktop\final project\backend"
    poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8001
}

# Wait for backend to start
Write-Host "3. Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Start frontend server
Write-Host "4. Starting Frontend Server (Port 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\User\OneDrive\Desktop\final project\frontend"
    $env:PORT = "3000"
    npm run dev
}

# Wait for frontend to start
Write-Host "5. Waiting for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "========================================" -ForegroundColor Green
Write-Host "   Checking Server Status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if ports are in use
$backendPort = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($backendPort) {
    Write-Host "✓ Backend running on port 8001" -ForegroundColor Green
} else {
    Write-Host "✗ Backend not running on port 8001" -ForegroundColor Red
}

if ($frontendPort) {
    Write-Host "✓ Frontend running on port 3000" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend not running on port 3000" -ForegroundColor Red
}

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Main Site: http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Panel: http://localhost:3000/admin-full" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8001" -ForegroundColor White

Write-Host ""
Write-Host "Testing Admin Categories API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/api/admin/categories" -Method GET -TimeoutSec 5
    Write-Host "✓ Categories API working - Found $($response.Count) categories" -ForegroundColor Green
} catch {
    Write-Host "✗ Categories API error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Servers are running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green 