# 🔧 رفع مشکل Redirect به Localhost بعد از پرداخت

## ❌ مشکل شما
وقتی در **bahamm.ir** یا **mini app** پرداخت می‌کنید، بعد از پرداخت به `localhost:3000` ریدایرکت می‌شود به جای `https://bahamm.ir`.

---

## ✅ تشخیص مشکل

### 1️⃣ فایل‌های بررسی شده:

#### ❌ مشکل در: `backend/app/config.py`
```python
# قبل (اشتباه):
FRONTEND_URL: str = "http://localhost:3000"  # این مقدار پیش‌فرض بود
```

این باعث می‌شد که همیشه به localhost ریدایرکت بشه!

#### ✅ Frontend درست بود (`frontend/src/utils/api.ts`):
```typescript
// Production domains: use nginx reverse proxy
if (hostname === 'bahamm.ir' || hostname === 'www.bahamm.ir') {
  return `${protocol}//${hostname}/api`;
}
```

#### ✅ Payment Service درست بود (`backend/app/services/payment_service.py`):
```python
# از settings استفاده می‌کنه (درسته)
callback_url=f"{settings.get_payment_callback_base_url}/payment/callback"
```

---

## 🔧 تغییر اعمال شده

### فایل: `backend/app/config.py` - خط 23

```python
# ✅ بعد (درست):
FRONTEND_URL: str = "https://bahamm.ir"  # Can use env var for local dev: http://localhost:3000
```

**حالا چی می‌شه؟**
- ✅ Production: پیش‌فرض `https://bahamm.ir` است
- ✅ Development: با `.env` یا environment variable به `localhost` تغییرش می‌دیم
- ✅ Payment callback: به `https://bahamm.ir/backend/api/payment/callback` می‌ره
- ✅ Success redirect: به `https://bahamm.ir/payment/success/...` می‌ره

---

## 🚀 مراحل Deploy (حتماً انجام بدید!)

### مرحله 1: ذخیره و Push کردن تغییرات

روی سیستم محلی (Windows):

```powershell
# از پوشه پروژه
cd C:\Projects\final_bahamm

# چک کردن تغییرات
git status

# اضافه کردن تغییرات
git add backend/app/config.py FIX_LOCALHOST_REDIRECT.md راهنمای_رفع_مشکل_Redirect_به_Localhost.md

# Commit کردن (وقتی آماده بودید)
git commit -m "Fix: Change default FRONTEND_URL to production (https://bahamm.ir)"

# Push کردن (وقتی گفتید!)
# git push origin main
```

⚠️ **توجه**: طبق قوانین شما، من commit و push نمی‌کنم. شما باید این کار رو خودتون انجام بدید!

---

### مرحله 2: Deploy در سرور Production

بعد از push کردن، SSH به سرور بزنید:

```bash
# 1. اتصال به سرور
ssh root@YOUR_SERVER_IP

# 2. رفتن به پوشه پروژه
cd /srv/app/frontend

# 3. Pull کردن آخرین تغییرات
git pull origin main

# 4. چک کردن فایل config
cat backend/app/config.py | grep "FRONTEND_URL:"

# باید ببینید:
# FRONTEND_URL: str = "https://bahamm.ir"

# 5. Restart کردن Backend
pm2 restart bahamm-backend

# 6. دیدن لاگ‌ها (مهم!)
pm2 logs bahamm-backend --lines 50
```

---

### مرحله 3: بررسی لاگ‌ها

در لاگ‌های PM2 باید **حتماً** این خطوط رو ببینید:

```
✅ درست:
🔧 Payment Routes Configuration:
   FRONTEND_URL: https://bahamm.ir
   get_frontend_public_url: https://bahamm.ir
   get_payment_callback_base_url: https://bahamm.ir/backend/api

❌ اشتباه (اگه این رو دیدید، به مرحله بعد برید):
   FRONTEND_URL: http://localhost:3000
```

---

### مرحله 4: اگر هنوز localhost می‌بینید (Troubleshooting)

اگر در لاگ هنوز `localhost` می‌بینید، یک فایل `.env` بسازید:

```bash
# روی سرور
cd /srv/app/frontend/backend

# ایجاد فایل .env
cat > .env << 'EOF'
FRONTEND_URL=https://bahamm.ir
PAYMENT_CALLBACK_BASE_URL=https://bahamm.ir/backend/api
DATABASE_URL=sqlite:////srv/app/bahamm1.db
EOF

# چک کردن فایل
cat .env

# Restart مجدد
pm2 restart bahamm-backend

# چک لاگ دوباره
pm2 logs bahamm-backend --lines 30
```

