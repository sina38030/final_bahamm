#!/bin/bash

# 🚀 اسکریپت خودکار تنظیم سرور Bahamm
# این اسکریپت را روی سرور اجرا کنید

set -e  # توقف در صورت خطا

echo "🚀 شروع تنظیم سرور Bahamm..."
echo "================================"

# رنگ‌ها
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# متغیرها
DOMAIN="bahamm.ir"
APP_DIR="/home/ubuntu/bahamm"
BACKEND_PORT=8001
FRONTEND_PORT=8000

# 1️⃣ آپدیت سیستم
echo -e "${GREEN}1️⃣ آپدیت سیستم...${NC}"
sudo apt update && sudo apt upgrade -y

# 2️⃣ نصب پیش‌نیازها
echo -e "${GREEN}2️⃣ نصب پیش‌نیازها...${NC}"
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx unzip curl

# نصب Node.js 20
if ! command -v node &> /dev/null; then
    echo "نصب Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node version: $(node -v)"
echo "Python version: $(python3 --version)"

# 3️⃣ استخراج پروژه
echo -e "${GREEN}3️⃣ آماده‌سازی پروژه...${NC}"
cd ~
if [ -f "bahamm-deploy.zip" ]; then
    unzip -o bahamm-deploy.zip -d bahamm
fi
mkdir -p $APP_DIR/logs

# 4️⃣ تنظیم Backend
echo -e "${GREEN}4️⃣ تنظیم Backend...${NC}"
cd $APP_DIR/backend

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# ساخت .env اگه نیست
if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
DATABASE_URL=sqlite:///./bahamm.db
SECRET_KEY=change-this-super-secret-key-in-production
ENVIRONMENT=production
FRONTEND_URL=https://bahamm.ir
BACKEND_URL=https://bahamm.ir/backend
ENVEOF
    echo "⚠️  فایل .env ساخته شد - SECRET_KEY رو تغییر بده!"
fi

deactivate

# 5️⃣ تنظیم Frontend
echo -e "${GREEN}5️⃣ تنظیم Frontend...${NC}"
cd $APP_DIR/frontend

npm install

# ساخت .env.local اگه نیست
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://bahamm.ir/backend/api
NEXT_PUBLIC_BACKEND_URL=https://bahamm.ir/backend
ENVEOF
fi

echo "Building Next.js..."
npm run build

# 6️⃣ تنظیم Nginx
echo -e "${GREEN}6️⃣ تنظیم Nginx...${NC}"

sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name bahamm.ir www.bahamm.ir;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /backend/api/ {
        rewrite ^/backend/api/(.*) /api/$1 break;
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /backend/uploads/ {
        rewrite ^/backend/uploads/(.*) /uploads/$1 break;
        proxy_pass http://127.0.0.1:8001;
    }

    client_max_body_size 50M;
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 7️⃣ ساخت سرویس‌های Systemd
echo -e "${GREEN}7️⃣ ساخت سرویس‌ها...${NC}"

# Backend Service
sudo tee /etc/systemd/system/bahamm-backend.service > /dev/null << SVCEOF
[Unit]
Description=Bahamm Backend FastAPI
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=$APP_DIR/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $BACKEND_PORT --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

# Frontend Service
sudo tee /etc/systemd/system/bahamm-frontend.service > /dev/null << SVCEOF
[Unit]
Description=Bahamm Frontend Next.js
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=$APP_DIR/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start -- -p $FRONTEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

# فعال‌سازی
sudo systemctl daemon-reload
sudo systemctl enable bahamm-backend bahamm-frontend nginx
sudo systemctl start bahamm-backend bahamm-frontend

# 8️⃣ باز کردن پورت‌ها
echo -e "${GREEN}8️⃣ تنظیم فایروال...${NC}"
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22

echo ""
echo "================================"
echo -e "${GREEN}✅ تنظیم سرور کامل شد!${NC}"
echo "================================"
echo ""
echo "📋 مراحل بعدی:"
echo "1. DNS دامنه رو به IP سرور ست کن"
echo "2. بعد از DNS، SSL بگیر:"
echo "   sudo certbot --nginx -d bahamm.ir -d www.bahamm.ir"
echo ""
echo "🔗 آدرس‌ها:"
echo "   Frontend: http://$(curl -s ifconfig.me)"
echo "   Backend:  http://$(curl -s ifconfig.me)/backend/api"
echo ""
echo "📊 چک سرویس‌ها:"
echo "   sudo systemctl status bahamm-backend"
echo "   sudo systemctl status bahamm-frontend"









