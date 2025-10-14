# راهنمای سریع حل مشکل Mini App تلگرام

## مشکل فعلی
خطا: "ورود از طریق تلگرام ناموفق بود"

## دلیل
Mini App شما باید با bot صحیح در BotFather پیکربندی شود.

---

## راه حل (5 دقیقه) ✅

### مرحله 1: دریافت اطلاعات Bot از BotFather

1. به @BotFather بروید در تلگرام
2. دستور `/mybots` را بزنید
3. آیا `@bahamm_shop_bot` را می‌بینید؟
   - ✅ **اگر بله:** به مرحله 2 بروید
   - ❌ **اگر خیر:** لیست bot های خود را چک کنید و bot مرتبط با این token را پیدا کنید

### مرحله 2: پیکربندی Mini App

در @BotFather:

```
/mybots
→ انتخاب @bahamm_shop_bot (یا bot مرتبط با token جدید)
→ Bot Settings
→ Menu Button
→ Configure Menu Button
→ Button Text: 🛍 فروشگاه
→ URL: https://bahamm.ir
```

**مهم:** URL باید دقیقاً `https://bahamm.ir` باشد (بدون / در آخر)

### مرحله 3: تایید Token

در @BotFather:

```
/mybots
→ انتخاب همان bot
→ API Token
```

Token نمایش داده شده باید این باشد:
```
8401301600:AAESD_wvk1dw0O9HQT_jNkWIdlpCp5GNlwc
```

اگر متفاوت است، token صحیح را کپی کنید و در `backend/app/config.py` قرار دهید.

### مرحله 4: Restart Backend

Backend باید restart شود تا token جدید را بخواند:

```bash
# در سرور production
sudo systemctl restart bahamm-backend

# یا اگر از bat file استفاده می‌کنید
# کلید Ctrl+C بزنید و دوباره start کنید
```

### مرحله 5: تست

1. تلگرام را ببندید و دوباره باز کنید (kill process)
2. به t.me/bahamm_shop_bot/shop بروید
3. سعی کنید وارد شوید

---

## اگر هنوز کار نکرد 🔍

### بررسی Logs

در سرور:
```bash
tail -f logs/backend.log
```

یا در Windows:
```powershell
Get-Content logs\backend.log -Tail 30
```

به دنبال این پیام‌ها باشید:
- `Telegram initData verification failed`
- `Invalid Telegram authentication data`

### Debug با Console

1. Mini App را باز کنید: t.me/bahamm_shop_bot/shop
2. F12 را بزنید (Developer Tools)
3. به tab Console بروید
4. این کد را اجرا کنید:

```javascript
console.log('Bot Token Check:', {
  hasInitData: !!Telegram.WebApp.initData,
  initDataLength: Telegram.WebApp.initData?.length,
  user: Telegram.WebApp.initDataUnsafe?.user
});
```

اگر `hasInitData: false` است، مشکل از سمت تلگرام است.

---

## حل مشکل احتمالی: Bot Username یا Mini App Name اشتباه است

اگر bot شما username متفاوتی دارد:

**Scenario A: Bot username متفاوت است**

در `backend/app/config.py`:
```python
TELEGRAM_BOT_USERNAME: str = "YOUR_ACTUAL_BOT_USERNAME"  # بدون @
```

**Scenario B: Mini App name متفاوت است**

در BotFather وقتی Mini App را setup کردید، یک short name به آن دادید.
اگر short name شما `shop` نیست:

در `backend/app/config.py`:
```python
TELEGRAM_MINIAPP_NAME: str = "YOUR_ACTUAL_MINIAPP_NAME"
```

---

## Quick Check: آیا Token با Bot درست است؟

برای چک کردن اینکه token متعلق به کدام bot است:

```bash
curl "https://api.telegram.org/bot8401301600:AAESD_wvk1dw0O9HQT_jNkWIdlpCp5GNlwc/getMe"
```

خروجی باید username bot شما را نشان دهد:
```json
{
  "ok": true,
  "result": {
    "id": 8401301600,
    "is_bot": true,
    "first_name": "...",
    "username": "bahamm_shop_bot"  // باید با config.py مطابقت داشته باشد
  }
}
```

---

## آخرین راه حل: Disable Telegram Login موقتا

اگر فوری نیاز دارید سیستم کار کند، می‌توانید Telegram login را موقتاً غیرفعال کنید:

در `frontend/src/components/auth/PhoneAuthModal.tsx` - خط 24:

```typescript
// Comment out این قسمت:
/*
if (isOpen && typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
  setIsTelegramApp(true);
  // ... attempt telegram login
}
*/
```

این کار باعث می‌شود همیشه از phone login استفاده شود.

---

## Summary Checklist

- [ ] Token در config.py صحیح است: `8401301600:AAESD_wvk1dw0O9HQT_jNkWIdlpCp5GNlwc`
- [ ] Mini App در BotFather به URL صحیح لینک شده: `https://bahamm.ir`
- [ ] Bot username در config.py با BotFather مطابقت دارد
- [ ] Backend restart شده است
- [ ] تلگرام را kill کرده و دوباره باز کرده‌اید
- [ ] Logs را چک کرده‌اید برای دیدن خطای دقیق

