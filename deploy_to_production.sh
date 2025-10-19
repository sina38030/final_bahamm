#!/bin/bash
# Deployment script for production server
# This script will pull latest code and rebuild the frontend

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."

# Navigate to app directory
cd /srv/app || exit 1

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Navigate to frontend
cd frontend || exit 1

# Clean old build
echo "🧹 Cleaning old build files..."
rm -rf .next
rm -rf node_modules/.cache

# Rebuild frontend
echo "🔨 Building frontend (this may take 2-5 minutes)..."
npm run build

# Restart frontend service
echo "🔄 Restarting frontend service..."

# Try PM2 first
if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart frontend || pm2 restart all
    pm2 status
# Try systemd
elif systemctl is-active --quiet bahamm-frontend; then
    echo "Using systemd..."
    sudo systemctl restart bahamm-frontend
    sudo systemctl status bahamm-frontend --no-pager
else
    echo "⚠️  Could not find process manager. Please restart manually."
fi

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Test URL: https://bahamm.ir/payment/success/invitee"
echo ""

