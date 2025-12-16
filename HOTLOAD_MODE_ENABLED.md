# ⚡ Hotload Mode - ACTIVE

## ✅ Current Configuration:

### Backend:
- **Mode:** Hotload (Development)
- **Command:** `uvicorn main:app --host 0.0.0.0 --port 8001 --reload`
- **Auto-reload:** ✅ ON
- **Watches:** Python files (`.py`)

### Frontend:
- **Mode:** Development
- **Command:** `npm run dev`
- **Auto-reload:** ✅ ON  
- **Watches:** All frontend files (`.ts`, `.tsx`, `.js`, `.jsx`, `.css`)

### PM2 Startup:
- **Auto-start on boot:** ✅ Enabled
- **Config file:** `ecosystem.config.js`
- **Service:** `pm2-ubuntu.service`

---

## 🚀 Deploy Workflow:

### Every code change:

```bash
git add -A
git commit -m "your changes"
git push
```

**What happens:**
1. GitHub Actions pulls code to server (10-15 seconds)
2. Hotload detects file changes automatically
3. Services reload themselves (5-10 seconds)
4. **Total time: 15-25 seconds!** ⚡

---

## ⚠️ Important Notes:

### When hotload works:
- ✅ Code changes (`.py`, `.ts`, `.tsx`, etc.)
- ✅ Component changes
- ✅ Route changes
- ✅ Function changes

### When you need manual restart:
- ❌ `.env` file changes → Run: `ssh ubuntu@188.121.103.118 "pm2 restart all"`
- ❌ `package.json` changes → Run: `ssh ubuntu@188.121.103.118 "cd ~/bahamm-git/frontend && npm install && pm2 restart frontend"`
- ❌ `requirements.txt` changes → Run: `ssh ubuntu@188.121.103.118 "cd ~/bahamm-git/backend && source venv/bin/activate && pip install -r requirements.txt && pm2 restart backend"`

---

## 🔄 Server Restart:

If server reboots:
- ✅ PM2 auto-starts (systemd service)
- ✅ Loads `ecosystem.config.js`
- ✅ Backend starts with `--reload`
- ✅ Frontend starts with `npm run dev`
- ✅ Hotload mode preserved!

---

## 📊 Check Status:

```bash
ssh ubuntu@188.121.103.118 "pm2 status"
ssh ubuntu@188.121.103.118 "pm2 show backend"
ssh ubuntu@188.121.103.118 "pm2 show frontend"
```

---

## 🎯 Site:
https://bahamm.ir

---

**Hotload is active! Just code, commit, push - done!** ⚡

