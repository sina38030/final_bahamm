# 🚀 Staging Environment - Complete Setup Package

## What You Have Now

I've created a **complete staging environment setup** for your Bahamm project. Everything is ready to deploy to your VPS!

## 📦 Files Created

All files are in the `deploy/` directory:

### Core Configuration Files
1. **backend-staging.service** - Systemd service for backend with auto-reload
2. **frontend-ecosystem.config.js** - PM2 config for both production and staging frontends
3. **nginx-staging.conf** - Nginx reverse proxy for staging domains

### Deployment Scripts
4. **setup-staging.sh** - Automated setup script (run once on server)
5. **deploy-to-server.ps1** - PowerShell script to upload files (Windows)
6. **deploy-to-server.sh** - Bash script to upload files (Linux/Mac)

### Operational Scripts
7. **monitor-services.sh** - Monitor all services status and health
8. **promote-staging-to-production.sh** - Deploy staging to production
9. **update-backend-cors.py** - Auto-update CORS settings (optional, already done manually)

### Documentation
10. **README.md** - Complete guide with all instructions
11. **SETUP_CHECKLIST.md** - Step-by-step verification checklist
12. **ARCHITECTURE.md** - Visual architecture and workflow explanation
13. **quick-commands.md** - Quick reference for common commands
14. **DEPLOYMENT_SUMMARY.md** - This file

## 🎯 What You Get

### Staging Environment Features
- ✅ **Backend staging** on port 8002 with auto-reload (FastAPI + Uvicorn)
- ✅ **Frontend staging** on port 3001 with hot reload (Next.js dev mode)
- ✅ **Nginx configuration** for staging.bahamm.ir and staging-api.bahamm.ir
- ✅ **Independent from production** - crashes don't affect real users
- ✅ **Same server** - no need for additional infrastructure
- ✅ **Auto-reload** - save files and see changes instantly (no restarts!)

### Supporting Tools
- ✅ Automated deployment script
- ✅ Service monitoring dashboard
- ✅ One-command promotion to production
- ✅ Complete documentation
- ✅ Troubleshooting guides

## 🚀 Quick Start (3 Options)

### Option 1: Automated (Recommended) - Windows

```powershell
cd C:\Projects\final_bahamm\deploy
.\deploy-to-server.ps1 -ServerIP YOUR_VPS_IP -ServerUser root
```

The script will upload files and offer to run setup automatically.

### Option 2: Automated - Linux/Mac

```bash
cd /path/to/final_bahamm/deploy
chmod +x deploy-to-server.sh
./deploy-to-server.sh YOUR_VPS_IP root
```

### Option 3: Manual

```bash
# Upload files
scp -r deploy/* root@YOUR_VPS_IP:/root/staging-setup/

# SSH to server
ssh root@YOUR_VPS_IP

# Run setup
cd /root/staging-setup
chmod +x setup-staging.sh
sudo ./setup-staging.sh
```

## 📋 Post-Setup Steps

After running the setup script:

### 1. Add DNS Records

Add these A records in your DNS provider:
```
staging.bahamm.ir       -> YOUR_VPS_IP
staging-api.bahamm.ir   -> YOUR_VPS_IP
```

Wait 5-10 minutes for DNS propagation.

### 2. (Optional) Setup SSL

```bash
ssh root@YOUR_VPS_IP
sudo certbot --nginx -d staging.bahamm.ir -d staging-api.bahamm.ir
```

### 3. Test Your Staging

**URLs:**
- Frontend: http://staging.bahamm.ir (or https:// after SSL)
- Backend API: http://staging-api.bahamm.ir/docs

**Quick test:**
```bash
curl http://staging-api.bahamm.ir/health
# Should return: {"status":"healthy","service":"Bahamm Backend"}
```

### 4. Connect via Remote SSH

1. Open VS Code or Cursor
2. Install "Remote - SSH" extension
3. Connect to: `root@YOUR_VPS_IP`
4. Open folder: `/srv/bahamm`
5. Edit files and watch them auto-reload!

## 🎨 Your New Workflow

### Development Cycle

```
┌─────────────────────────────────────────┐
│ 1. Connect via Remote SSH              │
│    Open /srv/bahamm/                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Edit Backend Files                   │
│    Save .py file                        │
│    ↳ Auto-restarts in ~2 seconds       │
│    ↳ Test at staging-api.bahamm.ir     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Edit Frontend Files                  │
│    Save .tsx/.ts file                   │
│    ↳ Hot reload instantly               │
│    ↳ Test at staging.bahamm.ir         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Test & Iterate                       │
│    Fix bugs, test features              │
│    Repeat until stable                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 5. Deploy to Production                 │
│    Run: promote-staging-to-production.sh│
│    ↳ Production updated safely          │
└─────────────────────────────────────────┘
```

**Time saved:** From 30-60 min per cycle → **2 seconds per change!**

## 🔍 Monitoring Your Services

### Check All Services

```bash
ssh root@YOUR_VPS_IP
cd /root/staging-setup
sudo ./monitor-services.sh
```

This shows:
- Service status (running/stopped)
- Port usage
- Health checks
- Memory usage
- Recent errors

### Individual Service Status

```bash
# Backend staging
sudo systemctl status backend-staging
sudo journalctl -u backend-staging -f

# Frontend staging
pm2 status
pm2 logs frontend-staging

# Nginx
sudo systemctl status nginx
```

## 🐛 Common Issues & Solutions

### Backend staging won't start

