# بررسی Token تلگرام - راهنمای حل مشکل

## مشکل فعلی
پیام خطا: "ورود از طریق تلگرام ناموفق بود. لطفا از شماره تلفن استفاده کنید."

## دلایل احتمالی

### 1. عدم تطابق Token با Mini App

Mini App شما با یک bot خاص در BotFather تنظیم شده است. Token در `config.py` باید دقیقاً با همان bot مطابقت داشته باشد.

**Token های موجود:**
- Token قدیمی: `8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E`
- Token جدید (فعلی): `8401301600:AAESD_wvk1dw0O9HQT_jNkWIdlpCp5GNlwc`

### 2. بررسی تنظیمات در BotFather

به @BotFather بروید و این دستورات را اجرا کنید:

```
/mybots
→ انتخاب @bahamm_shop_bot
→ Bot Settings
→ Menu Button
→ Configure Menu Button
```

**چک کنید:**
- آیا Mini App URL به `https://bahamm.ir` اشاره دارد؟
- آیا Mini App با bot صحیح link شده است؟

### 3. دریافت Token صحیح

در @BotFather:
```
/mybots
→ انتخاب @bahamm_shop_bot
→ API Token
```

این token را با token های بالا مقایسه کنید.

---

## راه حل‌های پیشنهادی

### گزینه A: استفاده از اسکریپت تست

```bash
python test_telegram_mini_app.py
```

این اسکریپت هر دو token را تست می‌کند و به شما می‌گوید کدام یکی با Mini App شما کار می‌کند.

**مراحل:**
1. Mini App را باز کنید: https://t.me/bahamm_shop_bot/shop
2. کنسول مرورگر را باز کنید (F12)
3. تایپ کنید: `Telegram.WebApp.initData`
4. خروجی را کپی کنید
5. در اسکریپت paste کنید

### گزینه B: بازگشت به Token قدیمی

اگر Mini App قبلاً کار می‌کرد، احتمالاً token قدیمی صحیح است:

```python
# backend/app/config.py - خط 25
TELEGRAM_BOT_TOKEN: str = "8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E"
```

سپس backend را restart کنید.

### گزینه C: ساخت Mini App جدید

اگر هیچ token ای کار نکرد:

1. به @BotFather بروید
2. `/mybots` → @bahamm_shop_bot
3. Bot Settings → Menu Button → Configure Menu Button
4. URL را وارد کنید: `https://bahamm.ir`
5. Token جدید را در `config.py` قرار دهید

---

## تست نهایی

بعد از تغییر token:

1. Backend را restart کنید:
   ```bash
   # Stop backend
   # Start backend again
   ```

2. Mini App را refresh کنید (بستن و باز کردن مجدد)

3. سعی کنید وارد شوید

---

## Log های مفید برای Debug

برای دیدن خطای دقیق، backend logs را چک کنید:

```bash
# Windows
Get-Content logs\backend.log -Tail 50

# یا در کد Python
tail -f logs/backend.log
```

به دنبال این خطاها باشید:
- `Telegram initData verification failed`
- `Invalid Telegram authentication data`
- `TELEGRAM_BOT_TOKEN not configured`

---

## پشتیبانی اضافی

اگر هیچ کدام کار نکرد، مشخصات زیر را چک کنید:

**تنظیمات فعلی:**
- Bot Username: `@bahamm_shop_bot`
- Mini App Name: `shop`
- Domain: `bahamm.ir`
- Backend URL: `https://bahamm.ir/api`

**Checklist:**
- [ ] Token در config.py با token در @BotFather مطابقت دارد
- [ ] Mini App URL صحیح است (https://bahamm.ir)
- [ ] Backend restart شده است
- [ ] Telegram Mini App را refresh کرده‌اید (بستن و باز کردن)
- [ ] initData منقضی نشده است (حداکثر 1 ساعت اعتبار دارد)

