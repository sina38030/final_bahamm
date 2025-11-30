#!/bin/bash

echo "======================================"
echo "Docker Deployment Setup for Bahamm"
echo "======================================"

cd /srv/app/frontend

# Check repository structure
echo "Checking repository structure..."
if [ -d "frontend" ] && [ -d "backend" ]; then
    echo "✓ Repository has frontend and backend subdirectories"
    REPO_ROOT="/srv/app/frontend"
    FRONTEND_DIR="$REPO_ROOT/frontend"
    BACKEND_DIR="$REPO_ROOT/backend"
else
    echo "! Repository is flat structure"
    REPO_ROOT="/srv/app"
    FRONTEND_DIR="/srv/app/frontend"
    BACKEND_DIR="/srv/app/backend"
fi

# Pull latest code
echo "Pulling latest code..."
cd $REPO_ROOT
git fetch origin main
git reset --hard origin/main

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    sudo systemctl start docker
    sudo systemctl enable docker
    echo "✓ Docker installed"
else
    echo "✓ Docker is already installed"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✓ Docker Compose installed"
else
    echo "✓ Docker Compose is already installed"
fi

# Show versions
echo ""
echo "Installed versions:"
docker --version
docker-compose --version

# Check for Docker files
echo ""
echo "Checking for Docker files..."
if [ -f "$REPO_ROOT/docker-compose.prod.yml" ]; then
    echo "✓ docker-compose.prod.yml found"
else
    echo "✗ docker-compose.prod.yml NOT found"
fi

if [ -f "$FRONTEND_DIR/Dockerfile" ]; then
    echo "✓ Frontend Dockerfile found"
else
    echo "✗ Frontend Dockerfile NOT found"
fi

if [ -f "$BACKEND_DIR/Dockerfile" ]; then
    echo "✓ Backend Dockerfile found"
else
    echo "✗ Backend Dockerfile NOT found"
fi

# Check for .env.prod
if [ -f "$REPO_ROOT/.env.prod" ]; then
    echo "✓ .env.prod exists"
else
    echo "! .env.prod does not exist - creating from example..."
    if [ -f "$REPO_ROOT/.env.prod.example" ]; then
        cp "$REPO_ROOT/.env.prod.example" "$REPO_ROOT/.env.prod"
        echo "⚠ IMPORTANT: Edit .env.prod with your actual secrets!"
    else
        echo "✗ .env.prod.example not found"
    fi
fi

# Check for SSL certificates
echo ""
echo "Checking SSL certificates..."
if [ -d "$REPO_ROOT/nginx/ssl" ] && [ -f "$REPO_ROOT/nginx/ssl/fullchain.pem" ]; then
    echo "✓ SSL certificates found"
else
    echo "! SSL certificates not found"
    echo "  You need to either:"
    echo "  1. Copy existing certificates to $REPO_ROOT/nginx/ssl/"
    echo "  2. Or generate self-signed for testing"
fi

# Make deploy script executable
if [ -f "$REPO_ROOT/deploy.sh" ]; then
    chmod +x "$REPO_ROOT/deploy.sh"
    echo "✓ deploy.sh is executable"
fi

echo ""
echo "======================================"
echo "Setup complete!"
echo "======================================"
echo ""
echo "Repository root: $REPO_ROOT"
echo "Frontend dir: $FRONTEND_DIR"
echo "Backend dir: $BACKEND_DIR"
echo ""
echo "Next steps:"
echo "1. Edit .env.prod with your secrets (if not done)"
echo "2. Ensure SSL certificates are in place"
echo "3. Run: cd $REPO_ROOT && ./deploy.sh"

