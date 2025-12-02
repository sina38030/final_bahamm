#!/bin/bash
###############################################################################
# Emergency Recovery Script for Bahamm Platform
# This script will get your site back online quickly
###############################################################################

set -e

echo "================================================"
echo "   Bahamm Platform - Emergency Recovery"
echo "   Domain: bahamm.ir"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[1/6] Stopping all processes...${NC}"
sudo pkill -9 -f 'python|uvicorn|npm|next|node' 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ All processes stopped${NC}"
echo ""

echo -e "${YELLOW}[2/6] Starting backend...${NC}"
cd /srv/app/frontend/backend
nohup poetry run uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 10
echo -e "${GREEN}✅ Backend started${NC}"
echo ""

echo -e "${YELLOW}[3/6] Testing backend health...${NC}"
for i in {1..5}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        curl -s http://localhost:8000/health
        break
    else
        echo "Attempt $i/5: Backend not ready yet..."
        sleep 3
    fi
done
echo ""

echo -e "${YELLOW}[4/6] Checking frontend build...${NC}"
cd /srv/app/frontend/frontend
if [ ! -f ".next/standalone/server.js" ]; then
    echo -e "${YELLOW}⚠️  No production build found. Building now (this takes 1-2 minutes)...${NC}"
    npm run build
    echo -e "${GREEN}✅ Frontend built${NC}"
else
    echo -e "${GREEN}✅ Frontend build exists${NC}"
fi
echo ""

echo -e "${YELLOW}[5/6] Starting frontend...${NC}"
nohup npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 15

# Test frontend
for i in {1..5}; do
    if curl -I http://localhost:3000 2>&1 | grep -q "200\|304\|301\|302"; then
        echo -e "${GREEN}✅ Frontend is running!${NC}"
        break
    else
        echo "Attempt $i/5: Frontend not ready yet..."
        sleep 3
    fi
done
echo ""

echo -e "${YELLOW}[6/6] Starting nginx...${NC}"
sudo systemctl start nginx
sleep 2
echo -e "${GREEN}✅ Nginx started${NC}"
echo ""

echo "================================================"
echo "   🔍 Final System Check"
echo "================================================"
echo ""

echo "Backend Health:"
curl -s http://localhost:8000/health || echo "❌ Backend not responding"
echo ""

echo "Frontend Status:"
curl -I http://localhost:3000 2>&1 | head -1 || echo "❌ Frontend not responding"
echo ""

echo "Nginx Status:"
sudo systemctl status nginx --no-pager | head -5
echo ""

echo "Public Site:"
curl -I https://bahamm.ir 2>&1 | head -1 || curl -I http://bahamm.ir 2>&1 | head -1 || echo "❌ Site not accessible"
echo ""

echo "================================================"
echo "   Process Information"
echo "================================================"
echo ""

echo "Running Processes:"
ps aux | grep -E 'python.*main|npm.*start|uvicorn' | grep -v grep || echo "No processes found"
echo ""

echo "Listening Ports:"
ss -tlnp 2>&1 | grep -E 'LISTEN.*:(8000|3000|80|443)' || echo "No services listening"
echo ""

echo "================================================"
echo "   ✅ Recovery Complete!"
echo "================================================"
echo ""
echo "Your site should now be accessible at:"
echo "  🌐 https://bahamm.ir"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo "To monitor processes:"
echo "  watch -n 1 'curl -s http://localhost:8000/health'"
echo ""

