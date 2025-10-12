# 🔧 رفع مشکل Authority در ZarinPal Sandbox

## مشکل
هنگام پرداخت در sandbox.zarinpal.com خطای زیر نمایش داده می‌شد:
```json
{
  "data": {},
  "errors": {
    "message": "The authority must start with one of the following: S.",
    "code": -9,
    "validations": []
  }
}
```

## علت مشکل
- Authority با حرف "A" شروع می‌شد
- ZarinPal Sandbox نیاز به Authority دارد که با "S" شروع شود

## راه حل
در فایل `quick_server.py` تغییرات زیر اعمال شد:

### قبل از رفع:
```python
# Generate 36-character authority (ZarinPal format)
authority = 'A' + ''.join(random.choices(string.digits, k=35))
```

### بعد از رفع:
```python
# Generate 36-character authority for SANDBOX (S + 35 digits)
authority = 'S' + ''.join(random.choices(string.digits, k=35))
```

## فرمت صحیح Authority برای Sandbox:
- **طول**: 36 کاراکتر
- **شروع**: حرف "S"
- **ادامه**: 35 رقم
- **مثال**: `S12345678901234567890123456789012345`

## تست کردن
برای تست فرمت جدید:
```bash
python test_sandbox_authority.py
```

## نکات مهم
1. این تغییر فقط برای **Sandbox** است
2. برای **Production** باید Authority از ZarinPal API دریافت شود
3. Authority باید منحصر به فرد باشد
4. Authority فقط برای یک پرداخت قابل استفاده است

## وضعیت فعلی
✅ Authority با فرمت صحیح تولید می‌شود  
✅ پرداخت در Sandbox کار می‌کند  
✅ خطای "must start with S" رفع شده است 