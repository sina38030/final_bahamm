# راهنمای رفع مشکل صفحه Track در Production

## ⚠️ مشکل شما
در production، صفحه track:
- محصولات سبد خرید رو نشون نمیده
- قیمت‌ها و تعداد اعضا همه 0 هستن
- ولی در local همه چیز درست کار میکنه

## ✅ راه‌حل (خیلی ساده!)

### مرحله 1️⃣: ست کردن Environment Variables

شما باید آدرس backend خودتون رو در production بهش بگید.

**اگر از Vercel استفاده میکنید:**
1. برید به: Vercel Dashboard → Project → Settings → Environment Variables
2. این متغیرها رو اضافه کنید:

```
BACKEND_URL = https://api.yourdomain.com
API_BASE_URL = https://api.yourdomain.com/api
NEXT_PUBLIC_ADMIN_API_URL = https://api.yourdomain.com/api
```

**اگر از سرور لینوکس استفاده میکنید:**
1. یه فایل `.env` در پوشه `frontend` بسازید
2. اینا رو داخلش بذارید:

```bash
BACKEND_URL=http://localhost:8001
API_BASE_URL=http://localhost:8001/api
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8001/api
```

یا اگر backend روی سرور دیگه‌ای هست:

```bash
BACKEND_URL=http://backend-server-ip:8001
API_BASE_URL=http://backend-server-ip:8001/api
NEXT_PUBLIC_ADMIN_API_URL=http://backend-server-ip:8001/api
```

### مرحله 2️⃣: Build و Restart

**برای Vercel:**
- فقط redeploy کنید (یا Rebuild بزنید)

**برای PM2:**
```bash
cd frontend
npm run build
pm2 restart frontend
```

### مرحله 3️⃣: تست کنید

1. صفحه track رو باز کنید
2. F12 بزنید → برید به Console
3. باید این لاگ‌ها رو ببینید:

```
[GET /api/groups] BACKEND_BASE: https://your-backend.com/api
[GET /api/groups] detailsRes status: fulfilled
[GET /api/groups] details fetched successfully: true
```

اگر دیدید `BACKEND_BASE: http://127.0.0.1:8001/api` → یعنی environment variable ست نشده!

## 🔧 تغییراتی که انجام شد

1. **بهبود logging**: حالا میتونید ببینید دقیقاً backend از کجا داره fetch میکنه
2. **رفع مشکل cache**: دیگه cache نمیشه، همیشه fresh data میگیره
3. **Error handling بهتر**: اگه مشکلی پیش بیاد، لاگ‌های واضح‌تری میبینید

## 📝 چک کردن سریع

یه اسکریپت آماده کردیم که چک میکنه environment variables درست ست شدن:

```bash
cd frontend
node check-env.js
```

اگر همه چی ok باشه، میگه:
```
✅ All environment variables are properly configured!
```

اگر مشکلی باشه، میگه چی کم هست.

## ❓ اگه باز کار نکرد

1. **لاگ‌های سرور رو چک کنید:**
   ```bash
   pm2 logs frontend --lines 50
   ```

2. **چک کنید backend در دسترس هست:**
   ```bash
   curl http://your-backend-url/api/admin/group-buys
   ```

3. **Network tab رو چک کنید:**
   - F12 → Network
   - صفحه رو refresh کنید
   - ببینید `/api/groups/[groupId]` چه response ای میده

## 📞 نیاز به کمک؟

اگه این کارها رو کردید و باز مشکل دارید، این اطلاعات رو برام بفرستید:
1. لاگ‌های console (F12 → Console)
2. لاگ‌های سرور (pm2 logs یا vercel logs)
3. Network response (F12 → Network → `/api/groups/...`)

## 🎯 خلاصه

**مشکل**: Backend URL در production ست نشده بود
**راه‌حل**: ست کردن `BACKEND_URL` و rebuild
**زمان**: 2-3 دقیقه

با انجام این کارها، صفحه track شما باید کامل و درست کار کنه! 🎉





