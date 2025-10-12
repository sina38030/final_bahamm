# Script for uploading frontend build to server
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Uploading Frontend Build to Server" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Server details
Write-Host "Please enter server details:" -ForegroundColor Yellow
Write-Host ""

$serverUser = Read-Host "Server username (e.g., ubuntu, root)"
$serverHost = Read-Host "Server hostname or IP (e.g., bahamm.ir)"
$serverPath = Read-Host "Project path on server (e.g., /home/ubuntu/final_bahamm)"

Write-Host ""
Write-Host "Target: ${serverUser}@${serverHost}:${serverPath}" -ForegroundColor Green
Write-Host ""

# Check if scp exists
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: scp not found!" -ForegroundColor Red
    Write-Host "Install OpenSSH Client from Windows Settings" -ForegroundColor Yellow
    exit 1
}

# Upload frontend files
Write-Host "Uploading frontend build files..." -ForegroundColor Yellow
Write-Host ""

$frontendPath = "frontend"

# Check if build exists
if (-not (Test-Path "$frontendPath\.next")) {
    Write-Host "ERROR: Frontend build not found at $frontendPath\.next" -ForegroundColor Red
    Write-Host "Please run 'npm run build' first" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Uploading .next directory..." -ForegroundColor Cyan
scp -r "$frontendPath\.next" "${serverUser}@${serverHost}:${serverPath}/frontend/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ .next uploaded" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upload .next" -ForegroundColor Red
    exit 1
}

Write-Host "2. Uploading package.json..." -ForegroundColor Cyan
scp "$frontendPath\package.json" "${serverUser}@${serverHost}:${serverPath}/frontend/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ package.json uploaded" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upload package.json" -ForegroundColor Red
}

Write-Host "3. Uploading next.config.mjs..." -ForegroundColor Cyan
scp "$frontendPath\next.config.mjs" "${serverUser}@${serverHost}:${serverPath}/frontend/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ next.config.mjs uploaded" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upload next.config.mjs" -ForegroundColor Red
}

Write-Host "4. Uploading public directory..." -ForegroundColor Cyan
scp -r "$frontendPath\public" "${serverUser}@${serverHost}:${serverPath}/frontend/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ public uploaded" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upload public" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Upload Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps on server:" -ForegroundColor Yellow
Write-Host "1. SSH to server: ssh ${serverUser}@${serverHost}" -ForegroundColor Cyan
Write-Host "2. Go to project: cd ${serverPath}" -ForegroundColor Cyan
Write-Host "3. Restart frontend:" -ForegroundColor Cyan
Write-Host "   pm2 restart frontend" -ForegroundColor White
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   systemctl restart bahamm-frontend" -ForegroundColor White
Write-Host ""
Write-Host "4. Check status:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor White
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   systemctl status bahamm-frontend" -ForegroundColor White
Write-Host ""
Write-Host "5. Test the fix:" -ForegroundColor Cyan
Write-Host "   Visit: https://bahamm.ir/admin-full" -ForegroundColor White
Write-Host ""

