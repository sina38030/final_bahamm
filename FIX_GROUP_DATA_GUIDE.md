# راهنمای رفع مشکل نمایش اطلاعات گروه خرید

## 🔍 تشخیص مشکل

مشکل گزارش شده:
- صفحه `landingM`: اطلاعات سبد و زمان باقیمانده نشون نمیده
- صفحه `track`: همه چی صفره
- صفحه `invite`: زمان باقیمانده 0 هست از اول

## 🎯 علت مشکل

مشکل از این بابت است که گروه‌های خرید قدیمی (که قبل از اضافه شدن فیلد `basket_snapshot` ایجاد شدند) این اطلاعات را ندارند:

1. **`basket_snapshot`**: اطلاعات سبد خرید (محصولات، تعداد، قیمت‌ها)
2. **`leader_paid_at`**: زمان پرداخت لیدر
3. **`expires_at`**: زمان انقضای گروه (24 ساعت بعد از پرداخت لیدر)

بدون این اطلاعات، API های فرانت‌اند نمی‌توانند:
- سبد خرید را نمایش دهند
- زمان باقیمانده را محاسبه کنند
- قیمت‌ها را نشان دهند

## 🛠️ راه حل

### مرحله 1: بررسی وضعیت فعلی

ابتدا اسکریپت debug را اجرا کنید تا ببینید کدام گروه‌ها مشکل دارند:

```bash
cd C:\Projects\final_bahamm
python debug_group_api.py
```

این اسکریپت:
- لیست گروه‌های خرید را از بک‌اند می‌گیرد
- جزئیات یک گروه خاص را چک می‌کند
- API های فرانت‌اند را تست می‌کند

### مرحله 2: تعمیر دیتابیس

اسکریپت تعمیر را اجرا کنید:

```bash
python fix_basket_snapshot.py
```

این اسکریپت:
1. **چک می‌کند** کدام گروه‌ها `basket_snapshot` ندارند
2. **می‌پرسد** آیا می‌خواهید آنها را تعمیر کنید
3. **پر می‌کند** `basket_snapshot` از روی order items لیدر
4. **Set می‌کند** `leader_paid_at` و `expires_at` اگر null باشند

**نکته مهم**: این اسکریپت فقط گروه‌هایی را تعمیر می‌کند که:
- `basket_snapshot` ندارند یا خالی است
- حداقل یک order دارند

### مرحله 3: تست

بعد از اجرای اسکریپت تعمیر:

1. **بررسی وضعیت جدید**:
   ```bash
   python debug_group_api.py
   ```

2. **تست در مرورگر**:
   - صفحه landingM: `http://localhost:3000/landingM?invite={invite_code}`
   - صفحه track: `http://localhost:3000/track/{group_id}`
   - صفحه invite: `http://localhost:3000/invite?authority={authority}`

## 📋 بررسی دستی

اگر می‌خواهید دستی یک گروه خاص را چک کنید:

### 1. از طریق Browser DevTools

باز کنید: `http://localhost:3000/api/groups/{group_id}`

چیزهایی که باید چک کنید:
```json
{
  "id": "140",
  "basket": [  // باید پر باشد
    {
      "productId": "3",
      "name": "سیب زمینی",
      "qty": 1,
      "unitPrice": 3500
    }
  ],
  "pricing": {
    "originalTotal": 9500,  // باید بزرگتر از 0 باشد
    "currentTotal": 9500
  },
  "expiresAtMs": 1234567890000,  // باید عدد باشد، نه null
  "remainingSeconds": 12345,  // باید بزرگتر از 0 باشد
  "serverNowMs": 1234567890000
}
```

### 2. مستقیم از دیتابیس

```python
from app.database import get_db
from app.models import GroupOrder
import json

db = next(get_db())

# چک کردن یک گروه خاص
group = db.query(GroupOrder).filter(GroupOrder.id == 140).first()

print(f"ID: {group.id}")
print(f"basket_snapshot: {group.basket_snapshot}")
print(f"leader_paid_at: {group.leader_paid_at}")
print(f"expires_at: {group.expires_at}")

if group.basket_snapshot:
    data = json.loads(group.basket_snapshot)
    print(f"تعداد آیتم‌ها: {len(data.get('items', []))}")
```

## 🚨 مشکلات احتمالی و راه حل

### مشکل 1: زمان باقیمانده 0 است

**علت**: `expires_at` null است یا گذشته است

**راه حل**:
```python
from app.database import get_db
from app.models import GroupOrder
from datetime import datetime, timedelta, timezone

TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))
db = next(get_db())

group = db.query(GroupOrder).filter(GroupOrder.id == YOUR_GROUP_ID).first()

# اگر leader_paid_at دارید
if group.leader_paid_at:
    group.expires_at = group.leader_paid_at + timedelta(hours=24)
else:
    # یا از created_at استفاده کنید
    group.expires_at = group.created_at + timedelta(hours=24)

db.commit()
```

### مشکل 2: سبد خالی است

**علت**: `basket_snapshot` null یا خالی است

**راه حل**: اجرای `fix_basket_snapshot.py`

### مشکل 3: قیمت‌ها 0 هستند

**علت**: محصولات قیمت `friend_1_price`, `friend_2_price`, `friend_3_price` ندارند

**راه حل**: در پنل ادمین، قیمت‌های محصولات را set کنید

## 📊 چک لیست تایید

بعد از اجرای اسکریپت تعمیر، این موارد را چک کنید:

- [ ] API `/api/groups/{group_id}` basket پر برمی‌گرداند
- [ ] API `/api/groups/{group_id}` expiresAtMs عدد برمی‌گرداند (نه null)
- [ ] API `/api/groups/{group_id}` remainingSeconds بزرگتر از 0 است (اگر expire نشده)
- [ ] صفحه landingM سبد را نشان می‌دهد
- [ ] صفحه landingM زمان باقیمانده را نشان می‌دهد
- [ ] صفحه track اطلاعات کامل را نشان می‌دهد
- [ ] صفحه invite تایمر کار می‌کند

## 🔄 پیشگیری از مشکل در آینده

برای اینکه این مشکل دوباره پیش نیاید:

1. **همیشه `basket_snapshot` را set کنید** هنگام ایجاد GroupOrder
2. **همیشه `leader_paid_at` را set کنید** هنگام موفقیت پرداخت
3. **همیشه `expires_at` را محاسبه کنید**: `leader_paid_at + 24 hours`

این کارها در این فایل‌ها انجام می‌شوند:
- `backend/app/routes/payment.py` (تابع `verify_payment`)
- `backend/app/services/payment_service.py` (تابع `verify_payment`)
- `backend/app/routes/groups_routes.py` (تابع `create_secondary_group`)

## 📞 در صورت نیاز به کمک

اگر بعد از اجرای این مراحل، مشکل حل نشد:

1. خروجی `debug_group_api.py` را ذخیره کنید
2. یک گروه خاص که مشکل دارد را مشخص کنید (با ID)
3. از دیتابیس، اطلاعات آن گروه را export کنید:
   ```sql
   SELECT * FROM group_orders WHERE id = YOUR_GROUP_ID;
   SELECT * FROM orders WHERE group_order_id = YOUR_GROUP_ID;
   ```

---

**تاریخ ایجاد**: 2025-01-14
**نسخه**: 1.0

