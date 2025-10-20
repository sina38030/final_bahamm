# Fix 404 Error for Payment Callback

## Problem
Payment callback URL `https://bahamm.ir/backend/api/payment/callback` returns 404 error.

## Root Cause
Nginx location block `/backend/api` (without trailing slash) doesn't match URLs with trailing content properly. The rewrite rule was also missing the `$` anchor.

## Solution

### Step 1: Update Nginx Configuration

SSH into your server and edit the nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/bahamm.ir
```

Find the backend API proxy block (around line 11) and update it:

**BEFORE:**
```nginx
location /backend/api {
    rewrite ^/backend/api/(.*) /api/$1 break;
```

**AFTER:**
```nginx
location /backend/api/ {
    rewrite ^/backend/api/(.*)$ /api/$1 break;
```

The key changes:
1. Added trailing slash to `location /backend/api/`
2. Added `$` anchor to rewrite rule: `^/backend/api/(.*)$`

### Step 2: Test Nginx Configuration

```bash
sudo nginx -t
```

You should see:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 3: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 4: Verify the Fix

Test the callback endpoint:

```bash
curl -I https://bahamm.ir/backend/api/payment/callback?Authority=test&Status=OK
```

You should see a `303 See Other` redirect (not 404).

## Alternative: Use Direct API Path

If you prefer to bypass the `/backend/api/` proxy entirely, you can update the backend config to use `/api/` directly:

Edit `backend/app/config.py` line 39:

**CHANGE:**
```python
return f"{self.FRONTEND_URL}/backend/api"
```

**TO:**
```python
return f"{self.FRONTEND_URL}/api"
```

Then commit and deploy:

```bash
git add backend/app/config.py
git commit -m "Use direct /api/ path for payment callback"
git push origin main
```

And restart the backend:

```bash
cd /root/final_bahamm
git pull
pm2 restart bahamm-backend
```

## Verification

After applying the fix, test a complete payment flow:
1. Add items to cart
2. Proceed to checkout
3. Complete payment
4. Verify you're redirected to the correct success/invite page (not 404)

## Quick One-Liner Fix (Server-Side)

```bash
sudo sed -i 's|location /backend/api {|location /backend/api/ {|' /etc/nginx/sites-available/bahamm.ir && \
sudo sed -i 's|rewrite ^/backend/api/(.*)|rewrite ^/backend/api/(.*)$|' /etc/nginx/sites-available/bahamm.ir && \
sudo nginx -t && \
sudo systemctl reload nginx
```

