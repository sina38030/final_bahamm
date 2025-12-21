# 🔧 رفع مشکل Redirect درگاه بانکی (Localhost vs Production)

## ❌ مشکل
کاربر وقتی از **localhost** به درگاه بانکی می‌رفت و پرداخت می‌کرد، بعد از پرداخت به **bahamm.ir** ریدایرکت می‌شد (به جای localhost).

## 🎯 رفتار مورد انتظار
- ✅ **Localhost**: بعد از پرداخت → ریدایرکت به `http://localhost:3000`
- ✅ **Production**: بعد از پرداخت → ریدایرکت به `https://bahamm.ir`

---

## 🔍 علت مشکل

در فایل `backend/app/config.py`، مقدار پیش‌فرض `FRONTEND_URL` روی `https://bahamm.ir` بود:

```python
# قبل (اشتباه):
FRONTEND_URL: str = "https://bahamm.ir"  # Can use env var for local dev: http://localhost:3000
```

این باعث می‌شد که حتی در localhost، همیشه به bahamm.ir ریدایرکت بشه.

---

## ✅ راه حل اعمال شده

### 1️⃣ تغییر مقدار پیش‌فرض در `backend/app/config.py`

```python
# بعد (درست):
FRONTEND_URL: str = "http://localhost:3000"  # IMPORTANT: Set to https://bahamm.ir in production via .env
```

**حالا:**
- ✅ **Development (localhost)**: پیش‌فرض `http://localhost:3000` است
- ✅ **Production**: از environment variable استفاده می‌کنه

### 2️⃣ اضافه کردن Environment Variable به `ecosystem.config.js`

```javascript
env: {
  PYTHONUNBUFFERED: '1',
  FRONTEND_URL: 'https://bahamm.ir',  // ← این خط اضافه شد
}
```

این باعث می‌شه که در سرور production، backend از `https://bahamm.ir` استفاده کنه.

### 3️⃣ به‌روزرسانی `backend/env.example`

یک کامنت توضیحی اضافه شد:

```bash
# IMPORTANT: Set FRONTEND_URL for production (default is http://localhost:3000 for dev)
FRONTEND_URL=https://bahamm.ir
```

---

## 🚀 نحوه Deploy

### مرحله 1: تست در Localhost

قبل از deploy، مطمئن بشید که در localhost درست کار می‌کنه:

```powershell
# از پوشه backend
cd C:\Projects\final_bahamm\backend

# اجرای backend (بدون environment variable)
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

حالا:
1. به `http://localhost:3000` برید
2. یک محصول به سبد خرید اضافه کنید
3. checkout کنید
4. بعد از پرداخت، باید به `http://localhost:3000/...` ریدایرکت بشید (نه bahamm.ir)

### مرحله 2: Push تغییرات به Git

```powershell
cd C:\Projects\final_bahamm

# چک کردن تغییرات
git status

# اضافه کردن فایل‌های تغییر یافته
git add backend/app/config.py
git add ecosystem.config.js
git add backend/env.example
git add FIX_PAYMENT_REDIRECT_LOCALHOST_VS_PRODUCTION.md

# Commit
git commit -m "Fix: Payment redirect based on environment (localhost vs production)"

# Push
git push origin main
```

### مرحله 3: Deploy در سرور Production

SSH به سرور بزنید:

```bash
ssh ubuntu@188.121.103.118 -i "C:\Users\User\.ssh\id_rsa"

# به پوشه پروژه برید
cd /home/ubuntu/bahamm-git

# Pull آخرین تغییرات
git pull origin main

# Restart backend با PM2
pm2 restart backend

# چک کردن لاگ‌ها
pm2 logs backend --lines 50
```

### مرحله 4: بررسی لاگ‌ها

در لاگ‌های backend باید این خط‌ها رو ببینید:

```
🔧 Payment Routes Configuration:
   FRONTEND_URL: https://bahamm.ir
   get_frontend_public_url: https://bahamm.ir
   get_payment_callback_base_url: https://bahamm.ir/backend/api
```

اگر هنوز `localhost` می‌بینید، یعنی environment variable درست لود نشده. در این صورت:

```bash
# چک کردن environment variables در PM2
pm2 env backend

# اگر FRONTEND_URL نبود، باید دستی تنظیم کنید:
pm2 delete backend
pm2 start ecosystem.config.js --only backend
pm2 save
```

---

## ✅ تست کردن

### تست 1: Localhost

1. Backend رو بدون environment variable اجرا کنید
2. به `http://localhost:3000` برید
3. پرداخت کنید
4. بعد از پرداخت، باید به `http://localhost:3000/...` ریدایرکت بشید

### تست 2: Production

1. به `https://bahamm.ir` برید
2. پرداخت کنید
3. بعد از پرداخت، باید به `https://bahamm.ir/...` ریدایرکت بشید

### تست 3: Mini App

1. Mini app رو باز کنید
2. پرداخت کنید
3. بعد از پرداخت، باید به `https://bahamm.ir/...` ریدایرکت بشید (نه localhost)

---

## 📝 فایل‌های تغییر یافته

1. ✅ `backend/app/config.py` - خط 27 (تغییر مقدار پیش‌فرض FRONTEND_URL)
2. ✅ `ecosystem.config.js` - خط 13 (اضافه کردن FRONTEND_URL به env)
3. ✅ `backend/env.example` - خط 25 (اضافه کردن کامنت توضیحی)

---

## 🎯 نتیجه

بعد از این تغییرات:
1. ✅ در **localhost**: بعد از پرداخت به localhost ریدایرکت می‌شه
2. ✅ در **production**: بعد از پرداخت به bahamm.ir ریدایرکت می‌شه
3. ✅ **Mini app**: درست کار می‌کنه
4. ✅ **گروه‌ها و invited users**: به صفحات صحیح redirect می‌شن

---

## 🆘 اگر هنوز مشکل دارید

### مشکل 1: در localhost به bahamm.ir ریدایرکت می‌شه

**راه حل:**
- مطمئن بشید که backend رو بدون environment variable اجرا کردید
- فایل `.env` در پوشه `backend/` نباید `FRONTEND_URL=https://bahamm.ir` داشته باشه

### مشکل 2: در production به localhost ریدایرکت می‌شه

**راه حل:**
```bash
# چک کردن environment variable در PM2
pm2 env backend | grep FRONTEND_URL

# اگر خالی بود:
pm2 delete backend
pm2 start ecosystem.config.js --only backend
pm2 save
pm2 logs backend --lines 50
```

### مشکل 3: ZarinPal callback URL اشتباه است

**راه حل:**
- به داشبورد ZarinPal برید
- مطمئن بشید که callback URL روی `https://bahamm.ir/backend/api/payment/callback` تنظیم شده

---

**آخرین بروزرسانی:** 19 دسامبر 2025  
**وضعیت:** ✅ آماده برای Deploy


