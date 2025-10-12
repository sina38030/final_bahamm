#!/bin/bash
# This script rebuilds the frontend with the correct environment variable

echo "🔧 Fixing frontend build with correct API URL..."

# Navigate to frontend directory
cd /srv/app/frontend/frontend || exit 1

# Stop the current frontend process
echo "⏸️  Stopping current frontend..."
pm2 stop bahamm-frontend

# Set the environment variable and rebuild
echo "🔨 Building frontend with production API URL..."
export NEXT_PUBLIC_BACKEND_URL="https://bahamm.ir/backend/api"
npm run build

# Restart the frontend
echo "🚀 Restarting frontend..."
pm2 restart bahamm-frontend

# Save PM2 configuration
pm2 save

echo "✅ Done! Frontend rebuilt and restarted with correct API URL"
echo "🔍 Check the logs with: pm2 logs bahamm-frontend --lines 20"

