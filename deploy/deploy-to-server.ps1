# PowerShell script to deploy staging configuration to VPS
# Run this from your Windows machine

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "root"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Bahamm Staging Deployment to VPS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$DeployDir = "staging-setup"

Write-Host "Deploying to: $ServerUser@$ServerIP" -ForegroundColor Yellow
Write-Host ""

# Check if scp is available
try {
    $null = Get-Command scp -ErrorAction Stop
} catch {
    Write-Host "Error: scp command not found!" -ForegroundColor Red
    Write-Host "Please install OpenSSH Client in Windows Optional Features" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Creating directory on server..." -ForegroundColor Green
ssh "$ServerUser@$ServerIP" "mkdir -p /root/$DeployDir"

Write-Host "Step 2: Uploading configuration files..." -ForegroundColor Green
scp backend-staging.service "$ServerUser@${ServerIP}:/root/$DeployDir/"
scp frontend-ecosystem.config.js "$ServerUser@${ServerIP}:/root/$DeployDir/"
scp nginx-staging.conf "$ServerUser@${ServerIP}:/root/$DeployDir/"
scp setup-staging.sh "$ServerUser@${ServerIP}:/root/$DeployDir/"
scp README.md "$ServerUser@${ServerIP}:/root/$DeployDir/"

Write-Host ""
Write-Host "✓ Files uploaded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SSH into your server:" -ForegroundColor White
Write-Host "   ssh $ServerUser@$ServerIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Run the setup script:" -ForegroundColor White
Write-Host "   cd /root/$DeployDir" -ForegroundColor Cyan
Write-Host "   chmod +x setup-staging.sh" -ForegroundColor Cyan
Write-Host "   sudo ./setup-staging.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run directly:" -ForegroundColor White
Write-Host "   ssh $ServerUser@$ServerIP 'cd /root/$DeployDir && chmod +x setup-staging.sh && sudo ./setup-staging.sh'" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan

# Ask if user wants to run the setup script now
Write-Host ""
$response = Read-Host "Do you want to run the setup script now? (y/n)"

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Running setup script on server..." -ForegroundColor Green
    ssh "$ServerUser@$ServerIP" "cd /root/$DeployDir && chmod +x setup-staging.sh && sudo ./setup-staging.sh"
}


