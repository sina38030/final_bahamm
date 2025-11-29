# Bahamm Staging Environment Deployment Guide

This directory contains all the configuration files needed to set up a complete staging environment alongside your production setup.

## 📁 Files in this directory

- `backend-staging.service` - Systemd service for backend staging (FastAPI with --reload)
- `frontend-ecosystem.config.js` - PM2 config for both production and staging frontends
- `nginx-staging.conf` - Nginx configuration for staging domains
- `setup-staging.sh` - Automated setup script
- `README.md` - This file

## 🚀 Quick Setup (Automated)

### Option A: Run the setup script on the server

1. **Upload these files to your server:**

```bash
# From your local machine
scp -r deploy/* root@YOUR_VPS_IP:/root/staging-setup/
```

2. **SSH into your server:**

```bash
ssh root@YOUR_VPS_IP
```

3. **Run the setup script:**

```bash
cd /root/staging-setup
chmod +x setup-staging.sh
sudo ./setup-staging.sh
```

The script will:
- ✅ Install backend staging systemd service
- ✅ Set up PM2 with both production and staging frontends
- ✅ Configure nginx for staging domains
- ✅ Start all services
- ✅ Test configurations

## 🔧 Manual Setup (Step by Step)

If you prefer to set up manually or the script fails:

### 1. Backend Staging Setup

```bash
# Copy the service file
sudo cp backend-staging.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable backend-staging

# Start the service
sudo systemctl start backend-staging

# Check status
sudo systemctl status backend-staging

# View logs
sudo journalctl -u backend-staging -f
```

### 2. Frontend Staging Setup

```bash
# Copy PM2 config
cp frontend-ecosystem.config.js /srv/bahamm/frontend/ecosystem.config.js

# Create logs directory
sudo mkdir -p /srv/bahamm/logs

# Navigate to frontend
cd /srv/bahamm/frontend

# Stop existing PM2 processes
pm2 stop all

# Start with ecosystem config
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Check status
pm2 status

# View logs
pm2 logs frontend-staging
```

### 3. Nginx Setup

```bash
# Copy nginx config
sudo cp nginx-staging.conf /etc/nginx/sites-available/staging-bahamm

# Enable the site
sudo ln -s /etc/nginx/sites-available/staging-bahamm /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

### 4. DNS Configuration

Add these A records in your DNS provider:

```
staging.bahamm.ir       -> YOUR_VPS_IP
staging-api.bahamm.ir   -> YOUR_VPS_IP
```

### 5. SSL Certificates (Optional but Recommended)

```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d staging.bahamm.ir -d staging-api.bahamm.ir

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🎯 Testing Your Staging Environment

### Backend Tests

```bash
# Health check
curl http://staging-api.bahamm.ir/health

# API documentation
# Open in browser: http://staging-api.bahamm.ir/docs
```

### Frontend Tests

```bash
# Open in browser
# http://staging.bahamm.ir
```

### Check Ports

```bash
# Verify services are running on correct ports
sudo netstat -tulpn | grep :3000  # Production frontend
sudo netstat -tulpn | grep :3001  # Staging frontend
sudo netstat -tulpn | grep :8001  # Production backend
sudo netstat -tulpn | grep :8002  # Staging backend
```

## 🛠️ Your New Development Workflow

### 1. Connect to Server

Use VS Code or Cursor Remote SSH:
- Install "Remote - SSH" extension
- Connect to: `root@YOUR_VPS_IP`
- Open folder: `/srv/bahamm`

### 2. Edit Files Directly

#### Backend Development:
- Edit files in `/srv/bahamm/backend/`
- Save any `.py` file
- Uvicorn `--reload` automatically restarts (takes ~2 seconds)
- View logs: `sudo journalctl -u backend-staging -f`

#### Frontend Development:
- Edit files in `/srv/bahamm/frontend/src/`
- Save any React/Next.js file
- Hot module replacement happens automatically
- View logs: `pm2 logs frontend-staging`

### 3. Test Your Changes

