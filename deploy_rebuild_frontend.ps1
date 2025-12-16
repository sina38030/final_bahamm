# Deploy Frontend با Rebuild کامل
# برای وقتی که .env یا کد Frontend تغییر کرده

param(
    [string]$Message = "rebuild frontend"
)

Write-Host ""
Write-Host "🔨 REBUILD FRONTEND DEPLOY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  این عملیات 3-5 دقیقه طول می‌کشد" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date

# Step 1: Git Push
Write-Host "📝 Step 1/4: Git Push..." -ForegroundColor Yellow
git add -A
git commit -m $Message
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git push failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Pull on Server
Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "📥 Step 2/4: Pulling on Server..." -ForegroundColor Yellow

ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git pull origin main"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git pull failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Build Frontend
Write-Host "✅ Pulled from GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "🔨 Step 3/4: Building Frontend (این مرحله 3-5 دقیقه طول می‌کشد)..." -ForegroundColor Yellow

ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git/frontend && rm -rf .next && npm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Restart Services
Write-Host "Build Completed" -ForegroundColor Green
Write-Host ""
Write-Host "Restarting Services..." -ForegroundColor Yellow

ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend"

if ($LASTEXITCODE -eq 0) {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    $minutes = [math]::Floor($duration / 60)
    $seconds = [math]::Round($duration % 60)
    
    Write-Host ""
    Write-Host "Deploy Complete!" -ForegroundColor Green
    Write-Host "Total Time: $minutes min $seconds sec" -ForegroundColor Cyan
    Write-Host "Site: https://bahamm.ir" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}

