# 🚀 راهنمای کامل Deploy به سرور

## 📋 اطلاعات سرور
- **IP:** `188.121.103.118`
- **دامنه:** `bahamm.ir`
- **یوزر:** `ubuntu`

---

## 📦 مرحله 1: آپلود پروژه به سرور

### از PowerShell ویندوز:

```powershell
# آپلود کل پروژه (بدون node_modules و venv)
$excludes = @("node_modules", "venv", ".next", "__pycache__", "*.db", ".git")
scp -r C:\Projects\final_bahamm ubuntu@188.121.103.118:~/
```

**یا راحت‌تر - یک فایل zip بساز:**

```powershell
# اول zip کن (بدون فایل‌های اضافی)
cd C:\Projects\final_bahamm
Compress-Archive -Path backend, frontend, nginx.conf, bahamm-backend.service, requirements.txt -DestinationPath bahamm-deploy.zip -Force

# آپلود zip
scp bahamm-deploy.zip ubuntu@188.121.103.118:~/
```

---

## 🔧 مرحله 2: تنظیم سرور

### به سرور وصل شو:
```bash
ssh ubuntu@188.121.103.118
```

### نصب پیش‌نیازها:
```bash
# آپدیت سیستم
sudo apt update && sudo apt upgrade -y

# نصب Python و pip
sudo apt install -y python3 python3-pip python3-venv

# نصب Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# نصب Nginx
sudo apt install -y nginx

# نصب Certbot برای SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## 📂 مرحله 3: استخراج و آماده‌سازی

```bash
# استخراج zip
cd ~
unzip bahamm-deploy.zip -d bahamm
cd bahamm

# ساخت پوشه logs
mkdir -p logs
```

---

## 🐍 مرحله 4: تنظیم Backend (Python)

```bash
cd ~/bahamm/backend

# ساخت virtual environment
python3 -m venv venv
source venv/bin/activate

# نصب dependencies
pip install --upgrade pip
pip install -r requirements.txt

# ساخت فایل .env
cat > .env << 'EOF'
DATABASE_URL=sqlite:///./bahamm.db
SECRET_KEY=your-super-secret-key-change-this-in-production
ENVIRONMENT=production
FRONTEND_URL=https://bahamm.ir
BACKEND_URL=https://bahamm.ir/backend
EOF

# تست که backend کار میکنه
python -c "from app.main import app; print('✅ Backend OK')"
```

---

## ⚛️ مرحله 5: تنظیم Frontend (Next.js)

```bash
cd ~/bahamm/frontend

# نصب dependencies
npm install

# ساخت فایل .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://bahamm.ir/backend/api
NEXT_PUBLIC_BACKEND_URL=https://bahamm.ir/backend
EOF

# Build برای production
npm run build
```

---

## 🔐 مرحله 6: تنظیم SSL (قبل از Nginx)

```bash
# اول مطمئن شو DNS دامنه به IP سرور اشاره میکنه
# بعد SSL بگیر:

sudo certbot certonly --standalone -d bahamm.ir -d www.bahamm.ir --email your-email@example.com --agree-tos --non-interactive
```

---

## 🌐 مرحله 7: تنظیم Nginx

```bash
# کپی تنظیمات nginx
sudo cp ~/bahamm/nginx.conf /etc/nginx/sites-available/bahamm.ir

# لینک به sites-enabled
sudo ln -sf /etc/nginx/sites-available/bahamm.ir /etc/nginx/sites-enabled/

# حذف default config
sudo rm -f /etc/nginx/sites-enabled/default

# تست تنظیمات
sudo nginx -t

# ری‌استارت nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## ⚙️ مرحله 8: ساخت سرویس‌های Systemd

### Backend Service:
```bash
sudo cat > /etc/systemd/system/bahamm-backend.service << 'EOF'
[Unit]
Description=Bahamm Backend FastAPI
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/bahamm/backend
Environment="PATH=/home/ubuntu/bahamm/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/home/ubuntu/bahamm/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### Frontend Service:
```bash
sudo cat > /etc/systemd/system/bahamm-frontend.service << 'EOF'
[Unit]
Description=Bahamm Frontend Next.js
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/bahamm/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start -- -p 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### فعال‌سازی سرویس‌ها:
```bash
sudo systemctl daemon-reload
sudo systemctl enable bahamm-backend bahamm-frontend
sudo systemctl start bahamm-backend bahamm-frontend

# چک وضعیت
sudo systemctl status bahamm-backend
sudo systemctl status bahamm-frontend
```

---

## 🌍 مرحله 9: تنظیم DNS دامنه

در پنل دامنه (مثلاً nic.ir یا سرویس DNS):

| Type | Name | Value |
|------|------|-------|
| A | @ | 188.121.103.118 |
| A | www | 188.121.103.118 |

⏰ ممکنه تا 24 ساعت طول بکشه DNS propagate بشه.

---

## ✅ مرحله 10: تست نهایی

```bash
# تست backend
curl http://localhost:8001/api/health

# تست frontend
curl http://localhost:8000

# تست از بیرون
curl https://bahamm.ir
curl https://bahamm.ir/backend/api/health
```

---

## 🔄 دستورات مفید

### ری‌استارت سرویس‌ها:
```bash
sudo systemctl restart bahamm-backend
sudo systemctl restart bahamm-frontend
sudo systemctl restart nginx
```

### مشاهده لاگ‌ها:
```bash
# Backend logs
sudo journalctl -u bahamm-backend -f

# Frontend logs
sudo journalctl -u bahamm-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/bahamm_error.log
```

### آپدیت کد:
```bash
cd ~/bahamm

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart bahamm-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl restart bahamm-frontend
```

---

## 🚨 عیب‌یابی

### اگه سایت باز نشد:
```bash
# چک کن سرویس‌ها فعالن
sudo systemctl status bahamm-backend
sudo systemctl status bahamm-frontend
sudo systemctl status nginx

# چک پورت‌ها
sudo netstat -tlnp | grep -E "8000|8001|80|443"

# چک فایروال
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### اگه SSL کار نکرد:
```bash
# تمدید دستی
sudo certbot renew --dry-run

# یا دوباره بگیر
sudo certbot --nginx -d bahamm.ir -d www.bahamm.ir
```

---

## 📅 آخرین بروزرسانی
- **تاریخ:** 13 دسامبر 2025






