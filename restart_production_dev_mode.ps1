# Restart Production in Development Mode (with auto-reload)
# This allows backend changes to be applied instantly without manual restart

$SERVER_IP = "188.121.103.118"
$SERVER_USER = "ubuntu"
$SSH_KEY = "C:\Users\User\Downloads\bahamm-ssh-key-ubuntu.pem"

Write-Host "Restarting production in DEV mode..." -ForegroundColor Cyan

# Stop all services
ssh -i $SSH_KEY "${SERVER_USER}@${SERVER_IP}" "pm2 stop all && pm2 delete all"

Start-Sleep -Seconds 2

# Start backend with --reload flag for dev mode
ssh -i $SSH_KEY "${SERVER_USER}@${SERVER_IP}" "cd /srv/app/backend && pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

# Start frontend in dev mode
ssh -i $SSH_KEY "${SERVER_USER}@${SERVER_IP}" "cd /srv/app/frontend/frontend && PORT=3000 pm2 start npm --name frontend -- run dev"

# Save PM2 configuration
ssh -i $SSH_KEY "${SERVER_USER}@${SERVER_IP}" "pm2 save"

Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check status
Write-Host "Service Status:" -ForegroundColor Green
ssh -i $SSH_KEY "${SERVER_USER}@${SERVER_IP}" "pm2 status"

Write-Host "Production is now running in DEV mode with auto-reload!" -ForegroundColor Green
Write-Host "Backend: Auto-reloads on file changes" -ForegroundColor Yellow
Write-Host "Frontend: Already in dev mode" -ForegroundColor Yellow
