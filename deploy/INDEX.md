# 📁 Deploy Directory - File Index

Quick reference for what each file does and when to use it.

## 🚀 Start Here First

1. **DEPLOYMENT_SUMMARY.md** ⭐
   - Overview of everything
   - Quick start commands
   - What you get

2. **README.md**
   - Complete setup guide
   - Detailed instructions
   - All commands explained

## 📄 Configuration Files (Copy to Server)

### Backend
- **backend-staging.service**
  - Systemd service file for backend staging
  - Runs FastAPI with `--reload` on port 8002
  - Goes to: `/etc/systemd/system/backend-staging.service`

### Frontend  
- **frontend-ecosystem.config.js**
  - PM2 configuration for both production and staging
  - Defines ports 3000 (prod) and 3001 (staging)
  - Goes to: `/srv/bahamm/frontend/ecosystem.config.js`

### Web Server
- **nginx-staging.conf**
  - Nginx reverse proxy for staging domains
  - Routes staging.bahamm.ir and staging-api.bahamm.ir
  - Goes to: `/etc/nginx/sites-available/staging-bahamm`

## 🤖 Deployment Scripts

### Automated Setup
- **setup-staging.sh**
  - Run this on the server to set up everything
  - Installs all services, starts them, configures nginx
  - Usage: `sudo ./setup-staging.sh`

### Upload to Server
- **deploy-to-server.ps1** (Windows PowerShell)
  - Uploads all files to your VPS from Windows
  - Usage: `.\deploy-to-server.ps1 -ServerIP YOUR_IP`

- **deploy-to-server.sh** (Linux/Mac)
  - Uploads all files to your VPS from Linux/Mac
  - Usage: `./deploy-to-server.sh YOUR_IP`

## 🔧 Operational Scripts

### Monitoring
- **monitor-services.sh**
  - Check status of all services (prod + staging)
  - Shows health, uptime, memory, errors
  - Usage: `sudo ./monitor-services.sh`

### Deployment
- **promote-staging-to-production.sh**
  - Deploy staging code to production
  - Pulls git, builds, restarts services
  - Usage: `sudo ./promote-staging-to-production.sh`

### Utilities
- **update-backend-cors.py**
  - Auto-adds staging origins to backend CORS
  - Optional (already done manually)
  - Usage: `python3 update-backend-cors.py`

## 📚 Documentation

### Getting Started
- **DEPLOYMENT_SUMMARY.md** - Start here! Quick overview
- **README.md** - Complete guide with all details
- **SETUP_CHECKLIST.md** - Step-by-step verification

### Reference
- **ARCHITECTURE.md** - Visual diagrams and architecture
- **quick-commands.md** - Command cheat sheet
- **INDEX.md** - This file

## 📋 Typical Workflow

### First Time Setup

```bash
# 1. Upload files to server
.\deploy-to-server.ps1 -ServerIP YOUR_IP    # Windows
# OR
./deploy-to-server.sh YOUR_IP               # Linux/Mac

# 2. SSH to server
ssh root@YOUR_IP

# 3. Run setup
cd /root/staging-setup
chmod +x setup-staging.sh
sudo ./setup-staging.sh

# 4. Add DNS records (in your DNS provider web interface)
staging.bahamm.ir       -> YOUR_IP
staging-api.bahamm.ir   -> YOUR_IP

# 5. (Optional) Setup SSL
sudo certbot --nginx -d staging.bahamm.ir -d staging-api.bahamm.ir

# 6. Test!
curl http://staging-api.bahamm.ir/health
```

### Daily Development

```bash
# 1. Connect via Remote SSH (in VS Code/Cursor)
# 2. Edit files in /srv/bahamm/backend/ or /srv/bahamm/frontend/
# 3. Save → Watch auto-reload happen
# 4. Test at staging.bahamm.ir and staging-api.bahamm.ir
# 5. When stable: ./promote-staging-to-production.sh
```

### Monitoring

```bash
# Quick check all services
sudo ./monitor-services.sh

# View specific logs
sudo journalctl -u backend-staging -f
pm2 logs frontend-staging

# Check specific service
sudo systemctl status backend-staging
pm2 status
```

## 🎯 File Purpose Summary

| File | Type | Purpose | Run Where |
|------|------|---------|-----------|
| backend-staging.service | Config | Backend staging systemd service | Server |
| frontend-ecosystem.config.js | Config | PM2 config for frontends | Server |
| nginx-staging.conf | Config | Nginx reverse proxy | Server |
| setup-staging.sh | Script | Automated setup (run once) | Server |
| deploy-to-server.ps1 | Script | Upload files from Windows | Local PC |
| deploy-to-server.sh | Script | Upload files from Linux/Mac | Local PC |
| monitor-services.sh | Script | Check service health | Server |
| promote-staging-to-production.sh | Script | Deploy to production | Server |
| update-backend-cors.py | Script | Update CORS (optional) | Local/Server |
| DEPLOYMENT_SUMMARY.md | Docs | Quick start guide | Read locally |
| README.md | Docs | Complete setup guide | Read locally |
| SETUP_CHECKLIST.md | Docs | Verification checklist | Follow along |
| ARCHITECTURE.md | Docs | Visual architecture | Reference |
| quick-commands.md | Docs | Command reference | Reference |
| INDEX.md | Docs | This file | Reference |

