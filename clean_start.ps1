# Clean start of backend
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Clean starting backend..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "pm2 delete backend 2>/dev/null || true; cd /home/ubuntu/bahamm-git/backend && pm2 start venv/bin/python3 --name backend --watch -- -m uvicorn main:app --host 0.0.0.0 --port 8001 && pm2 save && echo '' && echo 'Backend started with watch mode! Checking status...' && pm2 status && echo '' && echo 'Logs:' && pm2 logs backend --lines 20 --nostream"

Write-Host "Done!" -ForegroundColor Green

