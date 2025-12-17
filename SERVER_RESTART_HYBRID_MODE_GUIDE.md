# 🚀 Server Restart Guide - Hybrid Hotload Mode

## 📋 Table of Contents
1. [Understanding Hybrid Mode](#understanding-hybrid-mode)
2. [Server Restart Procedures](#server-restart-procedures)
3. [Local Development Setup](#local-development-setup)
4. [Troubleshooting](#troubleshooting)
5. [Verification Steps](#verification-steps)

---

## 🔍 Understanding Hybrid Mode

### Architecture Overview

**Hybrid Mode** means:
- **Backend**: Runs on server (ubuntu@188.121.103.118) with `--reload` hotload
- **Frontend**: Can run BOTH on server AND locally on your laptop
- **Local development** is FASTER due to more CPU/RAM on laptop

### Why Hybrid Mode?

| Metric | Server Only | Hybrid Mode |
|--------|-------------|-------------|
| **Server RAM** | 100 MB free ❌ | 1-2 GB free ✅ |
| **Frontend Speed** | Slow/Crashes | INSTANT ⚡ |
| **Compile Time** | 6+ seconds | ~500ms ⚡⚡ |

---

## 🔄 Server Restart Procedures

### Option A: Full Restart (Both Services)

Use this when you need both frontend and backend running on the server.

```powershell
# Step 1: Connect to server and restart both services
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart all"

# Step 2: Wait for services to start (15 seconds)
Start-Sleep -Seconds 15

# Step 3: Verify status
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 status"
```

**Expected Output:**
```
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name        │ mode        │ status  │ cpu     │ mem      │ ↺      │ uptime│
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼───────┤
│ 0  │ backend     │ fork        │ online  │ 0%      │ 27MB     │ X      │ XXs   │
│ 1  │ frontend    │ fork        │ online  │ 0%      │ 52MB     │ X      │ XXs   │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴───────┘
```

### Option B: Backend Only (Recommended for Development)

Use this when developing - it saves server resources and you'll run frontend locally.

```powershell
# Step 1: Stop frontend, restart backend
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 stop frontend && pm2 restart backend && pm2 save"

# Step 2: Verify backend status
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 status"
```

**Expected Output:**
```
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name        │ mode        │ status  │ cpu     │ mem      │ ↺      │ uptime│
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼───────┤
│ 0  │ backend     │ fork        │ online  │ 0%      │ 27MB     │ X      │ XXs   │
│ 1  │ frontend    │ fork        │ stopped │ 0%      │ 0B       │ X      │ 0     │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴───────┘
```

### Option C: Frontend Only

```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend"
```

### Option D: Emergency Full Restart with Cleanup

Use this if services are stuck or not responding.

```powershell
# Step 1: Stop all services
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 delete all"

# Step 2: Clear system cache (optional, only if memory issues)
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sync && echo 3 | sudo tee /proc/sys/vm/drop_caches"

# Step 3: Restart services
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && pm2 start ecosystem.config.js"

# Step 4: Save PM2 configuration
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 save"
```

---

## 💻 Local Development Setup

### Starting Local Frontend (Recommended for Development)

**Step 1: Stop server frontend (optional but recommended)**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 stop frontend"
```

**Step 2: Start local frontend**

Use the provided batch file:
```powershell
cd C:\Projects\final_bahamm
.\START_LOCAL_FRONTEND_3000.bat
```

Or manually:
```powershell
cd C:\Projects\final_bahamm\frontend
npm run dev -- --turbo --port 3000
```

**Step 3: Wait for compilation**
```
▲ Next.js 15.2.3 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.1.X:3000

✓ Starting...
✓ Compiled in 541ms
✓ Ready in 2.7s
```

**Step 4: Access your local dev environment**
- Open: http://localhost:3000
- Changes reload in **milliseconds**! ⚡⚡

### Stopping Local Frontend

**Windows:**
1. Find the PowerShell window running the frontend
2. Press `Ctrl + C`
3. Type `Y` to confirm

Or force kill:
```powershell
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
```

---

## 🔧 After Code Changes

### If You Changed Frontend Code

**Option 1: Using Local Development (Fastest)**
- Turbopack automatically reloads
- No manual action needed!
- Changes appear in ~500ms

**Option 2: Using Server**
```powershell
# Push changes
cd C:\Projects\final_bahamm
git add .
git commit -m "Your changes"
git push

# Pull and restart on server
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git pull && pm2 restart frontend"
```

### If You Changed Backend Code

```powershell
# Push changes
cd C:\Projects\final_bahamm
git add .
git commit -m "Your changes"
git push

# Pull on server (hotload will auto-reload!)
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git pull"

# Wait 2-3 seconds for auto-reload
# No restart needed! Backend has --reload flag
```

### If You Changed Configuration Files

Configuration files require manual restart:

**`.env` files changed:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart all"
```

**`package.json` changed:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git/frontend && npm install && pm2 restart frontend"
```

**`requirements.txt` changed:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git/backend && source venv/bin/activate && pip install -r requirements.txt && pm2 restart backend"
```

**`next.config.ts` changed:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git pull && pm2 restart frontend"
```

**`ecosystem.config.js` changed:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git pull && pm2 delete all && pm2 start ecosystem.config.js && pm2 save"
```

---

## 🐛 Troubleshooting

### Issue: "502 Bad Gateway" on bahamm.ir

**Cause:** Frontend is not running on server

**Solution:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend"
```

### Issue: "404 errors in admin panel"

**Cause:** API routes not properly configured

**Solution:**
```powershell
# 1. Check next.config.ts has /api rewrite rule
# 2. Verify NEXT_PUBLIC_API_URL in .env
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cat ~/bahamm-git/frontend/.env | grep NEXT_PUBLIC"

# Should show:
# NEXT_PUBLIC_API_URL=https://bahamm.ir/backend/api

# 3. Restart frontend
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend"
```

### Issue: "Server very slow / out of memory"

**Cause:** Server RAM exhausted (usually by Next.js dev mode)

**Solution A: Use local frontend (Recommended)**
```powershell
# Stop server frontend
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 stop frontend"

# Start local
cd C:\Projects\final_bahamm
.\START_LOCAL_FRONTEND_3000.bat
```

**Solution B: Clear cache and restart**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sync && echo 3 | sudo tee /proc/sys/vm/drop_caches && pm2 restart all"
```

### Issue: "Port 3000 already in use" (Local)

**Solution:**
```powershell
# Find and kill the process
netstat -ano | findstr :3000
# Note the PID (last column)

taskkill /F /PID <PID>

# Then restart
cd C:\Projects\final_bahamm
.\START_LOCAL_FRONTEND_3000.bat
```

### Issue: Backend not reloading automatically

**Cause:** `--reload` flag missing or backend crashed

**Solution:**
```powershell
# Check if backend is running with --reload
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 info backend | grep 'script args'"

# Should show: -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# If not, restart with correct config
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && pm2 delete backend && pm2 start ecosystem.config.js --only backend && pm2 save"
```

### Issue: "ERROR: Address already in use" (Backend port 8001)

**Cause:** Old backend process still running

**Solution:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo lsof -i :8001 | grep LISTEN"
# Note the PID

ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo kill -9 <PID> && pm2 restart backend"
```

### Issue: Changes not appearing after git push

**Cause:** Code not pulled or services not restarted

**Solution:**
```powershell
# Full sync
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git pull && pm2 restart all"

# Verify latest commit
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git log --oneline -1"
```

---

## ✅ Verification Steps

### After Any Restart, Verify:

**1. Check PM2 Status**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 status"
```

Both should show `online` (or frontend `stopped` if using local dev).

**2. Check Server Resources**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "free -h && pm2 status"
```

Should have at least 500MB free RAM.

**3. Test Backend API**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "curl -s https://bahamm.ir/backend/api/health"
```

Should return: `{"status":"healthy","service":"Bahamm API"}`

**4. Test Frontend**

**If using server frontend:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "curl -s -I https://bahamm.ir | head -3"
```

Should return: `HTTP/2 200`

**If using local frontend:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
```

Should return: `StatusCode : 200`

**5. Check Hotload is Active**

**Backend:**
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs backend --lines 5 --nostream | grep 'reload\|WatchFiles'"
```

Should see: `Started reloader process [PID] using WatchFiles`

**Frontend (Local):**
Check terminal shows: `▲ Next.js 15.2.3 (Turbopack)`

**6. Test Admin Panel**
```powershell
# Server
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "curl -s https://bahamm.ir/admin-full | grep -q 'DOCTYPE' && echo '✅ Admin OK' || echo '❌ Admin Issue'"

# Local
Invoke-WebRequest -Uri "http://localhost:3000/admin-full" -UseBasicParsing
```

---

## 📊 Quick Reference Commands

### Status Checks
```powershell
# PM2 status
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 status"

# Memory usage
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "free -h"

# Backend logs (last 20 lines)
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs backend --lines 20 --nostream"

# Frontend logs (last 20 lines)
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs frontend --lines 20 --nostream"

# Check if ports are listening
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo lsof -i :8001 -i :3000"
```

### Quick Restarts
```powershell
# Restart everything
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart all"

# Restart backend only
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart backend"

# Restart frontend only
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend"

# Stop frontend (for local dev)
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 stop frontend"
```

---

## 🎯 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Production Site** | https://bahamm.ir | Live site for users |
| **Backend API** | https://bahamm.ir/backend/api | Backend API endpoint |
| **Admin Panel (Server)** | https://bahamm.ir/admin-full | Admin on server |
| **Admin Panel (Local)** | http://localhost:3000/admin-full | Admin locally (fastest!) |
| **Local Dev** | http://localhost:3000 | Local development |

---

## 📝 Environment Variables Reference

### Server Backend (.env)
```env
FRONTEND_URL=https://bahamm.ir
BACKEND_URL=https://bahamm.ir/backend
```

### Server Frontend (.env)
```env
NEXT_PUBLIC_API_URL=https://bahamm.ir/backend/api
```

### Verify Environment
```powershell
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cat ~/bahamm-git/backend/.env | grep -E '(FRONTEND_URL|BACKEND_URL)'"
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cat ~/bahamm-git/frontend/.env | grep NEXT_PUBLIC"
```

---

## ⚡ Best Practices

1. **For Development:** Always use local frontend (faster, saves server resources)
2. **For Testing Production:** Use server frontend to test exact production behavior
3. **Before Deploying:** Test locally first, then push to server
4. **If Server Slow:** Stop server frontend, use local only
5. **After Config Changes:** Always restart affected services
6. **Regular Checks:** Monitor server RAM and PM2 status
7. **Git Workflow:** Always `git pull` on server after `git push` from local

---

## 🆘 Emergency Procedures

### Complete System Reset

Only use if everything is broken:

```powershell
# 1. Stop all PM2 processes
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 delete all"

# 2. Kill any stuck processes
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sudo pkill -f 'uvicorn\|node.*next'"

# 3. Clear cache
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "sync && echo 3 | sudo tee /proc/sys/vm/drop_caches"

# 4. Pull latest code
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && git fetch && git reset --hard origin/main"

# 5. Clear frontend cache
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git/frontend && rm -rf .next node_modules/.cache"

# 6. Restart services
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "cd ~/bahamm-git && pm2 start ecosystem.config.js && pm2 save"

# 7. Wait and verify
Start-Sleep -Seconds 20
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa" "pm2 status && free -h"
```

---

## 📚 Additional Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **Next.js Turbopack**: https://nextjs.org/docs/architecture/turbopack
- **Uvicorn Auto-reload**: https://www.uvicorn.org/#command-line-options

---

**Last Updated:** December 17, 2025  
**Server:** ubuntu@188.121.103.118  
**Domain:** bahamm.ir  
**Mode:** Hybrid Hotload (Backend on Server + Frontend Local/Server)

