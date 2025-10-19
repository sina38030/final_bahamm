# Simple Deploy Script for Production
$SERVER = "ubuntu@185.231.181.208"
$SSH_KEY = "C:\Users\User\.ssh\id_rsa"

Write-Host "Deploying to Production Server..." -ForegroundColor Green
Write-Host ""

# Step 1: Git Pull
Write-Host "Step 1/5: Pulling latest code..." -ForegroundColor Cyan
ssh -i $SSH_KEY $SERVER 'cd /srv/app && git pull origin main'
Write-Host "Code pulled successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Clean build
Write-Host "Step 2/5: Cleaning old build..." -ForegroundColor Cyan
ssh -i $SSH_KEY $SERVER 'cd /srv/app/frontend && rm -rf .next && rm -rf node_modules/.cache'
Write-Host "Build cleaned" -ForegroundColor Green
Write-Host ""

# Step 3: Build
Write-Host "Step 3/5: Building frontend (2-5 minutes)..." -ForegroundColor Cyan
ssh -i $SSH_KEY $SERVER 'cd /srv/app/frontend && npm run build'
Write-Host "Build completed" -ForegroundColor Green
Write-Host ""

# Step 4: Restart service
Write-Host "Step 4/5: Restarting frontend service..." -ForegroundColor Cyan
ssh -i $SSH_KEY $SERVER 'pm2 restart frontend 2>/dev/null || pm2 restart all'
Write-Host "Service restarted" -ForegroundColor Green
Write-Host ""

# Step 5: Check status
Write-Host "Step 5/5: Checking service status..." -ForegroundColor Cyan
ssh -i $SSH_KEY $SERVER 'pm2 status'
Write-Host ""

Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host ""

