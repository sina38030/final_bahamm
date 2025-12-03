# Production Server Restart Guide

**Server:** 185.231.181.208  
**User:** ubuntu  
**SSH Key:** C:\Users\User\.ssh\id_rsa

---

## ⚡ QUICK FIX FOR 502 ERROR

If website shows 502 Bad Gateway error:

```powershell
# Kill root PM2 processes and restart properly
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "sudo pm2 stop all && sudo pm2 delete all && sudo pm2 save --force && pm2 stop all && pm2 delete all && sudo fuser -k 3000/tcp && cd /srv/app/backend && pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001 && cd /srv/app/frontend/frontend && sudo chown -R ubuntu:ubuntu .next && PORT=3000 pm2 start npm --name frontend -- run dev && pm2 save"
```

Then verify:
```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "sleep 60 && pm2 status"
```

---

## ⚡ QUICK RESTART COMMANDS (Copy & Paste)

### Full Restart (Both Backend & Frontend)

```powershell
# Connect and restart everything
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 stop all && pm2 delete all && cd /srv/app/backend && pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001 && cd /srv/app/frontend/frontend && PORT=3000 pm2 start npm --name frontend -- run dev && pm2 save"
```

### Restart Backend Only

```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart backend"
```

### Restart Frontend Only

```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend"
```

### Check Status

```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 status"
```

### View Logs

```powershell
# Both services
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs --lines 50"

# Backend only
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs backend --lines 50"

# Frontend only
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs frontend --lines 50"
```

---

## 📋 STEP-BY-STEP RESTART (If Quick Command Fails)

### Step 1: Stop All Services
```bash
pm2 stop all
pm2 delete all
```

### Step 2: Start Backend
```bash
cd /srv/app/backend
pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001
```

**Critical Points:**
- ✅ Use `.venv/bin/python3` (full path to virtual environment Python)
- ✅ Port: `8001` (backend API port)
- ✅ Host: `0.0.0.0` (listen on all interfaces)
- ⚠️ Don't use `python3 main.py` directly - it won't find dependencies
- ⚠️ Don't use ecosystem.config.js - the start script is incomplete

### Step 3: Start Frontend
```bash
cd /srv/app/frontend/frontend
PORT=3000 pm2 start npm --name frontend -- run dev
```

**Critical Points:**
- ✅ Set `PORT=3000` environment variable
- ✅ Use `npm run dev` for fast startup (no build required)
- ✅ Dev mode is used in production for instant deployments
- ⚠️ Don't use `next start` directly with PM2
- ⚠️ Port 3000 must be free before starting

### Step 4: Save PM2 Configuration
```bash
pm2 save
```

### Step 5: Verify Everything is Running
```bash
pm2 status
```

Expected output:
```
┌────┬──────────┬─────────┬─────────┬────────┬──────┬─────────┐
│ id │ name     │ mode    │ pid     │ uptime │ ↺    │ status  │
├────┼──────────┼─────────┼─────────┼────────┼──────┼─────────┤
│ 11 │ backend  │ fork    │ 33692   │ 20m    │ 0    │ online  │
│ 15 │ frontend │ fork    │ 62645   │ 5m     │ 0    │ online  │
└────┴──────────┴─────────┴─────────┴────────┴──────┴─────────┘
```

---

## 🚨 TROUBLESHOOTING

### Backend Won't Start: "No module named 'fastapi'"
**Problem:** Python can't find dependencies  
**Solution:** Use full venv path: `.venv/bin/python3`

```bash
# ✅ CORRECT
pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001

# ❌ WRONG
pm2 start python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Frontend: "EADDRINUSE: address already in use :::3000"
**Problem:** Port 3000 is already occupied (often by zombie processes)  

**Solution 1:** Kill processes on port 3000
```bash
sudo fuser -k 3000/tcp
sleep 2
```

**Solution 2:** Check what's using port 3000 and kill it
```bash
# Check what's listening on port 3000
sudo ss -tulpn | grep :3000

