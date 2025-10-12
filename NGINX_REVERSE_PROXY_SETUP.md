# Nginx Reverse Proxy Setup Guide

This guide will help you set up Nginx as a reverse proxy for your Bahamm application.

## Architecture

```
Internet (HTTPS) → Nginx (Port 443)
                    ├─ Frontend → localhost:8000 (Next.js)
                    └─ /backend/api/* → localhost:8001/api/* (FastAPI)
```

## Prerequisites

- Nginx installed on your server
- SSL certificate for bahamm.ir (Let's Encrypt recommended)
- Backend running on port 8001
- Frontend running on port 8000

## Installation Steps

### 1. Install Nginx (if not already installed)

```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d bahamm.ir -d www.bahamm.ir

# Follow the prompts to complete setup
```

### 3. Deploy Nginx Configuration

```bash
# Copy the nginx config to sites-available
sudo cp nginx.conf /etc/nginx/sites-available/bahamm.ir

# Create symbolic link to sites-enabled
sudo ln -sf /etc/nginx/sites-available/bahamm.ir /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### 4. Update SSL Certificate Paths

Edit the nginx config to use your actual certificate paths:

```bash
sudo nano /etc/nginx/sites-available/bahamm.ir
```

If using Let's Encrypt, the paths should be:
```nginx
ssl_certificate /etc/letsencrypt/live/bahamm.ir/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/bahamm.ir/privkey.pem;
```

### 5. Test Nginx Configuration

```bash
sudo nginx -t
```

If you see "syntax is ok" and "test is successful", proceed to the next step.

### 6. Restart Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx  # Enable on boot
```

### 7. Verify Services Are Running

```bash
# Check if backend is running on port 8001
curl http://localhost:8001/api/health

# Check if frontend is running on port 8000
curl http://localhost:8000

# Check Nginx status
sudo systemctl status nginx
```

### 8. Update Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Or manually:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Testing

### 1. Test the Reverse Proxy

```bash
# Test backend API through proxy
curl https://bahamm.ir/backend/api/health

# Should return backend health status
```

### 2. Test from Browser

1. Open https://bahamm.ir in your browser
2. Open Developer Console (F12)
3. Check for this log:
   ```
   [API Config] Using proxy URL: https://bahamm.ir/backend/api
   ```
4. Navigate to admin-full page
5. All API calls should now work without CORS errors

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: Backend or Frontend not running

**Solution**:
```bash
# Check PM2 status
pm2 list

# Restart services
pm2 restart all

# Check logs
pm2 logs
```

### Issue: 504 Gateway Timeout

**Cause**: Backend taking too long to respond

**Solution**: Increase timeout in nginx config:
```nginx
proxy_read_timeout 120s;
```

### Issue: CORS Errors Still Appearing

**Cause**: Browser cached old build

**Solution**: Hard refresh browser (Ctrl+Shift+R)

### Issue: SSL Certificate Errors

**Cause**: Certificate not renewed or incorrect path

**Solution**:
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Restart nginx
sudo systemctl restart nginx
```

## Logs

### View Nginx Logs
```bash
# Access log
sudo tail -f /var/log/nginx/bahamm_access.log

# Error log
sudo tail -f /var/log/nginx/bahamm_error.log
```

### View Application Logs
```bash
# Backend logs
pm2 logs backend

# Frontend logs
pm2 logs frontend
```

## Automatic Certificate Renewal

Certbot automatically sets up a renewal cron job. To test it:

```bash
# Dry run renewal
sudo certbot renew --dry-run
```

## Performance Optimization

### Enable Gzip Compression

Add to your nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### Enable Caching

Add to your nginx config:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## Security Headers

Add these headers to your nginx config for better security:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## Maintenance

### Reload Nginx After Config Changes
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Check Nginx Status
```bash
sudo systemctl status nginx
```

## Need Help?

If you encounter any issues:
1. Check nginx error logs: `sudo tail -f /var/log/nginx/bahamm_error.log`
2. Check backend logs: `pm2 logs backend`
3. Verify all services are running: `pm2 list`
4. Test nginx config: `sudo nginx -t`

