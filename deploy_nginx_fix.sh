#!/bin/bash
# Script to deploy nginx static files fix for product images

echo "=== Deploying nginx fix for product images ==="

# Navigate to app directory
cd /srv/app/frontend || { echo "Failed to navigate to /srv/app/frontend"; exit 1; }

echo "Backing up current nginx config..."
sudo cp /etc/nginx/sites-available/bahamm.ir /etc/nginx/sites-available/bahamm.ir.backup.$(date +%Y%m%d_%H%M%S)

echo "Copying updated nginx config..."
sudo cp nginx_current.conf /etc/nginx/sites-available/bahamm.ir

echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reloaded successfully!"
        echo ""
        echo "Product images should now work in production."
        echo "The fix adds routing for /backend/static/ to serve uploaded images."
    else
        echo "❌ Failed to reload nginx"
        exit 1
    fi
else
    echo "❌ Nginx config has errors. Please check the output above."
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/bahamm.ir.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/bahamm.ir
    exit 1
fi

