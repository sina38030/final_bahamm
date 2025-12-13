# Quick Deploy Script for Performance Optimizations
# Run this from your local Windows machine

Write-Host "🚀 Deploying Performance Optimizations to Production" -ForegroundColor Green
Write-Host ""

$SERVER = $env:BAHAMM_SERVER
if (-not $SERVER) { $SERVER = "ubuntu@<YOUR_SERVER_IP>" }
$KEY = $env:BAHAMM_SSH_KEY
if (-not $KEY) { $KEY = "<PATH_TO_YOUR_PRIVATE_KEY>" }
$APP_DIR = "/srv/app"

Write-Host "📡 Connecting to server: $SERVER" -ForegroundColor Cyan

# Deploy command
$deployCommand = @"
cd $APP_DIR && \
echo '📦 Pulling latest changes...' && \
git pull origin main && \
echo '🔨 Rebuilding containers with optimizations...' && \
docker-compose -f docker-compose.prod.yml build --no-cache && \
echo '🔄 Restarting services (zero-downtime)...' && \
docker-compose -f docker-compose.prod.yml up -d --remove-orphans && \
echo '⏳ Waiting for services to stabilize...' && \
sleep 10 && \
echo '✅ Checking service status...' && \
docker-compose -f docker-compose.prod.yml ps && \
echo '' && \
echo '🎯 Checking backend workers...' && \
docker-compose -f docker-compose.prod.yml exec -T backend ps aux | grep gunicorn | grep -v grep || echo 'Backend starting...' && \
echo '' && \
echo '✅ Deployment complete!' && \
echo '' && \
echo '📊 Monitor performance:' && \
echo '  - Nginx cache: docker-compose -f docker-compose.prod.yml logs -f nginx | grep Cache' && \
echo '  - Backend workers: docker-compose -f docker-compose.prod.yml exec backend ps aux | grep gunicorn' && \
echo '  - Resource usage: docker stats'
"@

Write-Host ""
Write-Host "Executing deployment..." -ForegroundColor Yellow
Write-Host ""

# Execute SSH command
ssh -i $KEY $SERVER $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Test your site:" -ForegroundColor Cyan
    Write-Host "  Frontend: https://bahamm.ir"
    Write-Host "  Backend Health: https://bahamm.ir/api/health"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
}

