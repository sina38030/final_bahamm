# راهنمای پیاده‌سازی Deep Link برای بازگشت از پرداخت

## 🎯 مشکل و راه‌حل

### مشکل
وقتی کاربر از Telegram Mini App برای پرداخت به درگاه بانک می‌رود، باید VPN را خاموش کند. بعد از پرداخت، چون VPN خاموش است، نمی‌تواند مستقیماً به تلگرام (که در ایران فیلتر است) برگردد.

### راه‌حل
از **Deep Link** استفاده می‌کنیم که:
1. کاربر بعد از پرداخت به **وب‌سایت** (نه mini app) برمی‌گردد
2. در وب‌سایت، یک دکمه با Deep Link نمایش داده می‌شود
3. کاربر VPN را روشن می‌کند
4. با کلیک روی دکمه، مستقیماً به Mini App تلگرام (با اطلاعات سفارش) برمی‌گردد

---

## ✅ تغییرات انجام شده

### 1. Backend Configuration

**فایل:** `backend/app/config.py`

تنظیمات زیر اضافه شده:
```python
TELEGRAM_BOT_USERNAME: str = "bahamm_shop_bot"
TELEGRAM_MINIAPP_NAME: str = "shop"
```

**نکته مهم:** این مقادیر را با اطلاعات واقعی بات خودتان تغییر دهید.

### 2. کامپوننت TelegramReturn

**فایل:** `frontend/src/components/TelegramReturn.tsx`

کامپوننتی که Deep Link هوشمند برای بازگشت به تلگرام ایجاد می‌کند.

**ویژگی‌ها:**
- تشخیص خودکار موبایل یا دسکتاپ
- چند لینک fallback (اگر یکی کار نکرد، بعدی امتحان می‌شود)
- نمایش هشدار VPN
- انیمیشن‌های زیبا

### 3. صفحه Payment Callback

**فایل:** `frontend/src/app/payment/callback/page.tsx`

کامپوننت `TelegramReturn` به صفحه callback اضافه شده تا کاربران پس از پرداخت موفق بتوانند به Mini App برگردند.

### 4. AuthContext - دریافت start_param

**فایل:** `frontend/src/contexts/AuthContext.tsx`

یک `useEffect` اضافه شده که:
- `start_param` را از Telegram WebApp دریافت می‌کند
- اطلاعات سفارش و گروه را parse می‌کند
- کاربر را به صفحه مناسب هدایت می‌کند
- نوتیفیکیشن موفقیت نمایش می‌دهد

---

## 🔧 تنظیمات مورد نیاز

### گام 1: تنظیم Bot Username و Mini App Name

**در BotFather:**
1. پیدا کردن username بات خود (مثلاً `@bahamm_shop_bot`)
2. یادداشت کردن نام Mini App (که در BotFather تنظیم کرده‌اید)

### گام 2: ایجاد فایل Environment Variables

**فایل:** `frontend/.env.local` (این فایل را خودتان بسازید)

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8001

# Telegram Mini App Configuration
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=bahamm_shop_bot
NEXT_PUBLIC_TELEGRAM_MINIAPP_NAME=shop
```

**نکات مهم:**
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` را با username بات خود (بدون @) تغییر دهید
- `NEXT_PUBLIC_TELEGRAM_MINIAPP_NAME` را با نام Mini App خود تغییر دهید
- برای production، `NEXT_PUBLIC_API_URL` را به آدرس دامنه واقعی خود تغییر دهید

### گام 3: آپدیت Backend Config

**فایل:** `backend/app/config.py`

مقادیر زیر را با اطلاعات واقعی خود جایگزین کنید:

```python
TELEGRAM_BOT_USERNAME: str = "YOUR_BOT_USERNAME"  # بدون @
TELEGRAM_MINIAPP_NAME: str = "YOUR_MINIAPP_NAME"
```

یا از environment variables استفاده کنید:

**فایل:** `backend/.env`

```env
TELEGRAM_BOT_USERNAME=YOUR_BOT_USERNAME
TELEGRAM_MINIAPP_NAME=YOUR_MINIAPP_NAME
```

### گام 4: تنظیم Callback URL در ZarinPal

مطمئن شوید که `FRONTEND_URL` در `backend/app/config.py` به آدرس **وب‌سایت** (نه Mini App) اشاره می‌کند:

```python
# For development
FRONTEND_URL: str = "http://localhost:3000"

# For production
FRONTEND_URL: str = "https://yourdomain.com"
```

---

## 🚀 نحوه کار

### Flow کامل:

