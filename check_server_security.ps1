# SERVER SECURITY & RESOURCE CHECK FOR WINDOWS/REMOTE
# Run this locally to check remote server

$SERVER = "ubuntu@188.121.103.118"
$SSH_KEY = "C:\Users\User\.ssh\id_rsa"

Write-Host "=========================================="
Write-Host "SERVER SECURITY & RESOURCE CHECK"
Write-Host "=========================================="
Write-Host ""

Write-Host "Connecting to server: $SERVER"
Write-Host ""

# Transfer and execute the security check script
Write-Host "1. Uploading security check script..."
scp -i $SSH_KEY check_server_security.sh ${SERVER}:/tmp/
Write-Host ""

Write-Host "2. Running comprehensive security scan..."
ssh -i $SSH_KEY $SERVER "chmod +x /tmp/check_server_security.sh && sudo /tmp/check_server_security.sh"
Write-Host ""

Write-Host "=========================================="
Write-Host "ADDITIONAL QUICK CHECKS"
Write-Host "=========================================="

Write-Host "`n3. Checking for specific malware signatures..."
ssh -i $SSH_KEY $SERVER "sudo grep -r 'eval(base64' /var/www /home 2>/dev/null | head -10"

Write-Host "`n4. Checking open ports from outside..."
Write-Host "Scanning common ports on 188.121.103.118..."
Test-NetConnection -ComputerName 188.121.103.118 -Port 22
Test-NetConnection -ComputerName 188.121.103.118 -Port 80
Test-NetConnection -ComputerName 188.121.103.118 -Port 443
Test-NetConnection -ComputerName 188.121.103.118 -Port 3000
Test-NetConnection -ComputerName 188.121.103.118 -Port 8001

Write-Host "`n=========================================="
Write-Host "SCAN COMPLETE - Review output above"
Write-Host "=========================================="