```bash
# Check logs
sudo journalctl -u backend-staging -n 50

# Check if port is in use
sudo lsof -i :8002

# Test manually
cd /srv/bahamm/backend
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8002 --reload
```

### Frontend staging won't start

```bash
# Check logs
pm2 logs frontend-staging --lines 50

# Check if port is in use
sudo lsof -i :3001

# Test manually
cd /srv/bahamm/frontend
npm run dev -- --port 3001
```

### Hot reload not working

**Backend:**
- Ensure `--reload` is in the service file
- Restart: `sudo systemctl restart backend-staging`

**Frontend:**
- Ensure using `npm run dev` not `npm start`
- Restart: `pm2 restart frontend-staging`

## 📊 Service Ports Reference

| Service | Port | Domain | Purpose |
|---------|------|--------|---------|
| Production Frontend | 3000 | app.bahamm.ir | Real users |
| Production Backend | 8001 | api.bahamm.ir | Real users |
| **Staging Frontend** | **3001** | **staging.bahamm.ir** | **Testing** |
| **Staging Backend** | **8002** | **staging-api.bahamm.ir** | **Testing** |

## 📝 Important Files Modified

### 1. backend/main.py (Updated)

I've already added staging CORS origins:
```python
allow_origins=[
    # ... existing origins ...
    "http://localhost:3001",  # NEW
    "https://staging.bahamm.ir",  # NEW
    "https://staging-api.bahamm.ir",  # NEW
]
```

No action needed - already done!

## 🎉 What This Solves

### Before (Your Current Pain Points)
- ❌ Change code → deploy to production → wait 30-60 min
- ❌ Crashes affect real users
- ❌ Constant restarts waste time
- ❌ Scary deployments (will it break?)

### After (With Staging)
- ✅ Change code → see results in 2 seconds
- ✅ Test safely, production users unaffected
- ✅ No manual restarts needed
- ✅ Confident deployments (already tested!)

## 📖 Documentation Guide

Start here based on your needs:

1. **Quick deployment**: Read "Quick Start" section above
2. **Step-by-step setup**: Open `SETUP_CHECKLIST.md`
3. **Understanding architecture**: Open `ARCHITECTURE.md`
4. **Common commands**: Open `quick-commands.md`
5. **Complete guide**: Open `README.md`
6. **Troubleshooting**: Check README.md troubleshooting section

## 🔄 Updating Services

### Update Backend Staging Config

```bash
sudo nano /etc/systemd/system/backend-staging.service
sudo systemctl daemon-reload
sudo systemctl restart backend-staging
```

### Update Frontend Staging Config

```bash
nano /srv/bahamm/frontend/ecosystem.config.js
pm2 stop all
pm2 start ecosystem.config.js
pm2 save
```

### Update Nginx Config

```bash
sudo nano /etc/nginx/sites-available/staging-bahamm
sudo nginx -t
sudo systemctl reload nginx
```

## 🎯 Success Criteria

You'll know everything is working when:

1. ✅ All services show as "Running"
2. ✅ You can access staging.bahamm.ir and staging-api.bahamm.ir
3. ✅ You edit a backend .py file and see it restart in ~2 seconds
4. ✅ You edit a frontend .tsx file and see the browser update instantly
5. ✅ Production still works normally (app.bahamm.ir, api.bahamm.ir)
6. ✅ You can test changes before deploying to production

## 🆘 Getting Help

If you encounter issues:

1. **Check the setup checklist**: `SETUP_CHECKLIST.md`
2. **View logs**:
   - Backend: `sudo journalctl -u backend-staging -f`
   - Frontend: `pm2 logs frontend-staging`
   - Nginx: `sudo tail -f /var/log/nginx/error.log`
3. **Run the monitor script**: `sudo ./monitor-services.sh`
4. **Check the troubleshooting section** in README.md

## 🚫 What NOT to Do

- ❌ Don't delete production services
- ❌ Don't restart production while testing staging
- ❌ Don't deploy staging to production without testing
- ❌ Don't forget to add DNS records before testing domains

## ✅ Next Steps

1. **Deploy** using one of the Quick Start options
2. **Verify** using the setup checklist
3. **Test** by editing a file and watching it reload
4. **Enjoy** your new fast development workflow!

---

## Summary of What Was Created

| Item | Purpose | Location |
|------|---------|----------|
| Systemd service | Backend staging with auto-reload | /etc/systemd/system/backend-staging.service |
| PM2 config | Frontend staging + production | /srv/bahamm/frontend/ecosystem.config.js |
| Nginx config | Reverse proxy for staging | /etc/nginx/sites-available/staging-bahamm |
| Setup script | Automated deployment | setup-staging.sh |
| Monitor script | Service health checks | monitor-services.sh |
| Deploy script | Promote staging to prod | promote-staging-to-production.sh |
| Documentation | Complete guides | README.md + others |

---

## 🎊 You're All Set!

Everything is ready to go. Just:

1. Run the deployment script
2. Add DNS records
3. Start developing with instant feedback!

**Estimated setup time**: 15-30 minutes
**Time saved per development cycle**: 28-58 minutes
**Stress reduced**: Immeasurable! 🎉

---

Need the quick start again?

**Windows:**
```powershell
cd C:\Projects\final_bahamm\deploy
.\deploy-to-server.ps1 -ServerIP YOUR_VPS_IP
```

**Linux/Mac:**
```bash
cd /path/to/final_bahamm/deploy
./deploy-to-server.sh YOUR_VPS_IP
```

Happy coding! 🚀


