#!/bin/bash

###############################################################################
# Zero-Downtime Deployment Script for Bahamm Platform
# This script handles graceful deployment with health checks and rollback
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)
MAX_WAIT_TIME=120  # Maximum time to wait for health checks (seconds)

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_health() {
    local service=$1
    local max_attempts=$((MAX_WAIT_TIME / 5))
    local attempt=0

    log_info "Checking health of $service..."
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f $COMPOSE_FILE ps | grep $service | grep -q "healthy\|Up"; then
            log_success "$service is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_info "Waiting for $service to be healthy... (attempt $attempt/$max_attempts)"
        sleep 5
    done
    
    log_error "$service failed health check"
    return 1
}

backup_database() {
    log_info "Creating database backup..."
    
    if docker-compose -f $COMPOSE_FILE ps db | grep -q "Up"; then
        BACKUP_DIR="backups"
        mkdir -p $BACKUP_DIR
        
        docker-compose -f $COMPOSE_FILE exec -T db pg_dump -U ${POSTGRES_USER:-bahamm_user} ${POSTGRES_DB:-bahamm} > "$BACKUP_DIR/backup_$BACKUP_SUFFIX.sql"
        
        if [ -f "$BACKUP_DIR/backup_$BACKUP_SUFFIX.sql" ]; then
            log_success "Database backup created: backup_$BACKUP_SUFFIX.sql"
            return 0
        fi
    fi
    
    log_warning "Could not create database backup"
    return 1
}

rollback() {
    log_error "Deployment failed! Rolling back..."
    
    # Stop new containers
    docker-compose -f $COMPOSE_FILE down
    
    # Restore database if backup exists
    if [ -f "backups/backup_$BACKUP_SUFFIX.sql" ]; then
        log_info "Restoring database from backup..."
        docker-compose -f $COMPOSE_FILE up -d db
        sleep 10
        docker-compose -f $COMPOSE_FILE exec -T db psql -U ${POSTGRES_USER:-bahamm_user} ${POSTGRES_DB:-bahamm} < "backups/backup_$BACKUP_SUFFIX.sql"
    fi
    
    log_error "Rollback completed. Please check logs and try again."
    exit 1
}

###############################################################################
# Main Deployment Process
###############################################################################

echo "
╔═══════════════════════════════════════════════════════════╗
║     Bahamm Platform - Zero-Downtime Deployment           ║
╚═══════════════════════════════════════════════════════════╝
"

# Step 1: Pre-deployment checks
log_info "Starting pre-deployment checks..."

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Docker compose file not found: $COMPOSE_FILE"
    exit 1
fi

if [ ! -f ".env.prod" ]; then
    log_warning ".env.prod file not found. Make sure environment variables are set!"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log_success "Pre-deployment checks passed"

# Step 2: Pull latest code
log_info "Pulling latest code from repository..."
if ! git pull origin main; then
    log_error "Failed to pull latest code"
    exit 1
fi
log_success "Code updated successfully"

# Step 3: Backup database
backup_database || log_warning "Proceeding without database backup"

# Step 4: Build new images
log_info "Building Docker images..."
if ! docker-compose -f $COMPOSE_FILE build --no-cache; then
    log_error "Failed to build Docker images"
    exit 1
fi
log_success "Images built successfully"

# Step 5: Deploy with zero downtime
log_info "Starting deployment..."

# Start database first if not running
if ! docker-compose -f $COMPOSE_FILE ps db | grep -q "Up"; then
    log_info "Starting database..."
    docker-compose -f $COMPOSE_FILE up -d db
    sleep 10
    
    if ! check_health "db"; then
        rollback
    fi
fi

# Deploy backend
log_info "Deploying backend..."
docker-compose -f $COMPOSE_FILE up -d --no-deps backend

if ! check_health "backend"; then
    rollback
fi

# Deploy frontend
log_info "Deploying frontend..."
docker-compose -f $COMPOSE_FILE up -d --no-deps frontend

if ! check_health "frontend"; then
    rollback
fi

# Deploy nginx
log_info "Deploying nginx..."
docker-compose -f $COMPOSE_FILE up -d --no-deps nginx

if ! check_health "nginx"; then
    rollback
fi

# Step 6: Cleanup old images and containers
log_info "Cleaning up old images..."
docker image prune -f

# Step 7: Final verification
log_info "Running final verification..."
sleep 5

if docker-compose -f $COMPOSE_FILE ps | grep -qE "(Exit|unhealthy)"; then
    log_error "Some services are not running correctly"
    docker-compose -f $COMPOSE_FILE ps
    rollback
fi

# Success!
echo "
╔═══════════════════════════════════════════════════════════╗
║           ✅ Deployment Completed Successfully!          ║
╚═══════════════════════════════════════════════════════════╝
"

log_success "All services are running and healthy"
log_info "Frontend: https://bahamm.ir"
log_info "Backend API: https://app.bahamm.ir"

# Show running containers
echo ""
log_info "Running containers:"
docker-compose -f $COMPOSE_FILE ps

echo ""
log_info "Deployment completed at: $(date)"
log_info "Backup saved as: backups/backup_$BACKUP_SUFFIX.sql"

exit 0

