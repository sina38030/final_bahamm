# Ultra Quick Deploy - فقط Restart بدون Build
# استفاده: .\deploy_ultra_quick.ps1 "commit message"

param(
    [string]$Message = "quick fix",
    [switch]$SkipGit,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

Write-Host ""
Write-Host "⚡ ULTRA QUICK DEPLOY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

# Git Push (if not skipped)
if (-not $SkipGit) {
    Write-Host "📝 Git Push..." -ForegroundColor Yellow
    git add -A
    git commit -m $Message
    git push origin main
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Git push failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
}

# Deploy to Server
Write-Host ""
Write-Host "🚀 Deploying to Server..." -ForegroundColor Yellow

$deployCommands = "cd ~/bahamm-git && git pull origin main"

if (-not $FrontendOnly) {
    $deployCommands += " && pm2 restart backend"
}

if (-not $BackendOnly) {
    $deployCommands += " && pm2 restart frontend"
}

$deployCommands += " && pm2 status"

ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" $deployCommands

if ($LASTEXITCODE -eq 0) {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "✅ Deploy Complete!" -ForegroundColor Green
    Write-Host "⏱️  Time: $([math]::Round($duration, 1)) seconds" -ForegroundColor Cyan
    Write-Host "🌐 Site: https://bahamm.ir" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ Deploy failed!" -ForegroundColor Red
    exit 1
}

