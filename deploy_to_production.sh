#!/bin/bash

echo "=== Starting Production Deployment ==="

# Navigate to the git repo
cd /srv/app/frontend
echo "✓ In git repository directory"

# Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main
echo "✓ Git pull completed"

# Navigate to the actual frontend app
cd frontend
echo "✓ In frontend app directory"

# Stop services first to avoid permission issues
echo "Stopping services..."
pm2 stop frontend || true
pm2 stop bahamm-backend || true
echo "✓ Services stopped"

# Clean old build
echo "Cleaning old build files..."
sudo rm -rf .next 2>/dev/null || rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
echo "✓ Old build cleaned"

# Build frontend
echo "Building frontend (this will take 2-5 minutes)..."
npm run build
echo "✓ Frontend build completed"

# Restart services
echo "Restarting services..."
pm2 restart frontend
pm2 restart bahamm-backend
echo "✓ Services restarted"

# Show status
echo "=== Service Status ==="
pm2 status

echo ""
echo "=== Deployment Complete! ==="
