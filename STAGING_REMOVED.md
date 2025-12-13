# ✅ STAGING ENVIRONMENT REMOVED - PRODUCTION ONLY

**Date:** November 29, 2025  
**Status:** All staging configurations removed

---

## 🗑️ What Was Removed

### Deleted Files (27 files)
- All staging documentation files (*.md)
- All staging scripts (*.ps1, *.sh, *.bat)
- All staging nginx configurations
- Deploy folder staging files

### Updated Configuration Files

#### 1. `ecosystem.config.js` ✅
- ❌ Removed: `bahamm-backend-staging` (Port 8002)
- ✅ Kept: `bahamm-backend` (Port 8001) - Production only

#### 2. `deploy/frontend-ecosystem.config.js` ✅
- ❌ Removed: `frontend-staging` (Port 3003)
- ✅ Kept: `frontend` (Port 3000) - Production only

#### 3. `frontend/next.config.ts` ✅
- ❌ Removed: `allowedDevOrigins` for staging.bahamm.ir
- ❌ Removed: staging.bahamm.ir from image remote patterns
- ❌ Removed: Dynamic port selection logic (staging vs production)
- ✅ Simplified: Backend rewrites now always point to port 8001

#### 4. `backend/main.py` ✅
- ❌ Removed all staging CORS origins:
  - localhost:3001, 3002, 8002
  - 188.121.103.118:3000, 8002
  - staging.bahamm.ir
  - staging-api.bahamm.ir
- ✅ Kept production CORS origins:
  - localhost:3000, 8000
  - bahamm.ir
  - app.bahamm.ir
  - web.telegram.org
  - Cloudflare tunnel URLs

---

## 🚀 Production Configuration

### Backend (Port 8001)
```javascript
{
  name: 'bahamm-backend',
  port: 8001,
  database: '/srv/app/bahamm1.db',
  frontend_url: 'https://bahamm.ir'
}
```

### Frontend (Port 3000)
```javascript
{
  name: 'frontend',
  port: 3000,
  api_url: 'https://api.bahamm.ir',
  env: 'production'
}
```

---

## 📋 Next Steps

### Option 1: Using the Management Script (Recommended)

Run the PowerShell script:
```powershell
.\manage_production.ps1
```

Then choose from the menu:
1. Stop all staging services (if any)
2. Start production frontend
3. Restart production frontend
4. View logs
5. Check backend status

### Option 2: Manual Commands

Connect to server:
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa"
```

Stop and remove staging services:
```bash
cd /srv/app
pm2 stop frontend-staging
pm2 delete frontend-staging
pm2 stop bahamm-backend-staging
pm2 delete bahamm-backend-staging
pm2 save
```

Start/restart production frontend:
```bash
cd /srv/app/frontend/frontend
pm2 start /srv/app/frontend/deploy/frontend-ecosystem.config.js
# OR if already running:
pm2 restart frontend
pm2 save
```

Check status:
```bash
pm2 list
pm2 logs frontend --lines 50
curl http://localhost:8001/health
```

---

## 🌐 Production URLs

**Frontend:**
- https://bahamm.ir (Main site)
- https://app.bahamm.ir (Mini App)

**Backend API:**
- https://api.bahamm.ir

**Server:**
- SSH: `ubuntu@188.121.103.118`
- Frontend: Port 3000 (localhost)
- Backend: Port 8001 (localhost)

---

## ✅ Verification Checklist

After running the setup:

- [ ] Run `.\manage_production.ps1` and choose option 1 (stop staging)
- [ ] Choose option 2 or 3 (start/restart frontend)
- [ ] Verify PM2 shows only 2 processes: `frontend` and `bahamm-backend`
- [ ] Visit https://bahamm.ir to verify frontend is working
- [ ] Check backend: `curl https://api.bahamm.ir/health`
- [ ] Test Telegram bot: @Bahamm_bot

---

## 🎯 What's Running in Production

```
┌─────────────────────┬─────────┬─────────┐
│ App name            │ Port    │ Status  │
├─────────────────────┼─────────┼─────────┤
│ bahamm-backend      │ 8001    │ online  │
│ frontend            │ 3000    │ online  │
└─────────────────────┴─────────┴─────────┘
```

**No staging processes should be running!**

---

## 📝 Important Notes

1. **Database:** Production uses `/srv/app/bahamm1.db`
2. **Logs:** Located at `/srv/app/logs/`
3. **PM2 Config:** Managed by files in `/srv/app/frontend/`
4. **Nginx:** Reverse proxy routes to localhost:3000 and localhost:8001

---

## 🆘 Troubleshooting

### Frontend not starting?
```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa"
cd /srv/app/frontend/frontend
npm install  # If dependencies are missing
npm run build  # Rebuild production
pm2 restart frontend
```

### Backend issues?
```bash
pm2 logs bahamm-backend --lines 100
# Check database
sqlite3 /srv/app/bahamm1.db "PRAGMA integrity_check;"
```

### Port conflicts?
```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :8001
```

---

## 🎉 You're Done!

Your production environment is now clean with no staging configurations. 

Everything points to production only:
- ✅ Frontend on port 3000
- ✅ Backend on port 8001
- ✅ Clean CORS configuration
- ✅ Single database (bahamm1.db)

**Run `.\manage_production.ps1` to manage your server!**

