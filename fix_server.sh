#!/bin/bash
# Quick Fix Script for Server 522 Error

echo "=== Starting Nginx ==="
sudo systemctl start nginx
sudo systemctl enable nginx
echo ""

echo "=== Starting Backend Service ==="
sudo systemctl start bahamm-backend
sudo systemctl enable bahamm-backend
echo ""

echo "=== Checking if Frontend needs to be started ==="
cd /srv/app/frontend

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to start frontend..."
    pm2 delete bahamm-frontend 2>/dev/null || true
    pm2 start npm --name "bahamm-frontend" -- start
    pm2 save
else
    echo "PM2 not found. Starting with npm in background..."
    # Kill any existing node processes on port 3000
    sudo fuser -k 3000/tcp 2>/dev/null || true
    nohup npm start > /tmp/frontend.log 2>&1 &
fi
echo ""

echo "=== Checking Status ==="
sleep 3
sudo systemctl status nginx --no-pager | head -n 10
sudo systemctl status bahamm-backend --no-pager | head -n 10
echo ""

echo "=== Checking Ports ==="
sudo netstat -tlnp | grep -E ':80|:443|:3000|:8000'
echo ""

echo "=== Done! Testing local connection ==="
curl -I http://localhost 2>/dev/null || echo "Nginx not responding locally"
echo ""

