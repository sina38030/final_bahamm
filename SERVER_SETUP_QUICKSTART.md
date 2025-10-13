# راهنمای سریع راه‌اندازی سرور Bahamm

## فایل‌های ایجاد شده

1. **SERVER_404_FIX_GUIDE.md** - راهنمای کامل حل مشکل 404
2. **nginx_server.conf** - فایل کانفیگ nginx بهینه شده
3. **start_backend_production.sh** - Script راه‌اندازی backend
4. **bahamm-backend.service** - Systemd service برای اجرای خودکار
5. **test_server_setup.sh** - Script تست کامل سیستم

---

## مراحل سریع راه‌اندازی (5 دقیقه)

### مرحله 1: کپی فایل‌ها به سرور

```bash
# روی کامپیوتر محلی
scp nginx_server.conf start_backend_production.sh bahamm-backend.service test_server_setup.sh your-user@bahamm.ir:/path/to/final_bahamm/
```

### مرحله 2: اتصال به سرور

```bash
ssh your-user@bahamm.ir
cd /path/to/final_bahamm
```

### مرحله 3: تنظیم nginx

```bash
# کپی فایل nginx
sudo cp nginx_server.conf /etc/nginx/sites-available/bahamm.ir

# ایجاد symlink
sudo ln -sf /etc/nginx/sites-available/bahamm.ir /etc/nginx/sites-enabled/

# حذف default config اگر لازم است
sudo rm -f /etc/nginx/sites-enabled/default

# تست کانفیگ
sudo nginx -t

# ریستارت nginx
sudo systemctl restart nginx
```

### مرحله 4: راه‌اندازی Backend

```bash
# ویرایش مسیر در script
nano start_backend_production.sh
# خط 7: PROJECT_DIR="/path/to/final_bahamm"  را تغییر دهید

# اجرای قابل اجرا
chmod +x start_backend_production.sh

# اجرا
./start_backend_production.sh
```

### مرحله 5: تست سیستم

```bash
# اجرای قابل اجرا
chmod +x test_server_setup.sh

# تست
./test_server_setup.sh
```

اگر همه تست‌ها OK باشند، تمام است! ✅

---

## تنظیم Systemd Service (اختیاری ولی توصیه می‌شود)

برای اجرای خودکار backend:

```bash
# 1. ویرایش فایل service
nano bahamm-backend.service

# تغییر موارد زیر:
# - User=YOUR_USERNAME
# - WorkingDirectory=/path/to/final_bahamm/backend
# - مسیر venv اگر دارید

# 2. کپی به systemd
sudo cp bahamm-backend.service /etc/systemd/system/

# 3. فعال سازی
sudo systemctl daemon-reload
sudo systemctl enable bahamm-backend
sudo systemctl start bahamm-backend

# 4. بررسی وضعیت
sudo systemctl status bahamm-backend

# 5. مشاهده logs
sudo journalctl -u bahamm-backend -f
```

---

## تست سریع از مرورگر

بعد از راه‌اندازی:

1. باز کردن `https://bahamm.ir` - باید صفحه اصلی باز شود
2. باز کردن `https://bahamm.ir/admin-full` - باید admin panel باز شود بدون 404
3. باز کردن Console مرورگر (F12) > Network tab
4. چک کردن درخواست‌های `/backend/api/...` - باید 200 یا 401 بگیرند نه 404

---

## دستورات مفید

```bash
# بررسی backend در حال اجرا است
ps aux | grep uvicorn

# بررسی پورت‌ها
ss -tlnp | grep -E "8000|8001"

# ریستارت backend (manual)
pkill -f uvicorn
./start_backend_production.sh

# ریستارت backend (systemd)
sudo systemctl restart bahamm-backend

# ریستارت nginx
sudo systemctl restart nginx

# مشاهده logs
tail -f logs/backend.log
sudo tail -f /var/log/nginx/bahamm_error.log

# تست API از command line
curl http://127.0.0.1:8001/api/health
curl https://bahamm.ir/backend/api/health
curl https://bahamm.ir/backend/api/admin/group-buys?limit=1
```

---

## عیب‌یابی سریع

### Backend نمی‌تواند start شود
```bash
# چک کردن پورت مسدود نیست
sudo lsof -i :8001
# اگر چیزی دارد از پورت استفاده می‌کند، kill کنید
sudo kill -9 PID

# چک کردن permissions
ls -la backend/
chmod +x backend/main.py
```

### Nginx خطای 502 می‌دهد
```bash
# Backend در حال اجرا نیست
./start_backend_production.sh

# یا
sudo systemctl start bahamm-backend
```

### Nginx خطای 404 می‌دهد
```bash
# مسیرهای nginx درست نیستند
sudo nginx -t
sudo tail -f /var/log/nginx/bahamm_error.log

# تست مستقیم backend
curl http://127.0.0.1:8001/api/admin/group-buys?limit=1
```

### SSL Certificate خطا می‌دهد
```bash
# Renew certificate
sudo certbot renew
sudo systemctl reload nginx
```

---

## چک‌لیست نهایی

- [ ] nginx کانفیگ جدید در `/etc/nginx/sites-available/bahamm.ir`
- [ ] nginx restart شده و بدون خطا است
- [ ] Backend روی پورت 8001 در حال اجرا است
- [ ] Frontend روی پورت 8000 در حال اجرا است (اگر لازم است)
- [ ] `curl http://127.0.0.1:8001/api/health` جواب می‌دهد
- [ ] `curl https://bahamm.ir/backend/api/health` جواب می‌دهد
- [ ] Admin panel در مرورگر بدون 404 باز می‌شود
- [ ] Systemd service نصب و فعال است (اختیاری)
- [ ] `test_server_setup.sh` همه تست‌ها OK می‌شوند

---

## مشکل هنوز حل نشد؟

اگر بعد از انجام این مراحل هنوز مشکل دارید:

1. فایل `SERVER_404_FIX_GUIDE.md` را کامل بخوانید
2. Logs را چک کنید:
   ```bash
   tail -100 logs/backend.log
   sudo tail -100 /var/log/nginx/bahamm_error.log
   ```
3. خروجی `./test_server_setup.sh` را ببینید
4. اسکرین‌شات از خطا در Console مرورگر (F12 > Network tab)

موفق باشید! 🚀

