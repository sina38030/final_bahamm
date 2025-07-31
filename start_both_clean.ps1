Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\User\OneDrive\Desktop\final project\backend'; poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8001"

Write-Host "Waiting 5 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\User\OneDrive\Desktop\final project\frontend'; npm run dev"

Write-Host "Both servers are starting up..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin panel will be available at: http://localhost:3000/admin-full" -ForegroundColor Cyan 