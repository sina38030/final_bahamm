Write-Host "Starting FastAPI Backend Server..." -ForegroundColor Green
Write-Host ""

# Get the directory where this script is located
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendPath = Join-Path $scriptPath "backend"

Write-Host "Script location: $scriptPath" -ForegroundColor Yellow
Write-Host "Backend path: $backendPath" -ForegroundColor Yellow

# Check if backend directory exists
if (Test-Path $backendPath) {
    Write-Host "Backend directory found!" -ForegroundColor Green
    Set-Location $backendPath
    Write-Host "Changed to backend directory: $(Get-Location)" -ForegroundColor Green
    Write-Host ""
    
    # Check if main.py exists
    if (Test-Path "main.py") {
        Write-Host "main.py found! Starting server..." -ForegroundColor Green
        Write-Host "Server will be available at: http://localhost:8001" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
        Write-Host ""
        
        # Start the server
        python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
    } else {
        Write-Host "ERROR: main.py not found in backend directory!" -ForegroundColor Red
        Write-Host "Contents of backend directory:" -ForegroundColor Yellow
        Get-ChildItem
    }
} else {
    Write-Host "ERROR: Backend directory not found!" -ForegroundColor Red
    Write-Host "Current directory contents:" -ForegroundColor Yellow
    Get-ChildItem
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



















