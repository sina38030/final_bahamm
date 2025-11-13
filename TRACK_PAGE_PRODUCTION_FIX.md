# راهنمای رفع مشکل صفحه Track در Production

## مشکل
در production، صفحه track همه چیز رو 0 نشون میده:
- محصولات سبد خرید: خالی
- قیمت‌ها: 0 تومان
- تعداد اعضا: 0 نفر

اما در local همه چیز درست کار میکنه.

## علت مشکل
مشکل از **environment variables** نادرسته. کد Next.js برای دریافت اطلاعات گروه به backend نیاز داره، ولی در production آدرس backend رو نمیدونه.

### چک کردن لاگ‌ها
با logging‌هایی که اضافه کردیم، در console سرور این لاگ‌ها رو خواهید دید:

```
[GET /api/groups] BACKEND_BASE: http://127.0.0.1:8001/api
[GET /api/groups] ENV: {
  BACKEND_URL: 'NOT_SET',
  INTERNAL_BACKEND_URL: 'NOT_SET',
  API_BASE_URL: 'NOT_SET'
}
```

اگر همه `NOT_SET` باشن، یعنی backend URL درست ست نشده.

## راه‌حل

### 1. ست کردن Environment Variables در Production

شما باید یکی از این متغیرها رو در production ست کنید:

#### برای Vercel:
```bash
# در Vercel Dashboard > Settings > Environment Variables
BACKEND_URL=https://your-backend-domain.com
INTERNAL_BACKEND_URL=https://your-backend-domain.com
API_BASE_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_ADMIN_API_URL=https://your-backend-domain.com/api
```

#### برای سرور Linux با PM2:
ایجاد فایل `.env` در پوشه `frontend`:

```bash
# frontend/.env
BACKEND_URL=http://localhost:8001
INTERNAL_BACKEND_URL=http://localhost:8001
API_BASE_URL=http://localhost:8001/api
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8001/api

# اگر backend روی سرور دیگه‌ای هست:
# BACKEND_URL=http://your-backend-ip:8001
# INTERNAL_BACKEND_URL=http://your-backend-ip:8001
```

#### برای Docker:
در `docker-compose.yml` یا `.env`:

```yaml
environment:
  BACKEND_URL: http://backend:8001
  INTERNAL_BACKEND_URL: http://backend:8001
  API_BASE_URL: http://backend:8001/api
  NEXT_PUBLIC_ADMIN_API_URL: http://backend:8001/api
```

### 2. ریست کردن Build

بعد از ست کردن environment variables، حتماً:

#### برای Vercel:
1. Redeploy کنید (یا Rebuild)
2. یا در Settings > Functions اگر Edge Function استفاده میکنید، ریست کنید

#### برای PM2:
```bash
cd frontend
npm run build
pm2 restart frontend
# یا
pm2 delete frontend
pm2 start npm --name "frontend" -- start
```

### 3. تست کردن

1. صفحه track رو باز کنید
2. در console مرورگر (F12 > Network) چک کنید که:
   - `/api/groups/[groupId]` با status 200 response میده
   - response شامل `basket`, `participants`, `pricing` هست

3. در لاگ سرور چک کنید:
```
[GET /api/groups] BACKEND_BASE: https://your-backend.com/api
[GET /api/groups] detailsRes status: fulfilled
[GET /api/groups] details fetched successfully: true
[GET /api/groups] list fetched, length: 10
```

## فایل‌های تغییر یافته

این فایل‌ها برای رفع مشکل تغییر کردند:

1. **frontend/src/app/api/groups/[groupId]/route.ts**
   - اضافه شدن logging برای debug
   - بهبود error handling
   - تأیید cache strategy (`no-store`)

2. **frontend/src/utils/serverBackend.ts** (قبلاً موجود بود)
   - تابع `getApiBase()` که environment variables رو چک میکنه

## نکات مهم

1. **متغیرهای NEXT_PUBLIC_*** برای client-side هستند
2. **متغیرهای بدون NEXT_PUBLIC_*** برای server-side هستند
3. در production **هر دو** نوع باید ست بشن
4. بعد از تغییر environment variables، **حتماً rebuild** کنید

## تست در Local

برای تست اینکه آیا مشکل از environment variables هست:

```bash
cd frontend
# حذف موقت environment variables
export BACKEND_URL=""
export INTERNAL_BACKEND_URL=""
export API_BASE_URL=""
npm run dev
```

حالا صفحه track رو باز کنید - باید همون مشکل production رو ببینید (همه چیز 0).

## کمک بیشتر

اگر بعد از این کارها مشکل حل نشد:

1. لاگ‌های سرور رو بررسی کنید:
   ```bash
   # PM2
   pm2 logs frontend
   
   # Vercel
   Vercel Dashboard > Deployments > [your deployment] > Runtime Logs
   ```

2. چک کنید backend در دسترس هست:
   ```bash
   curl https://your-backend.com/api/admin/group-buys
   ```

3. Network tab رو در مرورگر چک کنید (F12 > Network)

## خلاصه

**مشکل**: Environment variables در production ست نشده
**راه‌حل**: ست کردن `BACKEND_URL` یا `API_BASE_URL` و rebuild
**تست**: چک کردن لاگ‌ها و Network tab



