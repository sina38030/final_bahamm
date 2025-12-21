# Fix Port Conflict and Deploy Script
# Kills any process on port 8001, then deploys fresh code

$serverUser = "ubuntu"
$serverHost = "188.121.103.118"
$serverPath = "/home/ubuntu/bahamm-git"

Write-Host "Fixing port conflict and deploying..." -ForegroundColor Cyan

# SSH command to fix everything
$sshCommand = @"
echo '=== Step 1: Stopping all PM2 processes ==='
pm2 stop all
pm2 delete all

echo ''
echo '=== Step 2: Killing anything on port 8001 ==='
sudo lsof -ti :8001 | xargs -r sudo kill -9

echo ''
echo '=== Step 3: Pulling latest code ==='
cd $serverPath
git pull origin main

echo ''
echo '=== Step 4: Starting backend with watch mode ==='
cd $serverPath/backend
pm2 start venv/bin/python3 --name backend --watch --ignore-watch='venv __pycache__ logs *.pyc *.log uploads .git' -- -m uvicorn main:app --host 0.0.0.0 --port 8001

echo ''
echo '=== Step 5: Starting frontend ==='
cd $serverPath/frontend
PORT=3000 pm2 start npm --name frontend -- start

echo ''
echo '=== Step 6: Saving PM2 config ==='
pm2 save

echo ''
echo '=== Step 7: Final status ==='
pm2 status

echo ''
echo 'Deployment complete! Watching logs for 10 seconds...'
sleep 3
pm2 logs backend --lines 20 --nostream
"@

Write-Host "Connecting to server..." -ForegroundColor Yellow

# Execute SSH command
ssh "${serverUser}@${serverHost}" $sshCommand

Write-Host ""
Write-Host "Done!" -ForegroundColor Green









