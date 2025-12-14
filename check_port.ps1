# Check what's using port 8001
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Checking port 8001..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "echo '=== Processes using port 8001:'; sudo lsof -i :8001; echo ''; echo '=== PM2 status:'; pm2 status; echo ''; echo '=== Killing all on port 8001:'; sudo kill -9 `$(sudo lsof -t -i :8001) 2>/dev/null || true; echo 'Killed.'; echo ''; echo '=== Check again:'; sudo lsof -i :8001 || echo 'Port 8001 is now free!'"

Write-Host "Done!" -ForegroundColor Green

