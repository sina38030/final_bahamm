# Deploy to Production Script
# این script کد را روی سرور production deploy می‌کند

$SERVER_USER = "root"
$SERVER_HOST = "bahamm.ir"
$PROJECT_PATH = "/root/final_bahamm"

Write-Host "🚀 شروع Deploy به Production..." -ForegroundColor Green

# 1. Push کردن تغییرات اخیر
Write-Host "`n📤 Push کردن تغییرات به GitHub..." -ForegroundColor Cyan
git push origin main

# 2. اتصال به سرور و pull کردن
Write-Host "`n🔄 Pull کردن تغییرات روی سرور..." -ForegroundColor Cyan
ssh ${SERVER_USER}@${SERVER_HOST} @"
cd ${PROJECT_PATH}
echo '📥 Pulling latest changes...'
git pull origin main

echo '🔄 Restarting Backend...'
sudo systemctl restart bahamm-backend

echo '✅ Backend restarted!'

# Check status
sudo systemctl status bahamm-backend --no-pager
"@

Write-Host "`n✅ Deploy کامل شد!" -ForegroundColor Green
Write-Host "🌐 سایت: https://bahamm.ir" -ForegroundColor Yellow
Write-Host "🔍 برای تست: یک کاربر invited پرداخت کند و باید به /successpayment برود" -ForegroundColor Yellow

