# Check recent backend logs
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Checking recent logs..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "echo '=== Last 30 lines of error log:'; pm2 logs backend --err --lines 30 --nostream; echo ''; echo '=== Last 20 lines of output log:'; pm2 logs backend --out --lines 20 --nostream"

Write-Host "Done!" -ForegroundColor Green