# If you see a PID, kill it:
sudo kill -9 <PID>
```

**Solution 3:** Check for zombie node processes
```bash
ps aux | grep node
# Kill any Next.js processes
sudo pkill -f "next start"
# Or kill all node processes (CAUTION: this will restart PM2 processes)
sudo killall -9 node
```

**Solution 4:** Restart on different port temporarily, then switch back
```bash
PORT=3001 npm start  # Test if it works
# If works, kill it and restart on 3000
```

### Frontend: "Cannot find module '.next/standalone/server.js'"
**Problem:** Trying to use standalone mode when build doesn't have it  
**Solution:** Use `npm start` instead of `node .next/standalone/server.js`

### Both Services Keep Restarting (Crash Loop)
**Problem:** PM2 auto-restart is too aggressive  
**Solution:** Check logs first, fix the issue, then restart with limits
```bash
pm2 logs --lines 50
pm2 delete all
# Fix the issue based on logs
pm2 start ... --max-restarts 5
```

### 502 Bad Gateway Error (Website Not Working)
**Problem:** Frontend crashes constantly or returns 502 error  
**Root Causes:**
1. Zombie PM2 processes running as root
2. Missing or corrupted production build
3. Permission errors on `.next` directory

**Complete Solution (Follow in Order):**

#### Step 1: Check for Root PM2 Processes
```bash
# Check if root user has PM2 processes
sudo pm2 list

# If you see processes (especially with thousands of restarts), delete them:
sudo pm2 stop all
sudo pm2 delete all
sudo pm2 save --force
```

#### Step 2: Verify Dev Mode is Running
```bash
# Check PM2 status
pm2 status

# Frontend should be running with: npm run dev
# If not, restart it:
pm2 delete frontend
cd /srv/app/frontend/frontend
PORT=3000 pm2 start npm --name frontend -- run dev
pm2 save
```

**Note:** Server uses dev mode by default for instant deployments without build time.

#### Step 3: Fix Permissions
```bash
# Check ownership of .next directory
ls -ld /srv/app/frontend/frontend/.next

# If owned by root, fix it:
sudo chown -R ubuntu:ubuntu /srv/app/frontend/frontend/.next

# Restart frontend
pm2 restart frontend
```

#### Step 4: Verify It's Working
```bash
# Wait 60 seconds for dev server to fully start
sleep 60

# Check status (should show "online" with stable uptime)
pm2 status

# Test frontend
curl -s http://localhost:3000 | grep -o '<title>.*</title>'

# Should show: <title>فروشگاه باهم</title>
```

**Prevention:** 
- Never run PM2 commands as root (don't use `sudo pm2 start`)
- Always use the ubuntu user for frontend/backend
- Keep only one PM2 instance per user

---

## 📁 SERVER DIRECTORY STRUCTURE

```
/srv/app/
├── bahamm1.db              # SQLite database
├── backend/                # Backend Python/FastAPI
│   ├── .venv/              # Virtual environment (IMPORTANT!)
│   ├── main.py             # Entry point
│   └── app/                # Application code
└── frontend/               # Frontend repository root
    └── frontend/           # Actual Frontend Next.js app (NESTED!)
        ├── .next/          # Built files
        ├── node_modules/   # Dependencies
        └── package.json    # Project config
