# Quick Command Reference

## 🚀 Deployment Commands

### From Windows (PowerShell):
```powershell
cd C:\Projects\final_bahamm\deploy
.\deploy-to-server.ps1 -ServerIP YOUR_VPS_IP -ServerUser root
```

### From Linux/Mac:
```bash
cd /path/to/final_bahamm/deploy
chmod +x deploy-to-server.sh
./deploy-to-server.sh YOUR_VPS_IP root
```

### Manual Upload:
```bash
scp -r deploy/* root@YOUR_VPS_IP:/root/staging-setup/
ssh root@YOUR_VPS_IP
cd /root/staging-setup
chmod +x setup-staging.sh
sudo ./setup-staging.sh
```

---

## 📊 Service Management Commands

### Backend Staging

```bash
# Start/Stop/Restart
sudo systemctl start backend-staging
sudo systemctl stop backend-staging
sudo systemctl restart backend-staging

# Status
sudo systemctl status backend-staging

# Logs (follow)
sudo journalctl -u backend-staging -f

# Logs (last 50 lines)
sudo journalctl -u backend-staging -n 50

# Logs (today)
sudo journalctl -u backend-staging --since today
```

### Frontend Staging (PM2)

```bash
# Status
pm2 status

# Logs (follow)
pm2 logs frontend-staging

# Logs (last 100 lines)
pm2 logs frontend-staging --lines 100

# Restart
pm2 restart frontend-staging

# Stop
pm2 stop frontend-staging

# Start
pm2 start frontend-staging

# Restart all
pm2 restart all
```

### Nginx

```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔍 Debugging Commands

### Check if ports are in use

```bash
sudo netstat -tulpn | grep :3000  # Production frontend
sudo netstat -tulpn | grep :3001  # Staging frontend
sudo netstat -tulpn | grep :8001  # Production backend
sudo netstat -tulpn | grep :8002  # Staging backend
```

### Check processes

```bash
# All listening ports
sudo netstat -tulpn

# Check specific process
sudo lsof -i :8002
```

### Test services locally

```bash
# Backend health
curl http://127.0.0.1:8002/health
curl http://127.0.0.1:8002/api/health

# Frontend
curl http://127.0.0.1:3001
```

### DNS checks

```bash
nslookup staging.bahamm.ir
nslookup staging-api.bahamm.ir
```

---

## 🔧 Configuration Edits

### Backend Service

```bash
sudo nano /etc/systemd/system/backend-staging.service
sudo systemctl daemon-reload
sudo systemctl restart backend-staging
```

### PM2 Ecosystem

```bash
nano /srv/bahamm/frontend/ecosystem.config.js
pm2 stop all
pm2 start ecosystem.config.js
pm2 save
```

### Nginx

```bash
sudo nano /etc/nginx/sites-available/staging-bahamm
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Testing URLs

### Staging

- Frontend: http://staging.bahamm.ir
- Backend Health: http://staging-api.bahamm.ir/health
- Backend API Root: http://staging-api.bahamm.ir/api
- Backend Docs: http://staging-api.bahamm.ir/docs

### Production

- Frontend: http://app.bahamm.ir
- Backend Health: http://api.bahamm.ir/health
- Backend API Root: http://api.bahamm.ir/api
- Backend Docs: http://api.bahamm.ir/docs

---

## 🔐 SSL Setup

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d staging.bahamm.ir -d staging-api.bahamm.ir

# Test renewal
sudo certbot renew --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal
```

---

## 📝 Quick Status Check Script

Create and run this:

```bash
cat << 'EOF' > /root/check-all.sh
#!/bin/bash
echo "==================================="
echo "Backend Staging:"
systemctl is-active backend-staging && echo "✓ Running" || echo "✗ Stopped"
echo ""
echo "Frontend PM2:"
pm2 status | grep frontend
echo ""
echo "Nginx:"
systemctl is-active nginx && echo "✓ Running" || echo "✗ Stopped"
echo ""
echo "Ports:"
netstat -tulpn | grep -E ':(3000|3001|8001|8002)' | awk '{print $4, $7}'
echo "==================================="
EOF

chmod +x /root/check-all.sh
```

Run: `sudo /root/check-all.sh`

---

## 🔄 Deploy to Production (After Staging Tests)

```bash
# Backend
cd /srv/bahamm/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart backend

# Frontend
cd /srv/bahamm/frontend
git pull origin main
npm install
npm run build
pm2 restart frontend
```

---

## 🧹 Cleanup / Removal

If you want to remove staging:

```bash
# Stop and disable services
sudo systemctl stop backend-staging
sudo systemctl disable backend-staging
sudo rm /etc/systemd/system/backend-staging.service
sudo systemctl daemon-reload

# Remove PM2 staging process
pm2 delete frontend-staging
pm2 save

# Remove nginx config
sudo rm /etc/nginx/sites-enabled/staging-bahamm
sudo rm /etc/nginx/sites-available/staging-bahamm
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📞 Emergency Stop All

```bash
# Stop everything
sudo systemctl stop backend-staging
pm2 stop all
sudo systemctl stop nginx

# Start everything
sudo systemctl start backend-staging
pm2 start all
sudo systemctl start nginx
```


