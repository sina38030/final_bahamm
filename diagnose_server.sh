#!/bin/bash
# Server Diagnostic Script for 522 Error

echo "=== Checking Nginx Status ==="
sudo systemctl status nginx --no-pager
echo ""

echo "=== Checking if Nginx is listening on port 80/443 ==="
sudo netstat -tlnp | grep -E ':80|:443'
echo ""

echo "=== Checking Backend Service ==="
sudo systemctl status bahamm-backend --no-pager
echo ""

echo "=== Checking Running Processes ==="
ps aux | grep -E 'node|python|uvicorn|next' | grep -v grep
echo ""

echo "=== Checking Port 3000 (Frontend) ==="
sudo netstat -tlnp | grep :3000
echo ""

echo "=== Checking Port 8000 (Backend) ==="
sudo netstat -tlnp | grep :8000
echo ""

echo "=== Checking Recent Nginx Error Logs ==="
sudo tail -n 50 /var/log/nginx/error.log
echo ""

echo "=== Checking System Resources ==="
free -h
df -h
echo ""

echo "=== Checking if PM2 processes exist ==="
pm2 list 2>/dev/null || echo "PM2 not found or no processes"
echo ""

