# 🔧 رفع مشکل Redirect به Localhost بعد از پرداخت

## ❌ مشکل
بعد از پرداخت در سایت bahamm.ir یا mini app، کاربر به `localhost:3000` redirect می‌شد به جای `https://bahamm.ir`.

## 🔍 علت
در فایل `backend/app/config.py`، مقدار پیش‌فرض `FRONTEND_URL` روی `http://localhost:3000` بود:

```python
# قبل (اشتباه):
FRONTEND_URL: str = "http://localhost:3000"  # Will use env var in production
```

حتی اگر environment variable در PM2 (`ecosystem.config.js`) درست تنظیم شده بود، ممکن بود backend آن را نخواند.

## ✅ راه حل اعمال شده

### 1️⃣ تغییر مقدار پیش‌فرض در Config

فایل `backend/app/config.py` را تغییر دادم:

```python
# بعد (درست):
FRONTEND_URL: str = "https://bahamm.ir"  # Can use env var for local dev: http://localhost:3000
```

**حالا:**
- ✅ در production: پیش‌فرض `https://bahamm.ir` است
- ✅ در development: می‌تونید با `.env` یا environment variable به `localhost` تغییرش بدید

## 🚀 نحوه Deploy

### مرحله 1: Push تغییرات به Git

```bash
# از پوشه پروژه
git add backend/app/config.py
git commit -m "Fix: Change default FRONTEND_URL to production domain"
git push origin main
```

### مرحله 2: Deploy در سرور

SSH به سرور بزنید:

```bash
ssh root@YOUR_SERVER_IP

# به پوشه پروژه برید
cd /srv/app/frontend

# Pull آخرین تغییرات
git pull origin main

# Restart backend
pm2 restart bahamm-backend

# چک کردن لاگ‌ها
pm2 logs bahamm-backend --lines 50
```

### مرحله 3: بررسی لاگ‌ها

در لاگ‌های backend باید این خط‌ها رو ببینید:

```
🔧 Payment Routes Configuration:
   FRONTEND_URL: https://bahamm.ir
   get_frontend_public_url: https://bahamm.ir
   get_payment_callback_base_url: https://bahamm.ir/backend/api
```

اگر هنوز `localhost` می‌بینید، این دستورات رو اجرا کنید:

```bash
# ایجاد فایل .env در سرور
cd /srv/app/frontend/backend
cat > .env << 'EOF'
FRONTEND_URL=https://bahamm.ir
EOF

# Restart دوباره
pm2 restart bahamm-backend
pm2 logs bahamm-backend --lines 50
```

## ✅ تست کردن

### تست 1: چک کردن URL های تشکیل شده

در لاگ backend (بعد از restart) باید ببینید:
```
FRONTEND_URL: https://bahamm.ir
get_frontend_public_url: https://bahamm.ir
get_payment_callback_base_url: https://bahamm.ir/backend/api
```

### تست 2: پرداخت واقعی

1. به `https://bahamm.ir` یا mini app برید
2. یک محصول به سبد خرید اضافه کنید
3. checkout کنید و پرداخت کنید
4. بعد از پرداخت، باید به یکی از این صفحات redirect بشید:
   - ✅ لیدر گروه: `https://bahamm.ir/invite?authority=...`
   - ✅ کاربر invited: `https://bahamm.ir/payment/success/invitee?authority=...`
   - ✅ خرید solo: `https://bahamm.ir/payment/success?authority=...`

### تست 3: چک کردن Payment Authority

```bash
# روی سرور
cd /srv/app/frontend/backend
sqlite3 /srv/app/bahamm1.db

# این query رو اجرا کنید
SELECT id, payment_authority, order_type, group_order_id, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

.exit
```

## 🔧 Development محلی

اگر می‌خواهید روی سیستم محلی کار کنید، یک فایل `.env` در پوشه `backend/` بسازید:

```bash
# backend/.env
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./bahamm1.db
SMS_FORCE_TEST_MODE=True
```

این باعث می‌شه که در development، backend از localhost استفاده کنه.

## 📝 فایل‌های تغییر یافته

- ✅ `backend/app/config.py` - خط 23 (FRONTEND_URL default value)

## 🎯 نتیجه

بعد از این تغییرات:
1. ✅ پرداخت‌های جدید به `https://bahamm.ir` redirect می‌شن (نه localhost)
2. ✅ Mini app هم درست کار می‌کنه
3. ✅ گروه‌ها و invited users به صفحات صحیح redirect می‌شن
4. ✅ Development محلی همچنان با `.env` کار می‌کنه

## 🆘 اگر هنوز مشکل دارید

اگر بعد از این تغییرات هنوز به localhost redirect می‌شید:

1. **چک کنید Nginx config:**
   ```bash
   sudo nginx -t
   sudo cat /etc/nginx/sites-available/bahamm.ir
   ```

2. **چک کنید backend واقعاً restart شده:**
   ```bash
   pm2 restart bahamm-backend
   pm2 list
   pm2 logs bahamm-backend --lines 100
   ```

3. **چک کنید ZarinPal callback URL:**
   - به داشبورد ZarinPal برید
   - مطمئن بشید که callback URL روی `https://bahamm.ir/backend/api/payment/callback` تنظیم شده

4. **Browser cache رو پاک کنید:**
   - Ctrl+Shift+Delete
   - Clear all cookies and cache

---

**آخرین بروزرسانی:** 29 نوامبر 2025  
**وضعیت:** ✅ آماده برای Deploy

