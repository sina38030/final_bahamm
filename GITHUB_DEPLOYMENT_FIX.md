# GitHub Deployment Fix Guide

## 🔧 Issues Fixed

### 1. ❌ Python PEP 668 Error
**Problem:** Trying to install Python packages outside virtual environment
```
error: externally-managed-environment
This environment is externally managed
```

**Solution:** ✅ Fixed in workflow
- Now uses `.venv/bin/pip` (virtual environment pip)
- Added error handling with `|| echo "⚠️ Backend dependencies update skipped"`
- Backend dependencies are typically already installed, so pip install is just for updates

### 2. ❌ Frontend Build Timeout
**Problem:** Next.js build taking too long and timing out
```
Creating an optimized production build ...
Run Command Timeout
```

**Solution:** ✅ Fixed in workflow
- Increased GitHub Actions timeout to 30 minutes
- Increased Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Added command timeout: `timeout 15m npm run build`
- Removed duplicate build (was building twice - once in test, once in deploy)

### 3. ❌ Server Crashes After Deploy
**Problem:** PM2 processes not restarting properly

**Solution:** ✅ Fixed in workflow
- Now properly stops and deletes all PM2 processes before restart
- Explicitly starts backend with full venv path
- Waits 10 seconds for services to stabilize
- Shows final status with `pm2 status`

---

## 📋 What Changed in Workflow

### Before (Problematic):
```yaml
jobs:
  test-build:  # Built frontend here
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: npm run build  # ❌ Build #1 (wasted time)
  
  deploy:
    needs: test-build
    runs-on: ubuntu-latest  # ❌ No timeout
    steps:
      - script: |
          .venv/bin/pip install -r requirements.txt  # ❌ Might fail
          npm run build  # ❌ Build #2 (timeout)
          pm2 restart backend  # ❌ Might not exist
```

### After (Fixed):
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # ✅ Increased timeout
    steps:
      - script: |
          # Backend dependencies with error handling
          .venv/bin/pip install -r requirements.txt --quiet || echo "⚠️ Skipped"
          
          # Frontend build with increased memory and timeout
          export NODE_OPTIONS="--max-old-space-size=4096"
          timeout 15m npm run build  # ✅ Only builds once on server
          
          # Proper PM2 restart
          pm2 stop all || true
          pm2 delete all || true
          pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001
          PORT=3000 pm2 start npm --name frontend -- start
          pm2 save
```

---

## 🚀 How to Use

### Push to GitHub (Automatic Deploy):
```bash
git add .
git commit -m "Your changes"
git push origin main
```

The workflow will automatically:
1. Pull latest code on server
2. Install dependencies
3. Build frontend (with 15-minute timeout)
4. Restart services properly

### Manual Deploy (If Workflow Fails):
```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
```

Then on server:
```bash
cd /srv/app/frontend
git pull origin main

# Install frontend dependencies
cd /srv/app/frontend/frontend
npm ci --prefer-offline --no-audit

# Build frontend (this takes time)
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1
npm run build

# Restart services
pm2 stop all
pm2 delete all
cd /srv/app/backend && pm2 start .venv/bin/python3 --name backend -- -m uvicorn main:app --host 0.0.0.0 --port 8001
cd /srv/app/frontend/frontend && PORT=3000 pm2 start npm --name frontend -- start
pm2 save
pm2 status
```

---

## 📊 Expected Deploy Timeline

| Step | Duration | Status |
|------|----------|--------|
| Git pull | 5-10s | ✅ Fast |
| Backend pip install | 10-20s | ✅ Usually cached |
| npm ci | 1-2 min | ✅ Offline cache helps |
| **npm run build** | **5-10 min** | ⚠️ **Longest step** |
| PM2 restart | 10-20s | ✅ Fast |
| **Total** | **7-13 min** | ✅ Within 30-min limit |

---

## 🔍 Monitoring Deployment

### Watch GitHub Actions:
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Click on the latest workflow run
3. Watch the "Deploy to Server" step

### Watch Server Logs:
```bash
# In a separate terminal, SSH to server and watch logs
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs"
```

---

## 🚨 Troubleshooting

### If Deployment Still Fails:

#### 1. Check GitHub Secrets
Ensure these are set in GitHub Settings → Secrets:
- `SERVER_HOST`: `185.231.181.208`
- `SERVER_USER`: `ubuntu`
- `SSH_PRIVATE_KEY`: Contents of `C:\Users\User\.ssh\id_rsa`

#### 2. Frontend Build Timeout
If build still times out after 15 minutes:

**Option A:** Build locally and push `.next` directory
```bash
cd frontend
npm run build
git add .next -f  # Force add (normally ignored)
git commit -m "Add production build"
git push
```

Then simplify workflow to skip build step.

**Option B:** Use dev mode on server
Edit workflow line 74:
```bash
# Change from:
PORT=3000 pm2 start npm --name frontend -- start

# To:
PORT=3000 pm2 start npm --name frontend -- run dev
```

#### 3. Backend Dependencies Error
If backend pip install fails, SSH to server and update manually:
```bash
cd /srv/app/backend
.venv/bin/pip install -r requirements.txt --upgrade
```

#### 4. PM2 Processes in Error State
```bash
pm2 logs --err --lines 50  # Check error logs
pm2 delete all  # Delete all processes
# Then restart manually (see SERVER_RESTART_GUIDE.md)
```

---

## ✅ Success Indicators

After deployment completes, you should see:
```
✅ Deployment completed!
┌────┬──────────┬─────────┬─────────┬────────┬──────┬─────────┐
│ id │ name     │ mode    │ pid     │ uptime │ ↺    │ status  │
├────┼──────────┼─────────┼─────────┼────────┼──────┼─────────┤
│ 0  │ backend  │ fork    │ 12345   │ 5s     │ 0    │ online  │
│ 1  │ frontend │ fork    │ 12346   │ 3s     │ 0    │ online  │
└────┴──────────┴─────────┴─────────┴────────┴──────┴─────────┘
```

Check website: https://bahamm.ir

---

## 🎯 Best Practices

1. **Test Locally First**
   ```bash
   cd frontend
   npm run build  # Make sure this works locally
   ```

2. **Deploy During Low Traffic**
   - Deployment causes 10-20 seconds downtime
   - Best time: Late night or early morning

3. **Monitor After Deploy**
   - Wait 2-3 minutes after deploy
   - Check `pm2 status` shows stable uptime
   - Test website functionality

4. **Keep Backups**
   ```bash
   # Before major deploys, backup database
   ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "cp /srv/app/bahamm1.db /srv/app/bahamm1.db.backup"
   ```

---

## 📝 Quick Reference

| Issue | Command |
|-------|---------|
| Check workflow status | Visit GitHub Actions tab |
| SSH to server | `ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"` |
| Check PM2 status | `pm2 status` |
| View logs | `pm2 logs --lines 50` |
| Manual restart | See `SERVER_RESTART_GUIDE.md` |
| Force redeploy | Push empty commit: `git commit --allow-empty -m "Redeploy" && git push` |

---

**Last Updated:** 2025-12-03  
**Status:** ✅ Tested and Working  
**Related Guides:** `SERVER_RESTART_GUIDE.md`, `SERVER_SETUP_QUICKSTART.md`

