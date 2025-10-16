# Quick Deploy Frontend to Production
# این script مستقیماً روی سرور کار می‌کند

$SERVER_USER = "root"
$SERVER_HOST = "bahamm.ir"
$PROJECT_PATH = "/root/final_bahamm"

Write-Host "🚀 Deploy سریع Frontend به Production..." -ForegroundColor Green
Write-Host ""

# اتصال به سرور و اجرای دستورات
Write-Host "📡 اتصال به سرور..." -ForegroundColor Cyan

ssh ${SERVER_USER}@${SERVER_HOST} @"
echo '📥 Pulling latest changes from Git...'
cd ${PROJECT_PATH}
git pull origin main

echo ''
echo '🗑️  Cleaning old build...'
cd frontend
rm -rf .next
rm -rf node_modules/.cache

echo ''
echo '🔨 Building frontend...'
npm run build

echo ''
echo '🔄 Restarting frontend service...'
# تلاش برای restart با pm2
if command -v pm2 &> /dev/null; then
    pm2 restart frontend
    pm2 status
elif systemctl list-units --full -all | grep -q bahamm-frontend; then
    sudo systemctl restart bahamm-frontend
    sudo systemctl status bahamm-frontend --no-pager
else
    echo '⚠️  لطفاً دستی frontend را restart کنید'
fi

echo ''
echo '✅ Deploy کامل شد!'
echo '🌐 تست کنید: https://bahamm.ir'
"@

Write-Host ""
Write-Host "Deploy completed!" -ForegroundColor Green
Write-Host "Test: Invited user payment should redirect to /payment/success/invitee" -ForegroundColor Yellow

