# ✅ Payment Callback به سایت bahamm.ir تغییر داده شد

## 🔧 تغییرات انجام شده

### 1️⃣ Redirect هوشمند بر اساس نوع کاربر

پرداخت callback حالا **به سایت bahamm.ir برمی‌گرده** (نه تلگرام!)، و هوشمندانه redirect می‌کنه:

#### 🎯 سناریوهای مختلف:

| نوع کاربر | شرط | Redirect به |
|-----------|------|-------------|
| **لیدر گروه** | `order_type=GROUP` و `group_order_id=NULL` | `/invite?authority=XXX` |
| **کاربر Invited** | `group_order_id != NULL` | `/orders` |
| **خرید Solo** | `order_type=ALONE` | `/successpayment?authority=XXX` |
| **پرداخت ناموفق** | `Status != OK` | `/cart?payment_failed=true` |
| **خطا** | Exception | `/cart?payment_error=true` |

### 2️⃣ فایل‌های تغییر یافته

#### `backend/app/routes/payment.py` (خطوط 624-693)
- تابع `payment_callback` رو کاملاً بازنویسی کردیم
- **قبل**: همه به `t.me/Bahamm_bot/bahamm` می‌رفتن 🚫
- **حالا**: براساس نوع order به صفحات مناسب redirect می‌شن ✅

#### `backend/app/services/payment_service.py` (خط 890)
- callback URL رو از `/payment/callback` به `/api/payment/callback` تغییر دادیم

### 3️⃣ منطق تشخیص نوع کاربر

```python
# Leader: کسی که گروه رو می‌سازه
is_leader = (order.order_type == OrderType.GROUP and order.group_order_id is None)

# Invited/Solo: کسی که به گروه join می‌کنه یا solo خرید می‌کنه  
is_invited_or_solo = (order.group_order_id is not None or order.order_type == OrderType.ALONE)
```

## 🎯 جریان کامل پرداخت

### مثال 1: لیدر گروه
```
کاربر (لیدر) checkout می‌کنه
  ↓
زرین‌پال پرداخت
  ↓
https://bahamm.ir/api/payment/callback?Authority=A000...&Status=OK
  ↓
Backend: order.group_order_id = NULL ➜ لیدر هست!
  ↓
https://bahamm.ir/invite?authority=A000... ✅
```

### مثال 2: کاربر Invited
```
کاربر (invited) به گروه join می‌کنه
  ↓
زرین‌پال پرداخت
  ↓
https://bahamm.ir/api/payment/callback?Authority=A000...&Status=OK
  ↓
Backend: order.group_order_id = 123 ➜ invited هست!
  ↓
https://bahamm.ir/orders ✅
(در این صفحه دکمه "مبلغ پرداختیت رو پس بگیر!" با timer نمایش داده می‌شود)
```

### مثال 3: خرید Solo
```
کاربر solo خرید می‌کنه
  ↓
زرین‌پال پرداخت
  ↓
https://bahamm.ir/api/payment/callback?Authority=A000...&Status=OK
  ↓
Backend: order.order_type = ALONE ➜ solo هست!
  ↓
https://bahamm.ir/successpayment?authority=A000... ✅
```

## 📝 نکات مهم

1. **دیگه هیچ redirect ای به تلگرام نداریم** - همه به bahamm.ir می‌رن
2. **لاگ‌های مفید** - برای debug کردن مشکلات احتمالی
3. **Fallback مناسب** - اگر مشکلی پیش اومد، به `/invite` یا `/cart` می‌ره
4. **Invite code** برای کاربر invited اضافه می‌شه تا بتونه گروه رو ببینه

## 🧪 تست کردن

برای تست:

1. **لیدر گروه**:
   - محصول به سبد اضافه کن
   - "خرید گروهی" انتخاب کن
   - checkout کن
   - بعد از پرداخت باید بری `/invite` ✓

2. **کاربر Invited**:
   - روی لینک دعوت کلیک کن
   - پرداخت رو انجام بده
   - بعد از پرداخت باید بری `/orders` ✓
   - در این صفحه دکمه "مبلغ پرداختیت رو پس بگیر!" با timer دیده می‌شود

3. **خرید Solo**:
   - محصول به سبد اضافه کن
   - "خرید تکی" انتخاب کن
   - checkout کن
   - بعد از پرداخت باید بری `/successpayment` ✓

## ✅ مشکل حل شده!

دیگه کاربرا بعد از پرداخت به تلگرام redirect نمی‌شن! همه به سایت bahamm.ir برمی‌گردن. 🎉

