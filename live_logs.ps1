# Watch live logs
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Watching live logs... Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "Now try to add a product on bahamm.ir" -ForegroundColor Cyan
Write-Host ""

ssh "${serverUser}@${serverHost}" "pm2 logs backend --lines 100"