```
1. کاربر در Mini App → کلیک روی "پرداخت"
   ↓
2. نمایش پیام: "لطفاً VPN را خاموش کنید"
   ↓
3. انتقال به درگاه بانک (Callback URL = website)
   ↓
4. کاربر پرداخت می‌کند
   ↓
5. بازگشت به وب‌سایت (نه Mini App) ✅
   ↓
6. نمایش صفحه موفقیت با:
   - ✅ پرداخت موفق
   - ⚠️ "VPN را روشن کنید"
   - 🔘 دکمه "بازگشت به تلگرام"
   ↓
7. کاربر VPN را روشن می‌کند
   ↓
8. کلیک روی دکمه
   ↓
9. Deep Link باز می‌شود:
   - تلگرام باز می‌شود
   - Mini App خودکار لود می‌شود
   - با start_param مثل: order_123_group_456
   ↓
10. AuthContext start_param را parse می‌کند
    ↓
11. کاربر به صفحه مناسب هدایت می‌شود:
    - اگر group_id وجود داشته باشد → /track/{groupId}
    - اگر فقط order_id باشد → /orders/{orderId}
    ↓
12. نمایش نوتیفیکیشن: "✅ پرداخت شما با موفقیت انجام شد!"
```

---

## 📱 ساختار Deep Link

### لینک‌های مختلف برای Fallback:

```typescript
// 1. بهترین: مستقیم به mini app
https://t.me/YOUR_BOT_USERNAME/YOUR_APP_NAME?startapp=order_123_group_456

// 2. لینک bot با start parameter
https://t.me/YOUR_BOT_USERNAME?start=order_123_group_456

// 3. Telegram protocol (برای موبایل)
tg://resolve?domain=YOUR_BOT_USERNAME&start=order_123_group_456

// 4. Telegram web (برای desktop)
https://web.telegram.org/k/#@YOUR_BOT_USERNAME
```

### فرمت start_param:

```
order_{orderId}_group_{groupId}
```

مثال:
- فقط سفارش: `order_123`
- سفارش با گروه: `order_123_group_456`

---

## 🧪 تست کردن

### 1. تست Local:

```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. تست Flow:

1. باز کردن Mini App در تلگرام
2. ایجاد یک سفارش و رفتن به صفحه پرداخت
3. کلیک روی دکمه پرداخت
4. بعد از redirect به بانک، انصراف دادن و برگشتن
5. مشاهده صفحه callback در مرورگر (نه Mini App)
6. کلیک روی دکمه "بازگشت به تلگرام"
7. بررسی باز شدن Mini App و redirect به صفحه مناسب

### 3. تست start_param:

در Developer Console تلگرام:

```javascript
// بررسی وجود start_param
console.log(window.Telegram.WebApp.initDataUnsafe?.start_param);

// تست دستی
window.Telegram.WebApp.initDataUnsafe = {
  start_param: "order_123_group_456"
};
```

---

## ⚠️ نکات مهم

### 1. Production Deployment:

- `FRONTEND_URL` باید به دامنه اصلی اشاره کند (نه localhost)
- SSL/HTTPS برای production الزامی است
- مطمئن شوید Mini App URL در BotFather به درستی تنظیم شده

### 2. امنیت:

- هیچ اطلاعات حساسی در `start_param` قرار ندهید
- فقط ID های عمومی (order_id, group_id) ارسال کنید
- در backend همیشه مجوزها را بررسی کنید

### 3. UX:

- پیام‌های واضح به کاربر نمایش دهید
- از انیمیشن‌ها برای بهبود تجربه استفاده کنید
- گزینه‌های جایگزین برای موارد استثنایی فراهم کنید

### 4. Troubleshooting:

اگر Deep Link کار نکرد:
- مطمئن شوید Bot Username صحیح است
- بررسی کنید Mini App در BotFather فعال است
- Console logs را چک کنید
- Telegram Web را به عنوان fallback امتحان کنید

---

## 📚 منابع

- [Telegram Bot API - Web Apps](https://core.telegram.org/bots/webapps)
- [Telegram Deep Links](https://core.telegram.org/api/links)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## ✅ Checklist نهایی

قبل از production:

- [ ] `TELEGRAM_BOT_USERNAME` تنظیم شده
- [ ] `TELEGRAM_MINIAPP_NAME` تنظیم شده
- [ ] فایل `frontend/.env.local` ساخته شده
- [ ] `FRONTEND_URL` به دامنه production اشاره می‌کند
- [ ] SSL/HTTPS برای production فعال است
- [ ] Mini App در BotFather به درستی تنظیم شده
- [ ] Flow کامل پرداخت تست شده
- [ ] Deep Link در موبایل و دسکتاپ تست شده
- [ ] start_param parsing تست شده
- [ ] Redirect به صفحات مناسب کار می‌کند

---

## 🎉 تمام!

حالا سیستم شما آماده است! کاربران می‌توانند:
1. از Mini App پرداخت کنند
2. به وب‌سایت برگردند
3. VPN را روشن کنند
4. با یک کلیک به Mini App برگردند
5. به صفحه مناسب هدایت شوند

موفق باشید! 🚀

