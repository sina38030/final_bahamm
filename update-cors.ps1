# PowerShell script to help update CORS configuration
# This script will show you the exact changes needed for main.py

param(
    [string]$FrontendUrl = "",
    [string]$BackendUrl = ""
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    Backend CORS Configuration Helper" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# If URLs not provided, try to get from ngrok
if (-not $FrontendUrl -or -not $BackendUrl) {
    Write-Host "Getting URLs from ngrok..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        
        foreach ($tunnel in $response.tunnels) {
            $port = $tunnel.config.addr
            $publicUrl = $tunnel.public_url
            
            if ($publicUrl -like "https://*") {
                if ($port -like "*:3000*") {
                    $FrontendUrl = $publicUrl
                }
                elseif ($port -like "*:8080*") {
                    $BackendUrl = $publicUrl
                }
            }
        }
    }
    catch {
        Write-Host "✗ Could not auto-detect ngrok URLs" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please run with URLs:" -ForegroundColor Yellow
        Write-Host ".\update-cors.ps1 -FrontendUrl 'https://abc.ngrok-free.app' -BackendUrl 'https://xyz.ngrok-free.app'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Or start ngrok first with: setup-ngrok.bat" -ForegroundColor Yellow
        exit 1
    }
}

if (-not $FrontendUrl -or -not $BackendUrl) {
    Write-Host "✗ Could not find both ngrok URLs" -ForegroundColor Red
    Write-Host "Please start ngrok with: setup-ngrok.bat" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ URLs detected:" -ForegroundColor Green
Write-Host "  Frontend: $FrontendUrl" -ForegroundColor White
Write-Host "  Backend:  $BackendUrl" -ForegroundColor White
Write-Host ""

$mainPyPath = "backend\main.py"

if (-not (Test-Path $mainPyPath)) {
    Write-Host "✗ Could not find backend\main.py" -ForegroundColor Red
    Write-Host "Make sure you're running this from the project root" -ForegroundColor Yellow
    exit 1
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    What to Add" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$linesToAdd = @"
        # ngrok URLs for local Telegram Mini App testing
        "$FrontendUrl",
        "$BackendUrl",
"@

Write-Host "Add these lines to the allow_origins list in main.py:" -ForegroundColor Yellow
Write-Host ""
Write-Host $linesToAdd -ForegroundColor Green
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    Where to Add Them" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to add these lines in TWO places in main.py:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Around line 98 (api_app.add_middleware)" -ForegroundColor White
Write-Host "2. Around line 134 (app.add_middleware)" -ForegroundColor White
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    Example" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$example = @"
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://bahamm.ir",
        "http://bahamm.ir",
        "https://app.bahamm.ir",
        # ngrok URLs for local Telegram Mini App testing
        "$FrontendUrl",
        "$BackendUrl",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
"@

Write-Host $example -ForegroundColor Gray
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    Next Steps" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open: backend\main.py" -ForegroundColor White
Write-Host "2. Find BOTH allow_origins lists (lines ~98 and ~134)" -ForegroundColor White
Write-Host "3. Add the URLs shown above to BOTH lists" -ForegroundColor White
Write-Host "4. Save the file" -ForegroundColor White
Write-Host "5. Restart backend server:" -ForegroundColor White
Write-Host "   Ctrl+C in backend terminal" -ForegroundColor Gray
Write-Host "   uvicorn main:app --reload --port 8080" -ForegroundColor Gray
Write-Host ""

# Copy to clipboard for easy pasting
try {
    Set-Clipboard -Value $linesToAdd
    Write-Host "✓ Lines copied to clipboard! Just paste them into main.py" -ForegroundColor Green
    Write-Host ""
}
catch {
    # Clipboard might not be available in some environments
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")









