# Check if the product fix is on server
$serverUser = "ubuntu"
$serverHost = "188.121.103.118"

Write-Host "Checking if product fix is deployed..." -ForegroundColor Cyan

ssh "${serverUser}@${serverHost}" "cd /home/ubuntu/bahamm-git && echo 'Git log:' && git log --oneline -3 && echo '' && echo 'Checking admin_routes.py for the fix:' && grep -A 5 'admin_user = db.query(User).filter(User.user_type == UserType.MERCHANT).first()' backend/app/routes/admin_routes.py | head -10"

Write-Host "Done!" -ForegroundColor Green