## 🔢 Setup Steps (Numbered)

1. **Read** DEPLOYMENT_SUMMARY.md (5 min)
2. **Upload** files using deploy-to-server script (2 min)
3. **Run** setup-staging.sh on server (5 min)
4. **Add** DNS records (5 min + propagation time)
5. **Setup** SSL certificates with certbot (3 min)
6. **Test** staging URLs (2 min)
7. **Connect** via Remote SSH and start coding! (ongoing)

**Total time**: ~20-30 minutes

## 📊 What Gets Installed Where

```
Server: /srv/bahamm/
├── backend/                    (your existing code)
├── frontend/
│   └── ecosystem.config.js     ← NEW (from deploy/)
└── logs/                       ← NEW (created by setup)

Server: /etc/systemd/system/
├── backend.service             (your existing)
└── backend-staging.service     ← NEW (from deploy/)

Server: /etc/nginx/sites-available/
├── bahamm                      (your existing)
└── staging-bahamm              ← NEW (from deploy/)

Server: /etc/nginx/sites-enabled/
└── staging-bahamm → ../sites-available/staging-bahamm  ← NEW

Server: /root/staging-setup/    ← All deploy/ files uploaded here
├── setup-staging.sh
├── monitor-services.sh
├── promote-staging-to-production.sh
└── (other scripts and docs)
```

## ⚙️ Services Created

| Service Name | Type | Port | Command |
|--------------|------|------|---------|
| backend-staging | systemd | 8002 | `sudo systemctl [start|stop|restart] backend-staging` |
| frontend-staging | PM2 | 3001 | `pm2 [start|stop|restart] frontend-staging` |

## 🌐 URLs Created

| URL | Points To | Purpose |
|-----|-----------|---------|
| http://staging.bahamm.ir | 127.0.0.1:3001 | Frontend staging |
| http://staging-api.bahamm.ir | 127.0.0.1:8002 | Backend staging |
| http://staging-api.bahamm.ir/docs | FastAPI Swagger UI | API testing |
| http://staging-api.bahamm.ir/health | Health endpoint | Quick check |

(After SSL: replace `http://` with `https://`)

## 🎓 Learning Path

**If you're new to this:**

1. Read DEPLOYMENT_SUMMARY.md
2. Follow SETUP_CHECKLIST.md step by step
3. Use quick-commands.md as reference
4. Read ARCHITECTURE.md to understand how it works

**If you're experienced:**

1. Glance at DEPLOYMENT_SUMMARY.md
2. Run deploy-to-server script
3. SSH and run setup-staging.sh
4. Done!

## 🔍 Finding Information

**"How do I deploy this?"**
→ DEPLOYMENT_SUMMARY.md or README.md

**"What ports are used?"**
→ ARCHITECTURE.md or quick-commands.md

**"How do I check if it's working?"**
→ SETUP_CHECKLIST.md or monitor-services.sh

**"What command restarts backend staging?"**
→ quick-commands.md

**"How do I deploy to production?"**
→ Run promote-staging-to-production.sh

**"What if something breaks?"**
→ README.md troubleshooting section

## ✅ Quick Verification

After setup, verify with these commands:

```bash
# All services running?
sudo systemctl status backend-staging
pm2 status

# All ports listening?
sudo netstat -tulpn | grep -E ':(3000|3001|8001|8002)'

# Health checks pass?
curl http://127.0.0.1:8002/health
curl http://127.0.0.1:3001

# DNS resolving?
nslookup staging.bahamm.ir

# Public URLs work?
curl http://staging-api.bahamm.ir/health
```

All should return success! ✅

## 📞 Help & Support

**Logs to check:**
- Backend: `sudo journalctl -u backend-staging -f`
- Frontend: `pm2 logs frontend-staging`
- Nginx: `sudo tail -f /var/log/nginx/error.log`

**Health check:**
```bash
sudo ./monitor-services.sh
```

**Common issues:**
See "Troubleshooting" in README.md

---

## 🎉 You're Ready!

Pick your path:
- **Quick start**: DEPLOYMENT_SUMMARY.md → deploy-to-server.ps1 → done!
- **Careful setup**: README.md → SETUP_CHECKLIST.md → verify each step
- **Just commands**: quick-commands.md → copy/paste

Happy deploying! 🚀


