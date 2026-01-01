# Restart backend to load new code
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Restarting backend to load fix..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "pm2 restart backend && echo '' && echo 'Backend restarted! Waiting 3 seconds...' && sleep 3 && pm2 logs backend --lines 15 --nostream"

Write-Host ""
Write-Host "Backend restarted with the fix! Now test adding a product on bahamm.ir" -ForegroundColor Green
























