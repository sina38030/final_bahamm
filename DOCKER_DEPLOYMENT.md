# Docker-Based Deployment Guide for Bahamm Platform

This guide explains how to deploy the Bahamm platform using Docker with zero-downtime and automatic rollback capabilities.

## 🎯 Benefits of Docker Deployment

- ✅ **Zero Downtime**: Services are updated one by one with health checks
- ✅ **Automatic Rollback**: Failed deployments automatically revert to previous version
- ✅ **Consistent Environment**: Same environment everywhere (dev, staging, production)
- ✅ **Easy Scaling**: Scale services independently
- ✅ **Isolated Services**: Each service runs in its own container
- ✅ **No More 502 Errors**: Proper health checks ensure services are ready before routing traffic

## 📋 Prerequisites

### On Your Server

1. **Install Docker and Docker Compose**:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Verify Installation**:
```bash
docker --version
docker-compose --version
```

## 🚀 First-Time Setup

### 1. Clone Repository on Server

```bash
cd /srv
sudo git clone https://github.com/sina38030/final_bahamm.git app
cd /srv/app
sudo chown -R ubuntu:ubuntu /srv/app
```

### 2. Create Production Environment File

```bash
cd /srv/app
cp .env.prod.example .env.prod
nano .env.prod
```

**Important**: Update these values in `.env.prod`:
- `POSTGRES_PASSWORD`: Strong database password
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `MELIPAYAMAK_API_KEY`: Your SMS API key

### 3. Set Up SSL Certificates

```bash
# Create SSL directory
mkdir -p /srv/app/nginx/ssl

# Option A: Use Let's Encrypt (Recommended for production)
sudo apt install certbot
sudo certbot certonly --standalone -d bahamm.ir -d app.bahamm.ir
sudo cp /etc/letsencrypt/live/bahamm.ir/fullchain.pem /srv/app/nginx/ssl/
sudo cp /etc/letsencrypt/live/bahamm.ir/privkey.pem /srv/app/nginx/ssl/
sudo chown -R ubuntu:ubuntu /srv/app/nginx/ssl

# Option B: Use self-signed certificate (Development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /srv/app/nginx/ssl/privkey.pem \
  -out /srv/app/nginx/ssl/fullchain.pem \
  -subj "/CN=bahamm.ir"
```

### 4. Initial Deployment

```bash
cd /srv/app
chmod +x deploy.sh
./deploy.sh
```

The deployment script will:
1. ✅ Check prerequisites
2. ✅ Pull latest code
3. ✅ Backup database
4. ✅ Build Docker images
5. ✅ Deploy services with health checks
6. ✅ Verify everything is running
7. ✅ Rollback automatically if anything fails

## 🔄 Regular Deployments

### From Your Local Machine (Windows)

```powershell
# Make sure your changes are committed and pushed
git add .
git commit -m "Your changes"
git push origin main

# Deploy to server
ssh -i "C:\Users\User\.ssh\id_rsa" ubuntu@188.121.103.118 "cd /srv/app && ./deploy.sh"
```

### Or Use the PowerShell Script

```powershell
.\deploy-remote.ps1
```

### Or Directly on the Server

```bash
cd /srv/app
./deploy.sh
```

## 📊 Monitoring and Management

### Check Service Status

```bash
cd /srv/app
docker-compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restart a Service

```bash
# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Restart frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Stop All Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Start All Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Manual Rollback

If you need to manually rollback:

```bash
cd /srv/app

# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Restore database from backup
docker-compose -f docker-compose.prod.yml up -d db
sleep 10
docker-compose -f docker-compose.prod.yml exec -T db psql -U bahamm_user bahamm < backups/backup_YYYYMMDD_HHMMSS.sql

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart SERVICE_NAME
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U bahamm_user bahamm
```

### Nginx Configuration Issues

```bash
# Test nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused containers
docker container prune

# Remove unused volumes (BE CAREFUL!)
docker volume prune
```

## 🔐 Security Best Practices

1. **Use Strong Passwords**: Always use strong passwords in `.env.prod`
2. **Keep SSL Certificates Updated**: Renew Let's Encrypt certificates every 90 days
3. **Regular Backups**: Backups are created automatically, but verify them regularly
4. **Update Docker Images**: Rebuild images regularly to get security updates
5. **Monitor Logs**: Check logs regularly for suspicious activity

## 📝 Environment Variables Reference

### Database
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password (KEEP SECRET!)
- `POSTGRES_DB`: Database name

### Backend
- `SECRET_KEY`: JWT secret key (KEEP SECRET!)
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time

### SMS Provider
- `SMS_PROVIDER`: SMS service provider
- `MELIPAYAMAK_API_KEY`: SMS API key (KEEP SECRET!)

### Frontend URLs
- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL (https://app.bahamm.ir)
- `NEXT_PUBLIC_ADMIN_API_URL`: Admin API URL (https://app.bahamm.ir)
- `NEXT_PUBLIC_SITE_URL`: Main site URL (https://bahamm.ir)
- `NEXT_PUBLIC_FRONTEND_URL`: Frontend URL (https://bahamm.ir)

## 🆘 Need Help?

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.prod.yml logs`
2. Check service status: `docker-compose -f docker-compose.prod.yml ps`
3. Try restarting: `docker-compose -f docker-compose.prod.yml restart`
4. Check disk space: `df -h`
5. Check Docker status: `systemctl status docker`

## 🎉 Success!

Once deployed, your services will be available at:
- **Frontend**: https://bahamm.ir
- **Backend API**: https://app.bahamm.ir/api
- **Health Check**: https://app.bahamm.ir/health

