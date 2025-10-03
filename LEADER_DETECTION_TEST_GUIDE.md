# راهنمای تست تشخیص رهبر

## تغییرات انجام شده

### 🔧 Backend Changes

1. **API جدید یکپارچه**: `/api/group-orders/my-groups-and-orders`
   - همه اطلاعات گروه‌ها و سفارش‌ها در یک درخواست
   - فیلدهای جدید: `is_leader_order`, `group_status`, `settlement_status`
   - عملکرد بهتر: از N+1 queries به 2-3 optimized queries

2. **فیلدهای جدید در پاسخ**:
   ```json
   {
     "success": true,
     "groups": [...],
     "orders": [
       {
         "id": 123,
         "is_leader_order": true,
         "group_status": "ongoing",
         "settlement_status": "pending",
         "group_order_id": 456,
         ...
       }
     ],
     "has_leader_groups": true
   }
   ```

### 🎯 Frontend Changes

1. **API یکپارچه**: جایگزینی `fetchMyGroups` و `fetchUserOrders` با `fetchUserGroupsAndOrders`
2. **تشخیص رهبر واقعی**: بر اساس `is_leader_order` از backend
3. **حذف کدهای اضافی**: N+1 query problems و leadership detection پیچیده
4. **UI بهبود یافته**: نمایش صحیح دکمه‌های رهبر

## 🧪 مراحل تست

### مرحله 1: تست Backend

1. سرور backend را اجرا کنید:
   ```bash
   cd backend
   python start_backend.py
   ```

2. توکن معتبر کاربر را از localStorage مرورگر کپی کنید

3. فایل `test_new_api.py` را ویرایش کنید و توکن را جایگزین کنید

4. تست را اجرا کنید:
   ```bash
   python test_new_api.py
   ```

### مرحله 2: تست Frontend

1. سرور frontend را اجرا کنید:
   ```bash
   cd frontend
   npm run dev
   ```

2. وارد حساب کاربری شوید

3. گروه جدید ایجاد کنید:
   - محصولی را انتخاب کنید
   - حالت "گروهی" را انتخاب کنید
   - پرداخت را تکمیل کنید

4. به صفحه "گروه و سفارش‌ها" بروید

5. بررسی کنید:
   - ✅ گروه شما نمایش داده می‌شود
   - ✅ تب "گروه ها" قابل دسترس است
   - ✅ سفارش شما با نشان رهبر نمایش داده می‌شود
   - ✅ Debug info نشان می‌دهد: `Leader: ✅`

### مرحله 3: تست سناریوهای مختلف

1. **کاربر رهبر**:
   - گروه ایجاد کنید
   - بررسی کنید گروه در تب "گروه ها" نمایش داده می‌شود
   - سفارش با `is_leader_order: true` باید نمایش داده شود

2. **کاربر عضو**:
   - از لینک دعوت استفاده کنید
   - بررسی کنید سفارش با `is_leader_order: false` نمایش داده می‌شود
   - تب "گروه ها" نباید نمایش داده شود

3. **گروه موفق**:
   - گروه را نهایی کنید
   - بررسی کنید `group_status: "success"`
   - دکمه انتخاب زمان تحویل باید نمایش داده شود

## 🔍 نکات مهم

### Performance بهبود یافته
- **قبل**: 5+ API calls برای هر بارگذاری صفحه
- **بعد**: 1 API call یکپارچه

### Debug Information
در حالت development، اطلاعات debug در console نمایش داده می‌شود:
```
✅ Fetched unified data: {groups: 2, orders: 3, hasLeaderGroups: true}
```

### Error Handling
- خطاهای API به صورت واضح نمایش داده می‌شوند
- Fallback mechanisms برای حالات خطا

## 🚨 مشکلات احتمالی

1. **توکن منقضی**: دوباره وارد شوید
2. **گروه نمایش داده نمی‌شود**: 
   - بررسی کنید `is_leader_order` در API response موجود است
   - Console را برای خطاها بررسی کنید
3. **عملکرد کند**: 
   - بررسی کنید queries بهینه شده‌اند
   - Network tab را در DevTools بررسی کنید

## ✅ Checklist تست

- [ ] Backend API `/api/group-orders/my-groups-and-orders` کار می‌کند
- [ ] فیلدهای `is_leader_order`, `group_status`, `settlement_status` در response موجودند
- [ ] Frontend از API جدید استفاده می‌کند
- [ ] کاربر رهبر گروه خود را می‌بیند
- [ ] تب "گروه ها" فقط برای رهبران نمایش داده می‌شود
- [ ] Debug info صحیح نمایش داده می‌شود
- [ ] دکمه انتخاب زمان تحویل برای گروه‌های موفق کار می‌کند
- [ ] Performance بهبود یافته (کمتر از 2 ثانیه بارگذاری)

## 🎉 نتیجه

پس از اعمال این تغییرات:
- مشکل تشخیص رهبر حل شده
- عملکرد بهبود یافته
- کد تمیزتر و قابل نگهداری‌تر
- UX بهتر برای کاربران
