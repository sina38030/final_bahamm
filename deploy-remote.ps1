# Remote Deployment Script for Bahamm Platform (Windows)
# This script deploys from your Windows machine to the remote server

$SSH_KEY = "C:\Users\User\.ssh\id_rsa"
$SSH_USER = "ubuntu"
$SSH_HOST = "185.231.181.208"
$APP_PATH = "/srv/app"

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║     Bahamm Platform - Remote Deployment                  ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Step 1: Commit and push local changes
Write-Host "📝 Checking for local changes..." -ForegroundColor Blue

$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    
    $response = Read-Host "`nDo you want to commit and push these changes? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        $commitMsg = Read-Host "Enter commit message"
        if (-not $commitMsg) {
            $commitMsg = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
        
        Write-Host "➕ Adding files..." -ForegroundColor Blue
        git add .
        
        Write-Host "💾 Committing changes..." -ForegroundColor Blue
        git commit -m $commitMsg
        
        Write-Host "⬆️  Pushing to GitHub..." -ForegroundColor Blue
        git push origin main
        
        Write-Host "✅ Changes pushed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Deploying without local changes..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No local changes to commit" -ForegroundColor Green
}

# Step 2: Deploy to server
Write-Host "`n🚀 Deploying to server..." -ForegroundColor Blue
Write-Host "Server: $SSH_HOST" -ForegroundColor Gray

$deployCmd = @"
cd $APP_PATH && 
git pull origin main && 
chmod +x deploy.sh && 
./deploy.sh
"@

try {
    ssh -i $SSH_KEY "$SSH_USER@$SSH_HOST" $deployCmd
    
    Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║           ✅ Remote Deployment Completed!                ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

    Write-Host "🌐 Your application is now live!" -ForegroundColor Green
    Write-Host "Frontend: https://bahamm.ir" -ForegroundColor Cyan
    Write-Host "Backend: https://app.bahamm.ir" -ForegroundColor Cyan
    
} catch {
    Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║              ❌ Deployment Failed!                       ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Red

    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Check if you can SSH to the server: ssh -i $SSH_KEY $SSH_USER@$SSH_HOST" -ForegroundColor Gray
    Write-Host "2. Check server logs: ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'cd $APP_PATH && docker-compose -f docker-compose.prod.yml logs'" -ForegroundColor Gray
    Write-Host "3. Check service status: ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'cd $APP_PATH && docker-compose -f docker-compose.prod.yml ps'" -ForegroundColor Gray
    
    exit 1
}

