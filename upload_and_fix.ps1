# PowerShell script to upload fix script and run it on server

$SERVER = $env:BAHAMM_SERVER
if (-not $SERVER) { $SERVER = "ubuntu@<YOUR_SERVER_IP>" }
$SSH_KEY = $env:BAHAMM_SSH_KEY
if (-not $SSH_KEY) { $SSH_KEY = "<PATH_TO_YOUR_PRIVATE_KEY>" }
$SCRIPT = "server_emergency_fix.sh"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Uploading Fix Script to Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Upload the script
Write-Host "Uploading $SCRIPT..." -ForegroundColor Yellow
scp -i "$SSH_KEY" "$SCRIPT" "${SERVER}:/tmp/$SCRIPT"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Upload successful" -ForegroundColor Green
} else {
    Write-Host "✗ Upload failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Making script executable..." -ForegroundColor Yellow
ssh -i "$SSH_KEY" $SERVER "chmod +x /tmp/$SCRIPT"

Write-Host ""
Write-Host "Running fix script on server..." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

ssh -i "$SSH_KEY" $SERVER "sudo /tmp/$SCRIPT"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Testing Website" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 5

Write-Host "Testing https://bahamm.ir..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://bahamm.ir" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Website is responding! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Website not responding yet: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Wait 30 seconds and try again, or check Cloudflare settings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done! Check https://bahamm.ir in your browser" -ForegroundColor Cyan
