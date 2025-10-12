# 🔧 راهنمای رفع مشکل نمایش موجودی (coins)

## ✅ وضعیت فعلی

تست‌ها نشان داده که:
- ✅ **Backend کاملاً کار می‌کند**
- ✅ **API endpoint `/users/me` موجودی را درست برمی‌گرداند**
- ✅ **دیتابیس صحیح است**
- ❌ **Frontend موجودی 0 نمایش می‌دهد**

## 🐛 علت مشکل

**localStorage قدیمی!**

وقتی کاربر قبلاً لاگین کرده، اطلاعات کاربر (شامل `coins: 0`) در localStorage ذخیره شده.
حتی اگر در پنل ادمین موجودی را تغییر دهید، frontend همچنان از localStorage قدیمی استفاده می‌کند.

## 🎯 راه حل‌ها (3 روش)

### روش 1: استفاده از صفحه Debug (آسان‌ترین) ⭐

1. **مرورگر را باز کنید** و به این آدرس بروید:
   ```
   http://localhost:3000/debug_coins.html
   ```

2. **بررسی کنید**:
   - قسمت "localStorage" را ببینید
   - آیا `coins: 0` است؟

3. **رفرش موجودی**:
   - روی دکمه **"رفرش موجودی از سرور"** کلیک کنید
   - منتظر بمانید تا پیام موفقیت نمایش داده شود

4. **به wallet بروید**:
   - از لینک موجود در پیام موفقیت استفاده کنید
   - یا به `http://localhost:3000/profile/wallet` بروید
   - صفحه را رفرش کنید (`F5`)

### روش 2: پاک کردن localStorage (سریع‌ترین)

1. **F12** را بزنید (Developer Tools)

2. **Console** را باز کنید

3. این کد را اجرا کنید:
   ```javascript
   localStorage.clear();
   alert('localStorage پاک شد! اکنون دوباره لاگین کنید.');
   ```

4. **دوباره لاگین کنید**:
   - به صفحه لاگین بروید
   - با شماره تلفنی که موجودیش را تغییر داده‌اید وارد شوید

5. **به wallet بروید**:
   - `/profile/wallet` را باز کنید
   - باید موجودی جدید را ببینید ✅

### روش 3: رفرش دستی موجودی (برای Developers)

1. **F12** → **Console**

2. این کد را اجرا کنید:
   ```javascript
   (async () => {
     const token = localStorage.getItem('token');
     if (!token) {
       alert('Token یافت نشد! لطفاً لاگین کنید.');
       return;
     }

     const response = await fetch('http://localhost:8001/api/users/coins', {
       headers: { 'Authorization': `Bearer ${token}` }
     });

     if (response.ok) {
       const data = await response.json();
       console.log('موجودی از سرور:', data.coins);

       // به‌روزرسانی localStorage
       const userStr = localStorage.getItem('user');
       if (userStr) {
         const user = JSON.parse(userStr);
         user.coins = data.coins;
         localStorage.setItem('user', JSON.stringify(user));
         alert(`موجودی به‌روز شد: ${data.coins.toLocaleString()} تومان`);
         window.location.reload();
       }
     } else {
       alert('خطا در دریافت موجودی');
     }
   })();
   ```

## 🔍 عیب‌یابی گام به گام

### مرحله 1: بررسی Backend

```bash
# اجرای تست API
python test_users_me_endpoint.py
```

باید ببینید:
```
✅ موجودی در /users/me: 150,000 تومان
✅ موجودی صحیح است!
```

### مرحله 2: بررسی localStorage

1. **F12** → **Application** (یا **Storage**)
2. **Local Storage** → `http://localhost:3000`
3. کلید `user` را پیدا کنید
4. مقدار را باز کنید و `coins` را ببینید

**اگر `coins: 0` بود** → مشکل همین است!

### مرحله 3: بررسی Network

1. **F12** → **Network**
2. به `/profile/wallet` بروید
3. فیلتر کنید: `coins` یا `/users/`
4. بررسی کنید:
   - آیا درخواست به `/users/coins` یا `/users/me` ارسال می‌شود؟
   - Response چیست؟

## 📱 تست نهایی

### با شماره تلفن مشخص:

1. **در پنل ادمین** (http://localhost:3000/admin-full):
   - بخش کاربران
   - کاربر با شماره `09464634646` را پیدا کنید
   - موجودی: `150,000` تومان ✅

2. **Logout کامل**:
   - از حساب فعلی خارج شوید
   - F12 → Console → `localStorage.clear()`

3. **Login دوباره**:
   - با شماره `09464634646` وارد شوید
   - کد OTP را وارد کنید

4. **به wallet بروید**:
   - `/profile/wallet`
   - باید `150,000` تومان را ببینید ✅

## 🛠️ رفع مشکل دائمی

برای اینکه این مشکل دیگر پیش نیاید، باید:

### 1. بعد از تغییر موجودی در ادمین، localStorage را رفرش کنید

در فایل `frontend/src/app/admin-full/page.tsx` (خط 3312):

**الان:**
```javascript
alert('موجودی با موفقیت تغییر کرد');
```

**بهتر:**
```javascript
alert('موجودی با موفقیت تغییر کرد\n\nتوجه: کاربر باید localStorage را پاک کند یا دوباره لاگین کند');
```

### 2. در AuthContext، زمان‌بندی مناسب برای refresh

فایل `frontend/src/contexts/AuthContext.tsx` در حال حاضر:
- ✅ هنگام focus window
- ✅ هنگام mount wallet page

این کافی است، ولی اگر مشکل دارد:

**اضافه کردن interval:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    if (user?.id) refreshCoins();
  }, 30000); // هر 30 ثانیه

  return () => clearInterval(interval);
}, [user?.id, refreshCoins]);
```

## ✅ چک لیست نهایی

- [ ] Backend در حال اجرا است (port 8001)
- [ ] Frontend در حال اجرا است (port 3000)
- [ ] `test_users_me_endpoint.py` موفق است
- [ ] در پنل ادمین موجودی تغییر کرده
- [ ] localStorage را پاک کرده‌ام (`localStorage.clear()`)
- [ ] دوباره لاگین کرده‌ام
- [ ] به `/profile/wallet` رفته‌ام
- [ ] موجودی جدید را می‌بینم ✅

## 🎉 وقتی کار کرد

اگر موجودی درست نمایش داده شد:
1. ✅ Backend کار می‌کند
2. ✅ Frontend کار می‌کند
3. ✅ localStorage تمیز است
4. ✅ همه چیز OK است!

---

**آخرین به‌روزرسانی:** 2025-10-06  
**وضعیت:** Backend تست شده ✅ | Frontend نیاز به clear cache دارد

