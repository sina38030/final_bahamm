# راهنمای رفع مشکل Track Page در Production

## خلاصه مشکل
در production، صفحه Track همه چیز را ۰ نشان می‌دهد:
- ❌ کالاهای داخل سبد خرید نمایش داده نمی‌شوند
- ❌ قیمت‌ها همه ۰ هستند
- ❌ تعداد اعضا ۰ نمایش داده می‌شود

**اما در local همه چیز درست کار می‌کند! ✅**

## علت اصلی مشکل

مشکل از **Environment Variables** نادرست است:

```
❌ مشکل: در production، Next.js API routes نمی‌دانند backend کجاست
✅ راه‌حل: تنظیم BACKEND_URL در environment variables
```

### جزئیات تکنیکی

صفحه Track از این API routes استفاده می‌کند:
- `/api/groups/[groupId]` (اصلی)
- `/frontapi/groups/[groupId]` (پشتیبان)

این API routes باید به backend در `http://127.0.0.1:8001` متصل شوند، اما در production متغیر `BACKEND_URL` تنظیم نشده بود.

## راه‌حل

### گام 1: Pull کردن تغییرات جدید

```bash
cd /srv/app
git pull origin main
```

### گام 2: بررسی فایل‌های جدید

بررسی کنید که این فایل‌ها وجود دارند:
```bash
ls -la /srv/app/frontend/.env
ls -la /srv/app/frontend/.env.production
```

خروجی باید شامل این فایل‌ها باشد:
- `.env` (فایل اصلی برای runtime)
- `.env.production` (فایل برای build time)
- `.env.local` (فایل قبلی برای development)

### گام 3: اجرای اسکریپت خودکار

یک اسکریپت آماده برای رفع خودکار مشکل ایجاد کرده‌ایم:

```bash
cd /srv/app
bash fix_track_page_production.sh
```

این اسکریپت این کارها را انجام می‌دهد:
1. ✅ بررسی وجود فایل‌های .env
2. ✅ پاک کردن cache و build قدیمی
3. ✅ ساخت build جدید با environment variables درست
4. ✅ Restart کردن frontend (با PM2 یا systemd)
5. ✅ نمایش وضعیت و راهنمای تست

### گام 4 (اختیاری): رفع دستی

اگر اسکریپت کار نکرد، می‌توانید دستی این کارها را انجام دهید:

```bash
cd /srv/app/frontend

# پاک کردن cache
rm -rf .next
rm -rf node_modules/.cache

# Build جدید
npm run build

# Restart (یکی از این روش‌ها)
pm2 restart frontend
# یا
sudo systemctl restart frontend
# یا
sudo systemctl restart bahamm-frontend
```

## تست کردن

### 1. بررسی صفحه Track
1. به https://bahamm.ir بروید
2. وارد یک گروه خرید شوید (یا یک گروه جدید بسازید)
3. صفحه Track را باز کنید
4. بررسی کنید:
   - ✅ محصولات سبد خرید نمایش داده می‌شوند
   - ✅ قیمت‌ها صحیح هستند (نه ۰)
   - ✅ تعداد اعضا صحیح است

### 2. بررسی Network Tab
1. F12 را در مرورگر بزنید
2. به تب Network بروید
3. صفحه را Refresh کنید
4. بررسی کنید:
   - ✅ `/api/groups/[groupId]` با status 200 response می‌دهد
   - ✅ Response شامل `basket`, `participants`, `pricing` است
   - ✅ مقادیر در response خالی نیستند

### 3. بررسی لاگ‌های سرور

```bash
# اگر از PM2 استفاده می‌کنید
pm2 logs frontend --lines 50

# اگر از systemd استفاده می‌کنید
sudo journalctl -u frontend -n 50 --no-pager
# یا
sudo journalctl -u bahamm-frontend -n 50 --no-pager
```

باید لاگ‌های مشابه این را ببینید:
```
[GET /api/groups] BACKEND_BASE: http://127.0.0.1:8001/api
[GET /api/groups] Group ID: 123
[GET /api/groups] detailsRes status: fulfilled
[API] Group 123: basketItemsRaw after enrichment: [...]
```

