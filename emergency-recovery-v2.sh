#!/bin/bash
###############################################################################
# Emergency Recovery Script v2 - With Permission Fixes
###############################################################################

echo "================================================"
echo "   Bahamm Emergency Recovery v2"
echo "================================================"
echo ""

# Stop everything
echo "[1/5] Stopping all services..."
sudo pkill -9 -f 'python|uvicorn|npm|next|node' 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo "✅ Stopped"
echo ""

# Fix permissions
echo "[2/5] Fixing permissions..."
sudo chown -R ubuntu:ubuntu /srv/app/frontend/frontend
sudo rm -rf /srv/app/frontend/frontend/.next
echo "✅ Permissions fixed"
echo ""

# Start backend with Poetry
echo "[3/5] Starting backend..."
cd /srv/app/frontend/backend
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
sleep 8

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is UP!"
    curl -s http://localhost:8000/health
else
    echo "❌ Backend failed to start. Check /tmp/backend.log"
    tail -20 /tmp/backend.log
fi
echo ""

# Build and start frontend
echo "[4/5] Building and starting frontend (2-3 minutes)..."
cd /srv/app/frontend/frontend
npm run build && npm start > /tmp/frontend.log 2>&1 &
sleep 15

if curl -I http://localhost:3000 2>&1 | grep -q "HTTP"; then
    echo "✅ Frontend is UP!"
else
    echo "⚠️  Frontend may still be starting..."
fi
echo ""

# Start nginx
echo "[5/5] Starting nginx..."
sudo systemctl start nginx
echo "✅ Nginx started"
echo ""

# Final status
echo "================================================"
echo "   Status Check"
echo "================================================"
echo ""
echo "Backend:  " && curl -s http://localhost:8000/health || echo "Not responding"
echo ""
echo "Frontend: " && curl -I http://localhost:3000 2>&1 | head -1 || echo "Not responding"
echo ""
echo "Site:     " && curl -I https://bahamm.ir 2>&1 | head -1 || echo "Not accessible"
echo ""
echo "================================================"
echo "✅ Recovery script completed!"
echo "================================================"
echo ""
echo "Check logs if needed:"
echo "  tail -f /tmp/backend.log"
echo "  tail -f /tmp/frontend.log"
echo ""

