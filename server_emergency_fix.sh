#!/bin/bash
# Emergency Server Fix Script for bahamm.ir
# Run this script on the server to fix 522 errors

set -e

echo "=========================================="
echo "  BAHAMM.IR Emergency Server Fix"
echo "=========================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if sudo netstat -tlnp | grep -q ":$port "; then
        echo "✓ Port $port is in use"
        return 0
    else
        echo "✗ Port $port is NOT in use"
        return 1
    fi
}

# Function to wait for a port to be ready
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=1
    
    echo "Waiting for port $port..."
    while [ $attempt -le $max_attempts ]; do
        if sudo netstat -tlnp | grep -q ":$port "; then
            echo "✓ Port $port is ready!"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo ""
    echo "✗ Port $port failed to start after 30 seconds"
    return 1
}

echo "Step 1: Stopping all services..."
echo "=================================="
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop bahamm-backend 2>/dev/null || true
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill any stuck processes
echo "Killing any stuck processes..."
sudo fuser -k 80/tcp 2>/dev/null || true
sudo fuser -k 443/tcp 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 8001/tcp 2>/dev/null || true
sleep 2

echo ""
echo "Step 2: Starting Backend (port 8001)..."
echo "========================================"
sudo systemctl start bahamm-backend
sudo systemctl enable bahamm-backend
sleep 3

if check_port 8001; then
    echo "✓ Backend started successfully"
else
    echo "✗ Backend failed to start. Checking logs..."
    sudo journalctl -u bahamm-backend -n 20
    echo ""
    echo "Attempting manual backend start..."
    cd /srv/app/backend
    source venv/bin/activate 2>/dev/null || true
    pkill -f uvicorn || true
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 > /tmp/backend.log 2>&1 &
    sleep 3
    if ! check_port 8001; then
        echo "✗ Backend still not running. Check /tmp/backend.log"
        cat /tmp/backend.log
    fi
fi

echo ""
echo "Step 3: Starting Frontend (port 3000)..."
echo "========================================="
cd /srv/app/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if .next build exists
if [ ! -d ".next" ]; then
    echo "Building Next.js app..."
    npm run build
fi

# Start with PM2 if available, otherwise use nohup
if command -v pm2 &> /dev/null; then
    echo "Starting frontend with PM2..."
    pm2 start npm --name "bahamm-frontend" -- start
    pm2 save
    pm2 startup
else
    echo "Starting frontend with nohup..."
    nohup npm start > /tmp/frontend.log 2>&1 &
fi

if wait_for_port 3000; then
    echo "✓ Frontend started successfully"
else
    echo "✗ Frontend failed to start"
    if command -v pm2 &> /dev/null; then
        pm2 logs --lines 20
    else
        tail -20 /tmp/frontend.log
    fi
fi

echo ""
echo "Step 4: Starting Nginx..."
echo "=========================="
# Test nginx configuration first
if sudo nginx -t 2>/dev/null; then
    echo "✓ Nginx configuration is valid"
    sudo systemctl start nginx
    sudo systemctl enable nginx
    sleep 2
    
    if check_port 80 && check_port 443; then
        echo "✓ Nginx started successfully"
    else
        echo "✗ Nginx failed to start"
        sudo systemctl status nginx --no-pager -n 20
    fi
else
    echo "✗ Nginx configuration has errors:"
    sudo nginx -t
fi

echo ""
echo "Step 5: Verification..."
echo "========================"
echo ""
echo "Service Status:"
echo "---------------"
sudo systemctl is-active nginx && echo "✓ Nginx: Running" || echo "✗ Nginx: Stopped"
sudo systemctl is-active bahamm-backend && echo "✓ Backend: Running" || echo "✗ Backend: Stopped"

echo ""
echo "Port Status:"
echo "------------"
sudo netstat -tlnp | grep -E ':80|:443|:3000|:8001' || echo "No ports found!"

echo ""
echo "Testing Local Connections:"
echo "-------------------------"
echo -n "HTTP (port 80): "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost || echo "FAILED"

echo -n "HTTPS (port 443): "
curl -s -o /dev/null -w "%{http_code}\n" -k https://localhost || echo "FAILED"

echo -n "Frontend (port 3000): "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000 || echo "FAILED"

echo -n "Backend (port 8001): "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/health || echo "FAILED"

echo ""
echo "System Resources:"
echo "-----------------"
free -h | grep Mem
df -h / | tail -1

echo ""
echo "Recent Error Logs:"
echo "------------------"
echo "=== Nginx Errors ==="
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error logs"

echo ""
echo "=== Backend Logs ==="
sudo journalctl -u bahamm-backend -n 10 --no-pager 2>/dev/null || echo "No backend logs"

echo ""
echo "=== Frontend Logs ==="
if command -v pm2 &> /dev/null; then
    pm2 logs --lines 10 --nostream 2>/dev/null || echo "No PM2 logs"
else
    tail -10 /tmp/frontend.log 2>/dev/null || echo "No frontend logs"
fi

echo ""
echo "=========================================="
echo "  Fix Complete!"
echo "=========================================="
echo ""
echo "Now test your site: https://bahamm.ir"
echo ""
echo "If still not working, check:"
echo "1. Cloudflare SSL/TLS mode (should be 'Full' or 'Full (strict)')"
echo "2. Cloudflare proxy status (orange cloud)"
echo "3. Firewall rules: sudo ufw status"
echo "4. SSL certificates: sudo certbot certificates"
echo ""

