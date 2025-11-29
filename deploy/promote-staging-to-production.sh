#!/bin/bash

# Script to promote staging code to production
# This pulls the latest code and restarts production services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Promote Staging to Production${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Safety check
echo -e "${YELLOW}⚠️  WARNING: This will restart production services!${NC}"
echo -e "${YELLOW}⚠️  Make sure staging is working correctly first!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# Backend Production
echo -e "${YELLOW}[1/4] Updating Backend...${NC}"
cd /srv/app/backend

echo "  - Pulling latest code..."
git pull origin main

echo "  - Activating virtual environment..."
source venv/bin/activate

echo "  - Installing dependencies..."
pip install -r requirements.txt --quiet

echo "  - Restarting backend service..."
sudo systemctl restart backend

# Wait for backend to start
sleep 3

if systemctl is-active --quiet backend; then
    echo -e "  ${GREEN}✓ Backend restarted successfully${NC}"
else
    echo -e "  ${RED}✗ Backend failed to start!${NC}"
    echo "  Check logs: sudo journalctl -u backend -n 50"
    exit 1
fi

# Frontend Production
echo ""
echo -e "${YELLOW}[2/4] Updating Frontend...${NC}"
cd /srv/app/frontend

echo "  - Pulling latest code..."
git pull origin main

echo "  - Installing dependencies..."
npm install --silent

echo "  - Building production bundle..."
npm run build

echo "  - Restarting frontend process..."
pm2 restart frontend

# Wait for frontend to start
sleep 3

if pm2 describe frontend 2>/dev/null | grep -q "online"; then
    echo -e "  ${GREEN}✓ Frontend restarted successfully${NC}"
else
    echo -e "  ${RED}✗ Frontend failed to start!${NC}"
    echo "  Check logs: pm2 logs frontend"
    exit 1
fi

# Nginx reload
echo ""
echo -e "${YELLOW}[3/4] Reloading Nginx...${NC}"
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo -e "  ${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "  ${RED}✗ Nginx config test failed!${NC}"
    exit 1
fi

# Health checks
echo ""
echo -e "${YELLOW}[4/4] Running health checks...${NC}"

sleep 2

# Check backend
backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/health)
if [ "$backend_status" = "200" ]; then
    echo -e "  ${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "  ${RED}✗ Backend health check failed (HTTP $backend_status)${NC}"
fi

# Check frontend
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000)
if [ "$frontend_status" = "200" ]; then
    echo -e "  ${GREEN}✓ Frontend health check passed${NC}"
else
    echo -e "  ${RED}✗ Frontend health check failed (HTTP $frontend_status)${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Production URLs:"
echo "  Frontend: https://app.bahamm.ir"
echo "  Backend:  https://api.bahamm.ir"
echo ""
echo "Monitor services:"
echo "  sudo journalctl -u backend -f"
echo "  pm2 logs frontend"
echo ""
echo -e "${YELLOW}TIP: Keep watching logs for a few minutes to catch any issues${NC}"