حالا باید `https://bahamm.ir` رو در لاگ ببینید!

---

## ✅ تست کردن

### تست 1: چک لاگ‌های Backend

```bash
# روی سرور
pm2 logs bahamm-backend --lines 100 | grep "FRONTEND_URL"
```

باید ببینید:
```
FRONTEND_URL: https://bahamm.ir
```

### تست 2: تست API مستقیم

```bash
# روی سرور
curl -X GET "https://bahamm.ir/api/health" -H "Accept: application/json"
```

اگه جواب داد، backend در حال اجراست.

### تست 3: پرداخت واقعی 💳

1. به `https://bahamm.ir` برید
2. یک محصول به سبد خرید اضافه کنید
3. Checkout کنید
4. پرداخت کنید (می‌تونید با 1000 تومان تست کنید)
5. ✅ **باید به این صفحات ریدایرکت بشید:**
   - لیدر گروه: `https://bahamm.ir/invite?authority=A00000...`
   - کاربر invited: `https://bahamm.ir/payment/success/invitee?authority=...`
   - خرید solo: `https://bahamm.ir/payment/success?authority=...`

6. ❌ **نباید به این آدرس ریدایرکت بشید:**
   - `http://localhost:3000/...` (این مشکل قبلی بود!)

---

## 🔧 Development محلی (برای شما)

برای کار روی سیستم محلی، یک فایل `.env` در `backend/` بسازید:

```bash
# backend/.env (فقط برای development محلی)
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./bahamm1.db
ZARINPAL_SANDBOX=False
SMS_FORCE_TEST_MODE=True
```

این باعث می‌شه که وقتی backend رو روی سیستم محلی اجرا می‌کنید، از localhost استفاده کنه.

---

## 📊 خلاصه تغییرات

| فایل | خط | قبل | بعد | وضعیت |
|------|-----|-----|-----|-------|
| `backend/app/config.py` | 23 | `http://localhost:3000` | `https://bahamm.ir` | ✅ تغییر داده شد |
| `frontend/src/utils/api.ts` | - | - | - | ✅ درست بود (تغییری نداشت) |
| `ecosystem.config.js` | 11 | `FRONTEND_URL: 'https://bahamm.ir'` | - | ✅ درست بود (تغییری نداشت) |

---

## 🆘 اگر بعد از همه این‌ها هنوز مشکل دارید

### 1. چک کنید Backend واقعاً Restart شده:
```bash
pm2 list
pm2 describe bahamm-backend
```

### 2. چک کنید Nginx درست کار می‌کنه:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### 3. چک کنید Git Pull واقعاً انجام شده:
```bash
cd /srv/app/frontend
git log --oneline -5
git diff HEAD backend/app/config.py
```

اگه متن "https://bahamm.ir" رو در config.py می‌بینید، یعنی درسته!

### 4. Clear Cache مرورگر:
- `Ctrl+Shift+Delete`
- پاک کردن همه cookies و cache
- بستن و باز کردن مرورگر

### 5. چک کنید ZarinPal Dashboard:
- به پنل ZarinPal برید
- تنظیمات Callback URL رو چک کنید
- باید روی `https://bahamm.ir/backend/api/payment/callback` باشه

---

## 📝 چک‌لیست Deploy

قبل از اینکه به کاربرانتون اطلاع بدید، این موارد رو چک کنید:

- [ ] تغییرات commit شده
- [ ] تغییرات push شده به GitHub
- [ ] SSH به سرور زدید
- [ ] `git pull` روی سرور انجام شد
- [ ] `pm2 restart bahamm-backend` اجرا شد
- [ ] در لاگ `https://bahamm.ir` رو می‌بینید (نه localhost)
- [ ] یک پرداخت تستی انجام دادید
- [ ] redirect به `https://bahamm.ir` شد (نه localhost)
- [ ] Mini app هم تست شد
- [ ] همه چیز کار می‌کنه! 🎉

---

**تاریخ:** 29 نوامبر 2025  
**وضعیت:** ✅ کد آماده است، منتظر Deploy  
**اولویت:** 🔴 بالا (مشکل critical برای production)

---

## 💡 نکات مهم

1. ⚠️ **حتماً بعد از deploy یک پرداخت تست کنید**
2. 📱 **Mini app رو هم حتماً چک کنید**
3. 🔍 **لاگ‌های backend رو نگه دارید برای debug**
4. 💾 **قبل از deploy یک backup از database بگیرید**

---

اگه سوالی داشتید یا مشکلی پیش اومد، بهم بگید تا کمکتون کنم! 🚀

