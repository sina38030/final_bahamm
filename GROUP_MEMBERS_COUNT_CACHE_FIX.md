# رفع مشکل به‌روزرسانی تعداد اعضای گروه در Admin Panel

## مشکل
وقتی کاربر invited عضو یک گروه می‌شد، تعداد اعضای گروه در صفحه admin-full بلافاصله به‌روزرسانی نمی‌شد و داده‌های قبلی (کش شده) نمایش داده می‌شد.

## علت مشکل

مشکل از دو بخش ناشی می‌شد:

### 1. کش کردن در سمت Frontend
- درخواست‌های API به صورت پیش‌فرض توسط مرورگر کش می‌شدند
- پارامتر `cache: 'no-store'` برای درخواست‌های fetch تنظیم نشده بود
- URL درخواست ثابت بود و مرورگر از نسخه کش شده استفاده می‌کرد

### 2. عدم ارسال Cache Headers از سمت Backend
- Backend هدرهای مناسب برای جلوگیری از کش کردن ارسال نمی‌کرد
- مرورگر و سرورهای میانی (مثل nginx) می‌توانستند پاسخ‌ها را کش کنند

## راه‌حل اعمال شده

### تغییرات Frontend (`frontend/src/app/admin-full/page.tsx`)

#### 1. بخش Group Buys (خطوط 3405-3447)
```typescript
// قبل از تغییر:
const data = await fetchJSON<any[]>(
  `${ADMIN_API_BASE_URL}/admin/group-buys?limit=1000`,
  undefined,
  ctrl.signal
);

// بعد از تغییر:
const timestamp = new Date().getTime();
const data = await fetchJSON<any[]>(
  `${ADMIN_API_BASE_URL}/admin/group-buys?limit=1000&_t=${timestamp}`,
  { cache: 'no-store' },
  ctrl.signal
);
```

#### 2. بخش Secondary Groups (خطوط 4398-4428)
```typescript
// قبل از تغییر:
const res = await fetch(
  `${BASE}/admin/secondary-groups?limit=1000`,
  { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
);

// بعد از تغییر:
const timestamp = new Date().getTime();
const res = await fetch(
  `${BASE}/admin/secondary-groups?limit=1000&_t=${timestamp}`,
  { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
);
```

**تغییرات:**
- اضافه کردن timestamp منحصر به فرد به URL برای Cache Busting
- اضافه کردن `cache: 'no-store'` به تنظیمات fetch
- هر بار که صفحه load می‌شود، timestamp جدیدی ایجاد می‌شود و مرورگر مجبور به دریافت داده‌های تازه است

### تغییرات Backend (`backend/app/routes/admin_routes.py`)

#### 1. اضافه کردن import
```python
from fastapi import APIRouter, Depends, Query, HTTPException, Form, Request, Response
```

#### 2. اضافه کردن Cache Headers به `/admin/group-buys` (خطوط 2237-2250)
```python
@admin_router.get("/group-buys")
async def get_all_group_buys(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    response: Response = None  # اضافه شد
):
    """Get group buys list built off GroupOrder records (with fallbacks)."""
    # Prevent caching to ensure fresh data in admin panel
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    # ... بقیه کد
```

#### 3. اضافه کردن Cache Headers به `/admin/secondary-groups` (خطوط 3670-3685)
```python
@admin_router.get("/secondary-groups")
async def get_secondary_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    db: Session = Depends(get_db),
    response: Response = None  # اضافه شد
):
    """Get secondary group buys list..."""
    # Prevent caching to ensure fresh data in admin panel
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    # ... بقیه کد
```

## توضیحات فنی

### Cache-Control Headers
- `no-cache`: مرورگر باید قبل از استفاده از نسخه کش شده، با سرور برای اعتبارسنجی تماس بگیرد
- `no-store`: مرورگر نباید هیچ نسخه‌ای از پاسخ را کش کند
- `must-revalidate`: مرورگر باید داده‌های منقضی شده را بدون استفاده مجدد، revalidate کند
- `Pragma: no-cache`: برای سازگاری با مرورگرهای قدیمی (HTTP/1.0)
- `Expires: 0`: تاریخ انقضای قدیمی برای اطمینان از عدم کش

### Timestamp Cache Busting
افزودن `_t=${timestamp}` به URL باعث می‌شود:
- هر درخواست یک URL منحصر به فرد داشته باشد
- مرورگر نتواند از cache قبلی استفاده کند
- Backend می‌تواند این پارامتر را نادیده بگیرد (query parameter تأثیری در منطق ندارد)

## نتیجه

با این تغییرات:
1. ✅ وقتی کاربر invited به گروه می‌پیوندد، تعداد اعضا در admin-full بلافاصله بعد از refresh به‌روزرسانی می‌شود
2. ✅ مرورگر دیگر از نسخه‌های کش شده استفاده نمی‌کند
3. ✅ داده‌های نمایش داده شده همیشه تازه و به‌روز هستند
4. ✅ تمام بخش‌های admin panel (Group Buys و Secondary Groups) به‌روزرسانی شدند

## تست

برای تست:
1. یک گروه جدید ایجاد کنید
2. لینک دعوت را با کاربر دیگری به اشتراک بگذارید
3. کاربر دعوت شده پرداخت را انجام دهد
4. در admin-full صفحه Group Buys را refresh کنید
5. تعداد اعضا باید بلافاصله به‌روزرسانی شود

## توجه

- این تغییرات فقط روی داده‌های admin panel تأثیر می‌گذارند
- منطق اصلی ثبت و لینک کردن کاربران به گروه‌ها تغییری نکرده است
- backend قبلاً به درستی کار می‌کرد، فقط مشکل cache بود

