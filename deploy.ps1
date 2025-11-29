# Zero-Downtime Deployment Script for Bahamm Platform (Windows/PowerShell)
# This script handles graceful deployment with health checks and rollback

$ErrorActionPreference = "Stop"

# Configuration
$COMPOSE_FILE = "docker-compose.prod.yml"
$BACKUP_SUFFIX = Get-Date -Format "yyyyMMdd_HHmmss"
$MAX_WAIT_TIME = 120  # Maximum time to wait for health checks (seconds)

# Functions
function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-ErrorCustom {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-ServiceHealth {
    param($ServiceName)
    
    $maxAttempts = [Math]::Floor($MAX_WAIT_TIME / 5)
    $attempt = 0
    
    Write-Info "Checking health of $ServiceName..."
    
    while ($attempt -lt $maxAttempts) {
        $status = docker-compose -f $COMPOSE_FILE ps $ServiceName 2>&1
        if ($status -match "healthy|Up") {
            Write-Success "$ServiceName is healthy"
            return $true
        }
        
        $attempt++
        Write-Info "Waiting for $ServiceName to be healthy... (attempt $attempt/$maxAttempts)"
        Start-Sleep -Seconds 5
    }
    
    Write-ErrorCustom "$ServiceName failed health check"
    return $false
}

function Backup-Database {
    Write-Info "Creating database backup..."
    
    $backupDir = "backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    $status = docker-compose -f $COMPOSE_FILE ps db 2>&1
    if ($status -match "Up") {
        $backupFile = "$backupDir/backup_$BACKUP_SUFFIX.sql"
        docker-compose -f $COMPOSE_FILE exec -T db pg_dump -U bahamm_user bahamm | Out-File -FilePath $backupFile -Encoding utf8
        
        if (Test-Path $backupFile) {
            Write-Success "Database backup created: backup_$BACKUP_SUFFIX.sql"
            return $true
        }
    }
    
    Write-Warning-Custom "Could not create database backup"
    return $false
}

function Invoke-Rollback {
    Write-ErrorCustom "Deployment failed! Rolling back..."
    
    # Stop new containers
    docker-compose -f $COMPOSE_FILE down
    
    # Restore database if backup exists
    $backupFile = "backups/backup_$BACKUP_SUFFIX.sql"
    if (Test-Path $backupFile) {
        Write-Info "Restoring database from backup..."
        docker-compose -f $COMPOSE_FILE up -d db
        Start-Sleep -Seconds 10
        Get-Content $backupFile | docker-compose -f $COMPOSE_FILE exec -T db psql -U bahamm_user bahamm
    }
    
    Write-ErrorCustom "Rollback completed. Please check logs and try again."
    exit 1
}

# Main Deployment Process
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║     Bahamm Platform - Zero-Downtime Deployment           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Step 1: Pre-deployment checks
Write-Info "Starting pre-deployment checks..."

if (-not (Test-Path $COMPOSE_FILE)) {
    Write-ErrorCustom "Docker compose file not found: $COMPOSE_FILE"
    exit 1
}

if (-not (Test-Path ".env.prod")) {
    Write-Warning-Custom ".env.prod file not found. Make sure environment variables are set!"
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

Write-Success "Pre-deployment checks passed"

# Step 2: Pull latest code
Write-Info "Pulling latest code from repository..."
try {
    git pull origin main
    Write-Success "Code updated successfully"
} catch {
    Write-ErrorCustom "Failed to pull latest code"
    exit 1
}

# Step 3: Backup database
Backup-Database | Out-Null

# Step 4: Build new images
Write-Info "Building Docker images..."
try {
    docker-compose -f $COMPOSE_FILE build --no-cache
    Write-Success "Images built successfully"
} catch {
    Write-ErrorCustom "Failed to build Docker images"
    exit 1
}

# Step 5: Deploy with zero downtime
Write-Info "Starting deployment..."

# Start database first if not running
$dbStatus = docker-compose -f $COMPOSE_FILE ps db 2>&1
if ($dbStatus -notmatch "Up") {
    Write-Info "Starting database..."
    docker-compose -f $COMPOSE_FILE up -d db
    Start-Sleep -Seconds 10
    
    if (-not (Test-ServiceHealth "db")) {
        Invoke-Rollback
    }
}

# Deploy backend
Write-Info "Deploying backend..."
docker-compose -f $COMPOSE_FILE up -d --no-deps backend

if (-not (Test-ServiceHealth "backend")) {
    Invoke-Rollback
}

# Deploy frontend
Write-Info "Deploying frontend..."
docker-compose -f $COMPOSE_FILE up -d --no-deps frontend

if (-not (Test-ServiceHealth "frontend")) {
    Invoke-Rollback
}

# Deploy nginx
Write-Info "Deploying nginx..."
docker-compose -f $COMPOSE_FILE up -d --no-deps nginx

if (-not (Test-ServiceHealth "nginx")) {
    Invoke-Rollback
}

# Step 6: Cleanup old images
Write-Info "Cleaning up old images..."
docker image prune -f | Out-Null

# Step 7: Final verification
Write-Info "Running final verification..."
Start-Sleep -Seconds 5

$psOutput = docker-compose -f $COMPOSE_FILE ps
if ($psOutput -match "Exit|unhealthy") {
    Write-ErrorCustom "Some services are not running correctly"
    docker-compose -f $COMPOSE_FILE ps
    Invoke-Rollback
}

# Success!
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║           ✅ Deployment Completed Successfully!          ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Success "All services are running and healthy"
Write-Info "Frontend: https://bahamm.ir"
Write-Info "Backend API: https://app.bahamm.ir"

# Show running containers
Write-Host ""
Write-Info "Running containers:"
docker-compose -f $COMPOSE_FILE ps

Write-Host ""
Write-Info "Deployment completed at: $(Get-Date)"
Write-Info "Backup saved as: backups/backup_$BACKUP_SUFFIX.sql"

