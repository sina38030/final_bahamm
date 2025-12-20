# Restart backend properly
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Restarting backend..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "cd /home/ubuntu/bahamm-git/backend && pm2 start venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001 && pm2 save && echo '' && echo 'Backend started! Checking logs...' && sleep 2 && pm2 logs backend --lines 25 --nostream"

Write-Host "Done!" -ForegroundColor Green








