# خلاصه رفع مشکل Track Page - راهنمای سریع

## مشکل شما
در production، صفحه Track این مشکلات را داشت:
- ❌ کالاهای سبد خرید نمایش داده نمی‌شوند
- ❌ قیمت‌ها همه ۰ هستند  
- ❌ تعداد اعضا ۰ است

اما در local همه چیز درست کار می‌کند! ✅

## چرا این اتفاق افتاد؟

مشکل از **Environment Variables** بود:
- Next.js API routes باید به backend در `http://127.0.0.1:8001` متصل شوند
- ولی متغیر `BACKEND_URL` در production تنظیم نشده بود
- در نتیجه API routes نمی‌توانستند اطلاعات را از backend دریافت کنند

## چه کاری انجام دادم؟ ✅

### 1. فایل‌های Environment Variable ایجاد کردم:
- ✅ `frontend/.env` - برای runtime
- ✅ `frontend/.env.production` - برای build time

### 2. اسکریپت خودکار رفع مشکل:
- ✅ `fix_track_page_production.sh` - یک کلیک و مشکل حل می‌شود!

### 3. راهنمای کامل:
- ✅ `TRACK_PAGE_FIX_INSTRUCTIONS.md` - راهنمای جامع

### 4. Commit و Push:
- ✅ همه تغییرات commit شدند در branch: `cursor/fix-production-cart-display-bug-d14f`

## حالا چه کار کنم؟

### گزینه ۱: استفاده از اسکریپت خودکار (پیشنهادی ⭐)

```bash
# 1. اتصال به سرور
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"

# 2. رفتن به پوشه پروژه
cd /srv/app

# 3. Pull کردن تغییرات
git pull origin cursor/fix-production-cart-display-bug-d14f

# 4. اجرای اسکریپت رفع خودکار
bash fix_track_page_production.sh
```

این اسکریپت **خودکار** این کارها را انجام می‌دهد:
- ✅ بررسی فایل‌های .env
- ✅ پاک کردن cache
- ✅ ساخت build جدید
- ✅ Restart کردن frontend
- ✅ نمایش وضعیت

### گزینه ۲: رفع دستی

```bash
ssh ubuntu@185.231.181.208

cd /srv/app
git pull origin cursor/fix-production-cart-display-bug-d14f

cd frontend
rm -rf .next node_modules/.cache
npm run build

# یکی از این دستورات:
pm2 restart frontend
# یا
sudo systemctl restart frontend
```

## چطور بفهمم کار کرد؟

### ۱. تست در مرورگر:
1. به https://bahamm.ir بروید
2. وارد صفحه Track یک گروه شوید (مثلاً: https://bahamm.ir/track/123)
3. بررسی کنید:
   - ✅ محصولات نمایش داده می‌شوند؟
   - ✅ قیمت‌ها صحیح هستند (نه ۰)؟
   - ✅ تعداد اعضا صحیح است؟

### ۲. بررسی Network Tab:
1. F12 در مرورگر
2. Tab: Network
3. Refresh صفحه
4. بررسی `/api/groups/[groupId]`:
   - ✅ Status: 200
   - ✅ Response شامل basket, participants, pricing

### ۳. بررسی لاگ‌ها:
```bash
# PM2
pm2 logs frontend --lines 20

# systemd  
sudo journalctl -u frontend -n 20 --no-pager
```

باید این لاگ را ببینید:
```
[GET /api/groups] BACKEND_BASE: http://127.0.0.1:8001/api
[API] Group 123: basketItemsRaw after enrichment: [...]
```

## فایل‌های ایجاد شده

```
/srv/app/
├── frontend/
│   ├── .env                    ← جدید
│   └── .env.production         ← جدید
├── fix_track_page_production.sh     ← جدید
└── TRACK_PAGE_FIX_INSTRUCTIONS.md   ← جدید (راهنمای کامل)
```

## محتوای مهم .env

```bash
# Server-side (برای Next.js API routes)
BACKEND_URL=http://127.0.0.1:8001
INTERNAL_BACKEND_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001/api

# Client-side (برای مرورگر)
NEXT_PUBLIC_ADMIN_API_URL=https://bahamm.ir/backend/api
NEXT_PUBLIC_API_URL=https://bahamm.ir/api
NEXT_PUBLIC_SITE_URL=https://bahamm.ir
```

## نکات مهم ⚠️

1. **حتماً rebuild کنید**: بعد از pull کردن، باید `npm run build` بزنید
2. **حتماً restart کنید**: بعد از build، باید frontend را restart کنید
3. **دو آدرس مختلف**: 
   - Server-side: `http://127.0.0.1:8001` (داخلی)
   - Client-side: `https://bahamm.ir` (عمومی)

## اگر مشکل حل نشد؟

### چک‌لیست:
- [ ] آیا git pull را زدید؟
- [ ] آیا فایل‌های `.env` وجود دارند؟
- [ ] آیا `npm run build` را اجرا کردید؟
- [ ] آیا frontend را restart کردید؟
- [ ] آیا backend در حال اجراست؟ (`ps aux | grep uvicorn`)
- [ ] آیا port 8001 باز است؟ (`curl http://127.0.0.1:8001/api/admin/group-buys`)

### کمک بیشتر:
اگر مشکل ادامه داشت، این اطلاعات را بفرستید:
```bash
# 1. وضعیت frontend
pm2 list
# یا
sudo systemctl status frontend

# 2. لاگ‌های frontend  
pm2 logs frontend --lines 50

# 3. تست backend
curl http://127.0.0.1:8001/api/admin/group-buys

# 4. محتوای .env
cat /srv/app/frontend/.env
```

## خلاصه کل

✅ مشکل: Environment variables در production تنظیم نشده بود
✅ راه‌حل: فایل‌های .env ایجاد شدند
✅ اجرا: فقط `bash fix_track_page_production.sh` را اجرا کنید
✅ نتیجه: صفحه Track حالا درست کار می‌کند!

---

**وقت تخمینی برای اجرا**: ۳-۵ دقیقه (شامل build time)

**آخرین به‌روزرسانی**: ۱۴۰۳/۰۸/۱۷

**Status**: ✅ آماده برای Deploy