- **Frontend:** `http://staging.bahamm.ir` (or `https://` after SSL)
- **Backend API Docs:** `http://staging-api.bahamm.ir/docs`
- **Backend Health:** `http://staging-api.bahamm.ir/health`

### 4. Deploy to Production (When Ready)

```bash
# Backend
cd /srv/bahamm/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt  # if dependencies changed
sudo systemctl restart backend  # your production service

# Frontend
cd /srv/bahamm/frontend
git pull origin main
npm install  # if dependencies changed
npm run build
pm2 restart frontend  # production process
```

## 📝 Useful Commands

### Backend Staging Management

```bash
# Start/Stop/Restart
sudo systemctl start backend-staging
sudo systemctl stop backend-staging
sudo systemctl restart backend-staging

# Status & Logs
sudo systemctl status backend-staging
sudo journalctl -u backend-staging -f
sudo journalctl -u backend-staging --since today
sudo journalctl -u backend-staging -n 100
```

### Frontend Staging Management

```bash
# PM2 Commands
pm2 status
pm2 logs frontend-staging
pm2 logs frontend-staging --lines 100
pm2 restart frontend-staging
pm2 stop frontend-staging
pm2 start frontend-staging
pm2 delete frontend-staging
```

### Nginx Management

```bash
# Test & Reload
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor All Services

```bash
# Create a monitoring script
cat << 'EOF' > /root/check-staging.sh
#!/bin/bash
echo "=== Backend Staging ==="
systemctl status backend-staging | grep Active
echo ""
echo "=== Frontend PM2 ==="
pm2 status | grep frontend
echo ""
echo "=== Nginx ==="
systemctl status nginx | grep Active
echo ""
echo "=== Ports ==="
netstat -tulpn | grep -E ':(3000|3001|8001|8002)'
EOF

chmod +x /root/check-staging.sh
```

Run with: `sudo /root/check-staging.sh`

## 🐛 Troubleshooting

### Backend Staging Won't Start

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

### Frontend Staging Issues

```bash
# Check PM2 logs
pm2 logs frontend-staging --lines 50

# Check if port is in use
sudo lsof -i :3001

# Test manually
cd /srv/bahamm/frontend
npm run dev -- --port 3001
```

### Nginx Issues

```bash
# Test config
sudo nginx -t

# Check DNS resolution
nslookup staging.bahamm.ir
nslookup staging-api.bahamm.ir

# Check listening ports
sudo netstat -tulpn | grep nginx
```

### Hot Reload Not Working

**Backend:**
- Ensure `--reload` flag is in the service file
- Check file permissions on `/srv/bahamm/backend`
- Restart service: `sudo systemctl restart backend-staging`

**Frontend:**
- Ensure you're using `npm run dev` not `npm start`
- Check PM2 config has correct args
- Restart: `pm2 restart frontend-staging`

## 🔄 Updating Configuration

### Update Backend Service

```bash
# Edit the service file
sudo nano /etc/systemd/system/backend-staging.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart backend-staging
```

### Update PM2 Config

```bash
# Edit ecosystem file
nano /srv/bahamm/frontend/ecosystem.config.js

# Restart all processes
pm2 stop all
pm2 start ecosystem.config.js
pm2 save
```

### Update Nginx Config

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/staging-bahamm

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Service Ports Summary

| Service | Port | Domain |
|---------|------|--------|
| Production Frontend | 3000 | app.bahamm.ir |
| Staging Frontend | 3001 | staging.bahamm.ir |
| Production Backend | 8001 | api.bahamm.ir |
| Staging Backend | 8002 | staging-api.bahamm.ir |

## 🎉 Benefits

✅ **No More Long Cycles** - Edit and test immediately

✅ **Safe Testing** - Staging crashes don't affect production

✅ **Auto-Reload** - Changes apply without manual restarts

✅ **Same Server** - No need for separate infrastructure

✅ **Independent** - Staging and production are completely isolated

✅ **Easy Deploy** - Test in staging, then deploy to production with confidence

---

**Need help?** Check the logs first, then review this guide. Most issues are related to:
- File permissions
- Port conflicts
- DNS not propagating
- Service not enabled


