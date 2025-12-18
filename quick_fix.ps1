# Quick fix for port conflict
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Fixing server..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "pm2 stop all; pm2 delete all; sudo kill -9 `$(sudo lsof -t -i :8001); cd /home/ubuntu/bahamm-git && git pull origin main; cd /home/ubuntu/bahamm-git/backend && pm2 start venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001; pm2 save; pm2 logs backend --lines 15 --nostream"

Write-Host "Done!" -ForegroundColor Green






