# PowerShell script to get ngrok tunnel URLs
# Run this after starting ngrok to easily copy the URLs

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "       ngrok Tunnel URLs" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    
    if ($response.tunnels.Count -eq 0) {
        Write-Host "No active tunnels found!" -ForegroundColor Red
        Write-Host "Make sure ngrok is running." -ForegroundColor Yellow
        exit 1
    }
    
    $frontendUrl = ""
    $backendUrl = ""
    
    foreach ($tunnel in $response.tunnels) {
        $port = $tunnel.config.addr
        $publicUrl = $tunnel.public_url
        
        if ($publicUrl -like "https://*") {
            if ($port -like "*:3000*") {
                $frontendUrl = $publicUrl
                Write-Host "✓ Frontend (Port 3000):" -ForegroundColor Green
                Write-Host "  $publicUrl" -ForegroundColor White
                Write-Host ""
            }
            elseif ($port -like "*:8080*") {
                $backendUrl = $publicUrl
                Write-Host "✓ Backend (Port 8080):" -ForegroundColor Green
                Write-Host "  $publicUrl" -ForegroundColor White
                Write-Host ""
            }
        }
    }
    
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "       Quick Copy Commands" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($frontendUrl -and $backendUrl) {
        Write-Host "For .env.local (frontend folder):" -ForegroundColor Yellow
        Write-Host "NEXT_PUBLIC_API_URL=$backendUrl/api" -ForegroundColor White
        Write-Host ""
        
        Write-Host "For main.py CORS (add to allow_origins):" -ForegroundColor Yellow
        Write-Host "`"$frontendUrl`",  # Frontend ngrok" -ForegroundColor White
        Write-Host "`"$backendUrl`",  # Backend ngrok" -ForegroundColor White
        Write-Host ""
        
        Write-Host "For Telegram BotFather:" -ForegroundColor Yellow
        Write-Host "$frontendUrl" -ForegroundColor White
        Write-Host ""
        
        # Copy frontend URL to clipboard
        Set-Clipboard -Value $frontendUrl
        Write-Host "✓ Frontend URL copied to clipboard!" -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host "⚠ Could not find both tunnels." -ForegroundColor Yellow
        Write-Host "Expected: Port 3000 (Frontend) and Port 8080 (Backend)" -ForegroundColor Yellow
    }
    
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "       Next Steps" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Update frontend\.env.local with backend URL" -ForegroundColor White
    Write-Host "2. Update backend\main.py CORS with both URLs" -ForegroundColor White
    Write-Host "3. Restart both dev servers" -ForegroundColor White
    Write-Host "4. Configure Telegram bot with frontend URL" -ForegroundColor White
    Write-Host ""
    Write-Host "ngrok Inspector: http://localhost:4040" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "✗ Could not connect to ngrok API" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "1. ngrok is running (run setup-ngrok.bat)" -ForegroundColor White
    Write-Host "2. You've added your auth token:" -ForegroundColor White
    Write-Host "   ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Get your free auth token at:" -ForegroundColor Yellow
    Write-Host "https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")









