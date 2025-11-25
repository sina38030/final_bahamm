# قابلیت مدیریت جستجوهای پرطرفدار

این سند توضیحات کاملی از قابلیت جدید مدیریت جستجوهای پرطرفدار در پنل ادمین ارائه می‌دهد.

## خلاصه تغییرات

این قابلیت به شما امکان می‌دهد که محصولات پرطرفدار نمایش داده شده در باکس جستجو را خودتان مشخص کنید.

## فایل‌های تغییر یافته

### Backend

1. **backend/app/models.py**
   - مدل `PopularSearch` اضافه شد
   - فیلدها: `id`, `search_term`, `sort_order`, `is_active`, `created_at`, `updated_at`

2. **backend/app/schemas.py**
   - اسکیماهای Pydantic اضافه شد:
     - `PopularSearchBase`
     - `PopularSearchCreate`
     - `PopularSearchUpdate`
     - `PopularSearchResponse`

3. **backend/app/routes/popular_search_routes.py** (فایل جدید)
   - API endpoints برای مدیریت جستجوهای پرطرفدار:
     - `GET /popular-searches` - دریافت لیست (عمومی)
     - `GET /popular-searches/{id}` - دریافت یک مورد
     - `POST /popular-searches` - ایجاد (فقط ادمین)
     - `PUT /popular-searches/{id}` - ویرایش (فقط ادمین)
     - `DELETE /popular-searches/{id}` - حذف (فقط ادمین)
     - `POST /popular-searches/reorder` - تغییر ترتیب (فقط ادمین)

4. **backend/app/routes/__init__.py**
   - روتر `popular_search_router` به لیست روترها اضافه شد

5. **backend/migrations/add_popular_searches.sql** (فایل جدید)
   - اسکریپت SQL برای ایجاد جدول
   - شامل 6 جستجوی پیش‌فرض

6. **backend/run_popular_searches_migration.py** (فایل جدید)
   - اسکریپت Python برای اجرای migration

### Frontend

1. **frontend/src/app/admin-full/page.tsx**
   - سکشن "popular-searches" به تایپ `Section` اضافه شد
   - آیکن `FaFire` ایمپورت شد
   - آیتم منو "جستجوهای پرطرفدار" با آیکن آتش اضافه شد
   - کامپوننت `PopularSearchesContent` پیاده‌سازی شد با قابلیت‌های:
     - نمایش لیست جستجوهای پرطرفدار
     - افزودن جستجوی جدید
     - ویرایش جستجوها
     - فعال/غیرفعال کردن
     - حذف
     - تغییر ترتیب (بالا/پایین)

2. **frontend/src/components/common/SearchButton.tsx**
   - آرایه هاردکد `popularSearches` حذف شد
   - استیت جدید برای ذخیره جستجوهای پرطرفدار اضافه شد
   - fetch از API در هنگام باز شدن مودال جستجو
   - fallback به جستجوهای پیش‌فرض در صورت خطا

## نحوه استفاده

### برای ادمین

1. وارد پنل ادمین شوید (admin-full)
2. از منوی سمت راست، گزینه "جستجوهای پرطرفدار" را انتخاب کنید
3. می‌توانید:
   - جستجوهای جدید اضافه کنید
   - جستجوهای موجود را ویرایش کنید
   - ترتیب نمایش را با دکمه‌های بالا/پایین تغییر دهید
   - جستجوها را فعال یا غیرفعال کنید
   - جستجوها را حذف کنید

### برای کاربران

- هنگام کلیک روی باکس جستجو، جستجوهای پرطرفدار به صورت خودکار از سرور دریافت و نمایش داده می‌شوند
- اگر ارتباط با سرور برقرار نشود، جستجوهای پیش‌فرض نمایش داده می‌شود

## اجرای Migration

برای اجرای migration و ایجاد جدول در دیتابیس:

```bash
cd backend
python run_popular_searches_migration.py
```

خروجی موفق:
```
Found database at C:\Projects\final_bahamm\backend\bahamm1.db
[OK] Executed: ...
[SUCCESS] Popular searches migration completed
```

## امنیت

- تمام عملیات‌های ایجاد، ویرایش، حذف و تغییر ترتیب نیاز به احراز هویت ادمین دارند
- فقط endpoint دریافت لیست (GET) عمومی است
- از Bearer token authentication استفاده می‌شود

## ویژگی‌های پیاده‌سازی شده

✅ مدل دیتابیس با فیلدهای کامل  
✅ API endpoints کامل (CRUD + reorder)  
✅ رابط کاربری ادمین با تمام قابلیت‌ها  
✅ ادغام با کامپوننت SearchButton  
✅ Migration script برای راه‌اندازی  
✅ جستجوهای پیش‌فرض  
✅ امنیت و احراز هویت  
✅ مدیریت خطا و fallback  

## تست

برای تست قابلیت:

1. مطمئن شوید migration اجرا شده است
2. سرور backend را راه‌اندازی کنید
3. وارد پنل ادمین شوید
4. به سکشن "جستجوهای پرطرفدار" بروید
5. چند جستجو اضافه/ویرایش کنید
6. به صفحه اصلی بروید و روی باکس جستجو کلیک کنید
7. جستجوهای جدیدی که اضافه کرده‌اید باید نمایش داده شوند

## یادداشت‌ها

- جدول `popular_searches` در دیتابیس `bahamm1.db` ایجاد می‌شود
- ترتیب نمایش بر اساس فیلد `sort_order` است (کوچکترین مقدار اول نمایش داده می‌شود)
- جستجوهای غیرفعال (`is_active=False`) فقط در پنل ادمین نمایش داده می‌شوند
- در frontend، اگر ارتباط با API برقرار نشود، جستجوهای پیش‌فرض هاردکد نمایش داده می‌شود



