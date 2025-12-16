# Quick Deploy Script for Production
# Usage: .\deploy_quick.ps1 "commit message"

param(
    [string]$Message = "quick deploy"
)

Write-Host "🚀 Quick Deploy Starting..." -ForegroundColor Cyan

# Step 1: Commit and push
Write-Host "📝 Committing changes..." -ForegroundColor Yellow
git add -A
git commit -m $Message
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git push failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Deploy to server
Write-Host "📦 Deploying to production..." -ForegroundColor Yellow
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" @"
cd ~/bahamm-git && \
git pull origin main && \
pm2 restart backend && \
echo '✅ Backend restarted' && \
pm2 status
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Site: https://bahamm.ir" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deploy failed!" -ForegroundColor Red
    exit 1
}

