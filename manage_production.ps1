# Production Server Management Script
# Server: ubuntu@185.231.181.208
# Frontend: Port 3000 (Production)
# Backend: Port 8001 (Production)

$SSH_KEY = "C:\Users\User\.ssh\id_rsa"
$SERVER = "ubuntu@185.231.181.208"

Write-Host "=== Bahamm Production Server Management ===" -ForegroundColor Cyan
Write-Host ""

# Function to run SSH commands
function Run-SSH-Command {
    param([string]$Command)
    ssh -i $SSH_KEY $SERVER $Command
}

# Check if we can connect
Write-Host "Checking server connection..." -ForegroundColor Yellow
$test = ssh -i $SSH_KEY $SERVER "echo 'Connected'"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Server connection successful!" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot connect to server" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Current PM2 Status ===" -ForegroundColor Cyan
Run-SSH-Command "pm2 list"

Write-Host ""
Write-Host "=== Available Actions ===" -ForegroundColor Cyan
Write-Host "1. Stop all staging services (if any)"
Write-Host "2. Start production frontend"
Write-Host "3. Restart production frontend"
Write-Host "4. View production frontend logs"
Write-Host "5. View production backend logs"
Write-Host "6. Check production backend status"
Write-Host "7. Exit"
Write-Host ""

$choice = Read-Host "Enter your choice (1-7)"

switch ($choice) {
    "1" {
        Write-Host "Stopping staging services..." -ForegroundColor Yellow
        Run-SSH-Command "pm2 stop frontend-staging 2>/dev/null; pm2 delete frontend-staging 2>/dev/null; pm2 stop bahamm-backend-staging 2>/dev/null; pm2 delete bahamm-backend-staging 2>/dev/null; pm2 save"
        Write-Host "✓ Staging services stopped and removed" -ForegroundColor Green
    }
    "2" {
        Write-Host "Starting production frontend..." -ForegroundColor Yellow
        Run-SSH-Command "cd /srv/app/frontend/frontend && pm2 start /srv/app/frontend/deploy/frontend-ecosystem.config.js && pm2 save"
        Write-Host "✓ Production frontend started" -ForegroundColor Green
    }
    "3" {
        Write-Host "Restarting production frontend..." -ForegroundColor Yellow
        Run-SSH-Command "pm2 restart frontend && pm2 save"
        Write-Host "✓ Production frontend restarted" -ForegroundColor Green
    }
    "4" {
        Write-Host "Production frontend logs (last 50 lines):" -ForegroundColor Yellow
        Run-SSH-Command "pm2 logs frontend --lines 50 --nostream"
    }
    "5" {
        Write-Host "Production backend logs (last 50 lines):" -ForegroundColor Yellow
        Run-SSH-Command "pm2 logs bahamm-backend --lines 50 --nostream"
    }
    "6" {
        Write-Host "Checking production backend..." -ForegroundColor Yellow
        Run-SSH-Command "curl -s http://localhost:8001/health"
        Write-Host ""
    }
    "7" {
        Write-Host "Exiting..." -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Final PM2 Status ===" -ForegroundColor Cyan
Run-SSH-Command "pm2 list"
Write-Host ""
Write-Host "Done!" -ForegroundColor Green