## محتوای فایل‌های .env

### فایل `.env` و `.env.production`

```bash
# Backend URLs (server-side only)
BACKEND_URL=http://127.0.0.1:8001
INTERNAL_BACKEND_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001/api

# Public URLs (client-side)
NEXT_PUBLIC_ADMIN_API_URL=https://bahamm.ir/backend/api
NEXT_PUBLIC_API_URL=https://bahamm.ir/api
NEXT_PUBLIC_SITE_URL=https://bahamm.ir
NEXT_PUBLIC_FRONTEND_URL=https://bahamm.ir
```

### توضیح متغیرها

| متغیر | کاربرد | مقدار در Production |
|------|--------|-------------------|
| `BACKEND_URL` | آدرس backend برای server-side | `http://127.0.0.1:8001` |
| `INTERNAL_BACKEND_URL` | آدرس داخلی backend | `http://127.0.0.1:8001` |
| `API_BASE_URL` | آدرس API برای server-side | `http://127.0.0.1:8001/api` |
| `NEXT_PUBLIC_ADMIN_API_URL` | آدرس API برای client (مرورگر) | `https://bahamm.ir/backend/api` |
| `NEXT_PUBLIC_API_URL` | آدرس عمومی API | `https://bahamm.ir/api` |
| `NEXT_PUBLIC_SITE_URL` | آدرس سایت | `https://bahamm.ir` |

## نکات مهم

### 1. تفاوت متغیرهای NEXT_PUBLIC_*
- **متغیرهای بدون `NEXT_PUBLIC_`**: فقط در server-side (Next.js API routes) در دسترس هستند
- **متغیرهای با `NEXT_PUBLIC_`**: در client-side (مرورگر کاربر) در دسترس هستند

### 2. چرا دو آدرس مختلف؟
- **Server-side**: `http://127.0.0.1:8001` - چون Next.js روی همان سرور است و مستقیماً به backend متصل می‌شود
- **Client-side**: `https://bahamm.ir/backend/api` - چون مرورگر کاربر از طریق Nginx به backend متصل می‌شود

### 3. بعد از تغییر .env
همیشه باید:
1. پاک کردن `.next` directory
2. Build جدید با `npm run build`
3. Restart کردن service

### 4. اگر مشکل حل نشد
اگر بعد از این کارها هنوز مشکل وجود دارد، احتمالاً:
- ❓ Backend در دسترس نیست - تست کنید: `curl http://127.0.0.1:8001/api/admin/group-buys`
- ❓ Port 8001 بسته است - بررسی کنید: `sudo netstat -tlnp | grep 8001`
- ❓ فایل .env load نشده - بررسی کنید لاگ‌ها را

## فایل‌های تغییر یافته

این PR فایل‌های زیر را ایجاد/تغییر داده:

1. ✅ `frontend/.env` - فایل جدید
2. ✅ `frontend/.env.production` - فایل جدید
3. ✅ `fix_track_page_production.sh` - اسکریپت رفع خودکار
4. ✅ `TRACK_PAGE_FIX_INSTRUCTIONS.md` - این راهنما

## خلاصه دستورات

```bash
# روی سرور production این دستورات را اجرا کنید:

# 1. Pull تغییرات
cd /srv/app && git pull origin main

# 2. اجرای اسکریپت رفع خودکار
bash fix_track_page_production.sh

# 3. بررسی وضعیت
pm2 list
# یا
sudo systemctl status frontend

# 4. مشاهده لاگ‌ها
pm2 logs frontend
# یا
sudo journalctl -u frontend -f
```

## پشتیبانی

اگر مشکل همچنان ادامه دارد:
1. لاگ‌های frontend را بررسی کنید
2. لاگ‌های backend را بررسی کنید
3. Network tab در مرورگر را بررسی کنید
4. مطمئن شوید که backend در حال اجراست: `ps aux | grep uvicorn`

---

**آخرین به‌روزرسانی**: ۱۴۰۳/۰۸/۱۷  
**نسخه**: 1.0  
**وضعیت**: آماده برای اجرا ✅
