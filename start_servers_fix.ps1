Write-Host "Killing existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.Name -match "uvicorn|node" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Starting backend server..." -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend starting...'; poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8001" -PassThru

Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "Starting frontend server..." -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend starting...'; npm run dev" -PassThru

Write-Host "Waiting for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Checking server status..." -ForegroundColor Cyan
$ports = netstat -an | Select-String ":3000|:8001"
if ($ports) {
    Write-Host "Servers are running!" -ForegroundColor Green
    Write-Host "Backend: http://localhost:8001" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Admin Panel: http://localhost:3000/admin-full" -ForegroundColor Cyan
} else {
    Write-Host "Servers may not be running. Check the individual windows." -ForegroundColor Red
}

Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host 