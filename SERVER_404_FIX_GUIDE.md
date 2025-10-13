# راهنمای حل مشکل 404 در Admin Panel روی سرور

## مشکل
بخش‌های مختلف admin-full روی سرور (bahamm.ir) خطای 404 می‌دهند.

## علت
درخواست‌های API از مسیر `/backend/api/` ارسال می‌شوند ولی:
- Backend ممکن است روی سرور در حال اجرا نباشد
- nginx به درستی پیکربندی نشده
- مسیرهای API به درستی proxy نمی‌شوند

---

## راه حل - مرحله به مرحله

### مرحله 1: بررسی وضعیت Backend روی سرور

```bash
# اتصال به سرور
ssh your-user@bahamm.ir

# بررسی اینکه آیا backend در حال اجرا است
ps aux | grep uvicorn
# یا
ps aux | grep python | grep backend

# بررسی پورت 8001
netstat -tlnp | grep 8001
# یا
ss -tlnp | grep 8001
```

**اگر Backend در حال اجرا نیست:**

```bash
# رفتن به پوشه پروژه
cd /path/to/final_bahamm

# فعال کردن virtual environment (اگر دارید)
source venv/bin/activate

# اجرای backend
cd backend
uvicorn main:app --host 127.0.0.1 --port 8001 &

# یا اگر فایل run_backend دارید
cd ..
nohup python backend/main.py > logs/backend.log 2>&1 &
```

---

### مرحله 2: تنظیم nginx صحیح

فایل nginx را ویرایش کنید:

```bash
sudo nano /etc/nginx/sites-available/bahamm.ir
```

محتوای صحیح nginx:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name bahamm.ir www.bahamm.ir;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bahamm.ir www.bahamm.ir;

    ssl_certificate /etc/letsencrypt/live/bahamm.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bahamm.ir/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/bahamm_access.log;
    error_log /var/log/nginx/bahamm_error.log;

    client_max_body_size 50M;

    # Backend API - مهم: بدون trailing slash
    location /backend/api {
        # حذف /backend و فرستادن فقط /api به backend
        rewrite ^/backend(/api.*)$ $1 break;
        
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers (اگر لازم است)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }

    # Backend static files (uploads)
    location /backend/uploads {
        rewrite ^/backend(/uploads.*)$ $1 break;
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**تست و ریستارت nginx:**

```bash
# تست کانفیگ
sudo nginx -t

# اگر خطا نداشت، ریستارت کنید
sudo systemctl restart nginx

# بررسی وضعیت
sudo systemctl status nginx
```

---

### مرحله 3: بررسی لاگ‌های nginx برای دیباگ

```bash
# بررسی لاگ خطا
sudo tail -f /var/log/nginx/bahamm_error.log

# بررسی لاگ دسترسی
sudo tail -f /var/log/nginx/bahamm_access.log

# در یک ترمینال دیگر، درخواست تست کنید
curl -I https://bahamm.ir/backend/api/admin/group-buys?limit=1000
```

---

### مرحله 4: اطمینان از اجرای صحیح Backend

ایجاد یک script برای اجرای پایدار backend:

```bash
# ایجاد فایل
nano /path/to/final_bahamm/start_backend_server.sh
```

محتوای فایل:

```bash
#!/bin/bash

cd /path/to/final_bahamm/backend

# Kill any existing backend process
pkill -f "uvicorn main:app"

# Wait a moment
sleep 2

# Start backend
nohup uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2 > ../logs/backend.log 2>&1 &

echo "Backend started on port 8001"
echo "Check logs: tail -f /path/to/final_bahamm/logs/backend.log"
```

اجرای script:

```bash
chmod +x start_backend_server.sh
./start_backend_server.sh
```

---

### مرحله 5: تست از مرورگر

1. باز کردن Console در مرورگر (F12)
2. رفتن به `https://bahamm.ir/admin-full`
3. بررسی درخواست‌های شبکه (Network tab)
4. باید درخواست‌ها به `/backend/api/...` برسند و پاسخ 200 بگیرند

---

### مرحله 6: اضافه کردن systemd service برای اجرای خودکار

برای اینکه backend همیشه در حال اجرا باشد:

```bash
sudo nano /etc/systemd/system/bahamm-backend.service
```

محتوا:

```ini
[Unit]
Description=Bahamm Backend FastAPI
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/final_bahamm/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

فعال کردن service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bahamm-backend
sudo systemctl start bahamm-backend
sudo systemctl status bahamm-backend
```

---

## دستورات مفید برای دیباگ

```bash
# بررسی که backend جواب می‌دهد
curl http://localhost:8001/api/health
curl http://localhost:8001/api/admin/group-buys?limit=10

# بررسی از طریق nginx
curl https://bahamm.ir/backend/api/health
curl https://bahamm.ir/backend/api/admin/group-buys?limit=10

# بررسی لاگ‌های backend
tail -f /path/to/final_bahamm/logs/backend.log

# بررسی لاگ‌های nginx
tail -f /var/log/nginx/bahamm_error.log
```

---

## چک‌لیست نهایی

- [ ] Backend روی پورت 8001 در حال اجرا است
- [ ] Frontend روی پورت 8000 در حال اجرا است  
- [ ] nginx پیکربندی شده و restart شده
- [ ] `/backend/api/health` جواب می‌دهد
- [ ] `/backend/api/admin/group-buys` جواب می‌دهد
- [ ] لاگ‌ها خطای 404 نشان نمی‌دهند
- [ ] Admin panel در مرورگر کار می‌کند

---

## توضیحات تکمیلی

### چرا `/backend/api` استفاده می‌شود؟

در فایل `admin-full/page.tsx` خطوط 56-58:
```typescript
if (hostname === 'bahamm.ir' || hostname === 'www.bahamm.ir') {
  rawBase = `${protocol}//${hostname}/backend/api`;
}
```

این تنظیمات باعث می‌شود که:
- localhost: `http://localhost:8001/api`
- production: `https://bahamm.ir/backend/api`

nginx این مسیر را به backend proxy می‌کند.

---

## اگر هنوز مشکل دارید

1. اسکرین‌شات از لاگ nginx بگیرید
2. خروجی `curl https://bahamm.ir/backend/api/health` را چک کنید
3. بررسی کنید backend database connection دارد
4. اطمینان حاصل کنید که فایروال پورت 8001 را مسدود نکرده (البته فقط از localhost قابل دسترسی باشد)

برای اطلاعات بیشتر، لاگ‌ها را بررسی کنید.

