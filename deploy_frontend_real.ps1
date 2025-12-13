# Deploy Frontend to Real Production Server
# اطلاعات واقعی سرور

$SERVER_USER = $env:BAHAMM_SSH_USER
if (-not $SERVER_USER) { $SERVER_USER = "ubuntu" }
$SERVER_HOST = $env:BAHAMM_SSH_HOST
if (-not $SERVER_HOST) { $SERVER_HOST = "<YOUR_SERVER_IP>" }
$SSH_KEY = $env:BAHAMM_SSH_KEY
if (-not $SSH_KEY) { $SSH_KEY = "<PATH_TO_YOUR_PRIVATE_KEY>" }
$FRONTEND_PATH = "/srv/app/frontend"
$APP_PATH = "/srv/app"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Deploy Frontend to Production" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: $SERVER_USER@$SERVER_HOST" -ForegroundColor Yellow
Write-Host "Path: $FRONTEND_PATH" -ForegroundColor Yellow
Write-Host ""

# اتصال به سرور و اجرای دستورات
Write-Host "Connecting to server..." -ForegroundColor Green
Write-Host ""

ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_HOST} @"
echo '========================================='
echo 'Step 1: Pull latest changes from Git'
echo '========================================='
cd $APP_PATH
git pull origin main

echo ''
echo '========================================='
echo 'Step 2: Clean old build'
echo '========================================='
cd $FRONTEND_PATH
rm -rf .next
rm -rf node_modules/.cache
echo 'Old build cleaned!'

echo ''
echo '========================================='
echo 'Step 3: Build new frontend'
echo '========================================='
npm run build

if [ \$? -eq 0 ]; then
    echo ''
    echo '✅ Build completed successfully!'
else
    echo ''
    echo '❌ Build failed!'
    exit 1
fi

echo ''
echo '========================================='
echo 'Step 4: Restart frontend service'
echo '========================================='

# Try PM2 first
if command -v pm2 &> /dev/null; then
    echo 'Using PM2...'
    pm2 restart frontend
    pm2 status
elif systemctl list-units --full -all | grep -q bahamm-frontend; then
    echo 'Using systemctl...'
    sudo systemctl restart bahamm-frontend
    sudo systemctl status bahamm-frontend --no-pager
elif systemctl list-units --full -all | grep -q frontend; then
    echo 'Using systemctl...'
    sudo systemctl restart frontend
    sudo systemctl status frontend --no-pager
else
    echo '⚠️  Could not find service manager. Please restart manually.'
fi

echo ''
echo '========================================='
echo '✅ Deploy Completed!'
echo '========================================='
echo ''
echo 'Test URL: https://bahamm.ir'
echo 'Invited users should redirect to: /payment/success/invitee'
echo ''
"@

Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "Deploy script finished!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Please test:" -ForegroundColor Yellow
Write-Host "1. Make a payment as invited user" -ForegroundColor White
Write-Host "2. Should redirect to: /payment/success/invitee" -ForegroundColor White
Write-Host "3. Should NOT redirect to: /success" -ForegroundColor White
Write-Host ""

