# Deploy and Restart Script
# This script pulls latest code and restarts backend on bahamm.ir

$serverUser = "ubuntu"
$serverHost = "188.121.103.118"
$serverPath = "/home/ubuntu/bahamm-git"

Write-Host "Deploying to bahamm.ir..." -ForegroundColor Cyan

# SSH command to pull code and restart
$sshCommand = @"
cd $serverPath && \
git pull origin main && \
pm2 restart backend && \
echo 'Deployment complete!' && \
pm2 logs backend --lines 20
"@

Write-Host "Connecting to server..." -ForegroundColor Yellow

# Execute SSH command
ssh "${serverUser}@${serverHost}" $sshCommand

Write-Host ""
Write-Host "Done! Check logs above." -ForegroundColor Green
