# Product Images Fix - Nginx Configuration

## Problem
Product images don't show in production but work locally because nginx wasn't routing `/backend/static/` requests to the backend.

## What Was Changed
Added a new location block to `nginx_current.conf`:

```nginx
# Backend static files (for product images)
location /backend/static/ {
    rewrite ^/backend/static/(.*) /static/$1 break;
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
}
```

## How to Deploy

### Option 1: Using the deployment script (Recommended)

1. **Upload files to server:**
   ```powershell
   scp -i "C:\Users\User\.ssh\id_rsa" nginx_current.conf ubuntu@185.231.181.208:/srv/app/frontend/
   scp -i "C:\Users\User\.ssh\id_rsa" deploy_nginx_fix.sh ubuntu@185.231.181.208:/srv/app/frontend/
   ```

2. **SSH into server:**
   ```powershell
   ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
   ```

3. **Run the deployment script:**
   ```bash
   cd /srv/app/frontend
   chmod +x deploy_nginx_fix.sh
   sudo ./deploy_nginx_fix.sh
   ```

### Option 2: Manual deployment

1. **SSH into server:**
   ```powershell
   ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
   ```

2. **Upload the updated config:**
   ```bash
   cd /srv/app/frontend
   sudo cp nginx_current.conf /etc/nginx/sites-available/bahamm.ir
   ```

3. **Test the configuration:**
   ```bash
   sudo nginx -t
   ```

4. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

## Verification

After deployment, check that product images load correctly on:
- https://bahamm.ir (production site)
- Admin product pages
- Product listings

## Rollback (if needed)

If something goes wrong:
```bash
# Nginx keeps backups, restore the previous config
sudo cp /etc/nginx/sites-available/bahamm.ir.backup.* /etc/nginx/sites-available/bahamm.ir
sudo systemctl reload nginx
```

## Technical Details

- **Local environment**: FastAPI serves `/static/` directly
- **Production**: Nginx intercepts `/backend/static/` and proxies to backend's `/static/` endpoint
- **Backend port**: 8001 (as configured in nginx)
- **Image URLs**: Backend generates `https://bahamm.ir/backend/static/product_XXX/image.jpg`

