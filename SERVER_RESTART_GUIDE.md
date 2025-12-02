# Production Server Restart Guide

**Server:** 185.231.181.208  
**User:** ubuntu  
**SSH Key:** C:\Users\User\.ssh\id_rsa

---

## ⚡ QUICK RESTART COMMANDS (Copy & Paste)

### Full Restart (Both Backend & Frontend)

```powershell
# Connect and restart everything
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 stop all && pm2 delete all && cd /srv/app/backend && pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001 && cd /srv/app/frontend && PORT=3000 pm2 start npm --name frontend -- start && pm2 save"
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
cd /srv/app/frontend
PORT=3000 pm2 start npm --name frontend -- start
```

**Critical Points:**
- ✅ Set `PORT=3000` environment variable
- ✅ Use `npm start` (NOT `node .next/standalone/server.js` - standalone build doesn't exist)
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

**Solution 2:** Check for zombie node processes
```bash
ps aux | grep node
# Kill any Next.js processes
sudo pkill -f "next start"
```

**Solution 3:** Restart on different port temporarily, then switch back
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

---

## 📁 SERVER DIRECTORY STRUCTURE

```
/srv/app/
├── bahamm1.db              # SQLite database
├── backend/                # Backend Python/FastAPI
│   ├── .venv/              # Virtual environment (IMPORTANT!)
│   ├── main.py             # Entry point
│   └── app/                # Application code
└── frontend/               # Frontend Next.js
    ├── .next/              # Built files
    ├── node_modules/       # Dependencies
    └── package.json        # Project config
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
- **Entry Point:** `npm start`
- **Build Directory:** .next/

### Nginx (Reverse Proxy)
- **Port:** 443 (HTTPS)
- **Domain:** bahamm.ir
- **Frontend:** Proxies to localhost:3000
- **Backend API:** Proxies /api/* to localhost:8001

---

## 💡 IMPORTANT NOTES

1. **Never use Docker commands** - Server runs WITHOUT Docker
2. **Always use full venv path** for backend Python
3. **Port 3000 must be free** before starting frontend
4. **Check PM2 status** after any restart to ensure both services are "online"
5. **Run `pm2 save`** after successful start to persist configuration
6. **Nginx expects backend on 8001** and frontend on 3000 - don't change ports
7. **If unsure, use the Quick Restart command** at the top of this guide

---

## 🎯 SUCCESS CHECKLIST

After restart, verify:
- [ ] Backend status: `online` (not `errored` or `stopped`)
- [ ] Frontend status: `online` (not `errored` or `stopped`)
- [ ] No restarts: ↺ column should be 0 or very low
- [ ] Backend has memory: mem column > 90mb
- [ ] Frontend has memory: mem column > 50mb
- [ ] Website loads: https://bahamm.ir
- [ ] API responds: https://bahamm.ir/api/health or similar endpoint

---

## 🕐 ESTIMATED RESTART TIME

- **Quick restart (services already configured):** 5-10 seconds
- **Full restart (delete and recreate):** 30-60 seconds
- **Troubleshooting required:** 5-30 minutes (use this guide to reduce time!)

---

**Last Updated:** 2025-12-02  
**Tested and Working:** ✅