```

---

## 🔧 SERVICE CONFIGURATION

### Backend
- **Port:** 8001
- **Process Manager:** PM2
- **Python:** .venv/bin/python3 (Python 3.x with FastAPI)
- **Entry Point:** `python3 -m uvicorn main:app`
- **Database:** SQLite at /srv/app/bahamm1.db

### Frontend
- **Port:** 3000
- **Process Manager:** PM2
- **Framework:** Next.js 15.2.3
- **Entry Point:** `npm run dev` (dev mode for instant deployments)
- **Build Directory:** .next/ (not required for dev mode)

### Nginx (Reverse Proxy)
- **Port:** 443 (HTTPS)
- **Domain:** bahamm.ir
- **Frontend:** Proxies to localhost:3000
- **Backend API:** Proxies /api/* to localhost:8001

---

## 🤖 GITHUB ACTIONS DEPLOYMENT

The repository has an automated deployment workflow (`.github/workflows/deploy.yml`) that runs on every push to `main` branch.

### What the Deployment Does:
1. **Pulls latest code** from GitHub to `/srv/app/frontend`
2. **Updates backend dependencies** using `.venv/bin/pip install`
3. **Installs frontend dependencies** with `npm install`
4. **Cleans up zombie processes** (root PM2 processes, port 3000 conflicts)
5. **Restarts both services** using PM2 with correct configurations
6. **Uses dev mode** for instant startup (no 10-15 min build time)

### Deployment Time:
- **Total time:** ~2-3 minutes
- **Backend restart:** ~5 seconds
- **Frontend restart:** ~30 seconds (dev mode starts instantly)

### Why Dev Mode in Production?
- ✅ **Instant deployments** - No 10-15 minute Next.js build
- ✅ **Fast iteration** - Changes deploy in 2-3 minutes instead of 30+ minutes
- ✅ **No timeout issues** - Build timeouts were causing deployment failures
- ✅ **Same functionality** - Dev mode works perfectly for production traffic

### Manual Trigger:
You can manually trigger deployment from GitHub Actions tab or push to main branch.

### Troubleshooting Deployment:
If GitHub Actions deployment fails:
1. Check the Actions tab on GitHub for error logs
2. Most common issue: Port 3000 already in use
3. Manual fix: Use the quick restart command from this guide
4. Verify: `pm2 status` should show both services "online"

---

## 💡 IMPORTANT NOTES

1. **Never use Docker commands** - Server runs WITHOUT Docker
2. **Never use `sudo pm2`** - ALWAYS run PM2 as ubuntu user, not root
3. **Always use full venv path** for backend Python
4. **Frontend uses dev mode** - `npm run dev` for instant deployments (no build needed)
5. **Frontend is in a NESTED directory** - `/srv/app/frontend/frontend/` not `/srv/app/frontend/`
6. **Port 3000 must be free** before starting frontend - check for zombie processes with `sudo ss -tulpn | grep :3000`
7. **Check for root PM2 processes** - If getting 502 errors, run `sudo pm2 list` and delete any processes
8. **Check PM2 status** after any restart to ensure both services are "online"
9. **Run `pm2 save`** after successful start to persist configuration
10. **Nginx expects backend on 8001** and frontend on 3000 - don't change ports
11. **GitHub Actions deploys automatically** on push to main (takes 2-3 minutes)
12. **If unsure, use the Quick Restart command** at the top of this guide

---

## 🎯 SUCCESS CHECKLIST

After restart, verify:
- [ ] **No root PM2 processes:** Run `sudo pm2 list` - should show empty or no processes
- [ ] Backend status: `online` (not `errored` or `stopped`)
- [ ] Frontend status: `online` (not `errored` or `stopped`)
- [ ] No restarts: ↺ column should be 0 or very low (some initial restarts are normal)
- [ ] Stable uptime: Wait 1-2 minutes, check status again - uptime should increase
- [ ] Backend has memory: mem column > 90mb
- [ ] Frontend has memory: mem column > 50mb
- [ ] Website loads: https://bahamm.ir
- [ ] API responds: https://bahamm.ir/api/health or similar endpoint
- [ ] Frontend serves content: `curl http://localhost:3000 | grep title` shows site title

---

## 🕐 ESTIMATED RESTART TIME

- **Quick restart (services already configured):** 5-10 seconds
- **Full restart (delete and recreate):** 30-60 seconds
- **GitHub Actions deployment:** 2-3 minutes (pulls code, installs deps, restarts)
- **Troubleshooting required:** 5-30 minutes (use this guide to reduce time!)

---

## 📝 CHANGELOG

**2025-12-03 (Latest Update):**
- ✅ Changed default mode to dev mode for instant deployments
- ✅ Added GitHub Actions deployment documentation
- ✅ Updated all restart commands to use `npm run dev`
- ✅ Removed production build requirements (no more 10-15 min builds)
- ✅ Deployment time reduced from 30+ minutes to 2-3 minutes
- ✅ Added port 3000 zombie process cleanup to quick fix commands

**2025-12-02:**
- ✅ Added 502 Bad Gateway troubleshooting section
- ✅ Added root PM2 process detection and cleanup
- ✅ Added .next directory permission fix
- ✅ Added development mode fallback when production build missing
- ✅ Updated success checklist with root PM2 check
- ✅ Verified and tested all solutions on production server

**Last Updated:** 2025-12-03  
**Tested and Working:** ✅ (Fast deployments with dev mode)

