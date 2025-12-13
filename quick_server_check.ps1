# Quick server status check

$SERVER_HOST = $env:BAHAMM_SSH_HOST
if (-not $SERVER_HOST) { $SERVER_HOST = "<YOUR_SERVER_IP>" }
$SERVER_USER = $env:BAHAMM_SSH_USER
if (-not $SERVER_USER) { $SERVER_USER = "ubuntu" }
$SERVER = "$SERVER_USER@$SERVER_HOST"
$SSH_KEY = $env:BAHAMM_SSH_KEY
if (-not $SSH_KEY) { $SSH_KEY = "<PATH_TO_YOUR_PRIVATE_KEY>" }

Write-Host "Quick Server Status Check" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if server is reachable
Write-Host "Pinging server..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $SERVER_HOST -Count 2 -Quiet
if ($ping) {
    Write-Host "✓ Server is reachable" -ForegroundColor Green
} else {
    Write-Host "✗ Server is not reachable" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking services..." -ForegroundColor Yellow

$checkCommands = @"
echo "=== Service Status ==="
sudo systemctl is-active nginx && echo "✓ Nginx: Running" || echo "✗ Nginx: Stopped"
sudo systemctl is-active bahamm-backend && echo "✓ Backend: Running" || echo "✗ Backend: Stopped"
pm2 list 2>/dev/null | grep -q online && echo "✓ Frontend: Running" || echo "✗ Frontend: Not in PM2"

echo ""
echo "=== Listening Ports ==="
sudo netstat -tlnp | grep -E ':80|:443|:3000|:8001'

echo ""
echo "=== Last 5 Nginx Errors ==="
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No errors"
"@

ssh -i $SSH_KEY $SERVER $checkCommands

