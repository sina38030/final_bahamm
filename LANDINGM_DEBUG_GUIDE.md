# راهنمای رفع مشکل نمایش محصولات در landingM

## مشکل
در صفحه landingM، اطلاعات سبد (محصولات و قیمت‌ها) نمایش داده نمی‌شود و صفحه خالی است.

## تغییرات انجام شده

### 1. اضافه کردن Debug Logs به `ClientLanding.tsx`

Debug logs زیر اضافه شده‌اند تا بتوانیم مشکل را تشخیص دهیم:

- **selectionProducts**: نشان می‌دهد چند محصول از `productsData` بارگذاری شده
- **referenceOrderItems**: نشان می‌دهد آیا از `groupOrderData.items` یا fallback استفاده می‌شود
- **productMap**: نشان می‌دهد چند محصول در map موجود است
- **Group order data**: تعداد items در داده‌های group order

### 2. اضافه کردن Debug Logs به `page.tsx`

Logs سرور برای:
- بررسی موفقیت fetch محصولات
- بررسی موفقیت fetch داده‌های group order
- تعداد محصولات و items بارگذاری شده

## نحوه تشخیص مشکل

### مرحله 1: بررسی Console در مرورگر

1. صفحه landingM را در مرورگر باز کنید
2. Developer Tools را باز کنید (F12)
3. به تب Console بروید
4. دنبال log های زیر بگردید:

#### Logs مهم:

```
📦 selectionProducts: productsData count= X
📦 selectionProducts: mapped count= X
```
- اگر count = 0 باشد، یعنی محصولات از سرور نیامده‌اند

```
🔍 referenceOrderItems calculation: { hasGroupOrderData: ..., hasItems: ..., selectionProductsCount: ... }
```
- اگر `hasGroupOrderData: false` یا `hasItems: 'no'` باشد، یعنی داده‌های group order نیامده

```
📦 productMap: initial from selectionProducts: X
📦 productMap final size: X
```
- اگر size = 0 باشد، یعنی هیچ محصولی برای نمایش موجود نیست

### مرحله 2: بررسی Server Logs

در terminal که Next.js در آن اجرا می‌شود، دنبال:

```
[landingM/page] Products fetch: 200 from http://...
[landingM/page] Products loaded: X items
[landingM/page] Group invite fetch: 200
[landingM/page] Group data loaded: X items
```

### مرحله 3: تشخیص مشکل بر اساس Logs

#### سناریو 1: محصولات لود نمی‌شوند
```
[landingM/page] Products fetch: 500 ...
```
یا
```
📦 selectionProducts: productsData count= 0
```

**راه حل:**
- بررسی کنید backend (port 8001) در حال اجرا است
- بررسی کنید `/api/admin/products?order=landing` جواب می‌دهد
- چک کنید database دارای محصول است

#### سناریو 2: داده‌های Group Order نمی‌آید
```
hasGroupOrderData: false
```
یا
```
hasItems: 'no'
```

**راه حل:**
- بررسی کنید URL دارای `?invite=...` است
- بررسی کنید `/api/payment/group-invite/{code}` جواب می‌دهد
- چک کنید invite code معتبر است

#### سناریو 3: productMap خالی است
```
📦 productMap final size: 0
```

**دلیل:** هم `selectionProducts` خالی است و هم `groupOrderData.items`

**راه حل:** مشکلات سناریو 1 و 2 را حل کنید

## چک لیست رفع مشکل

### 1. Backend
- [ ] Backend در حال اجرا است (port 8001)
- [ ] `/api/admin/products?order=landing` جواب می‌دهد
- [ ] Database دارای محصول است

### 2. Frontend
- [ ] Next.js frontend در حال اجرا است (port 3000)
- [ ] `/api/admin/products` (Next API route) به backend متصل است
- [ ] Environment variables صحیح هستند

### 3. Group Order
- [ ] URL دارای parameter `invite` است
- [ ] Invite code معتبر است
- [ ] `/api/payment/group-invite/{code}` در backend جواب می‌دهد
- [ ] Group order دارای items است

## تست دستی API ها

### تست Products API:
```bash
# مستقیماً از backend:
curl http://localhost:8001/api/admin/products?order=landing

# از طریق Next.js:
curl http://localhost:3000/api/admin/products?order=landing
```

### تست Group Invite API:
```bash
# جایگزین {INVITE_CODE} با کد دعوت واقعی
curl http://localhost:8001/api/payment/group-invite/{INVITE_CODE}
curl http://localhost:3000/api/group-invite/{INVITE_CODE}
```

## راه اندازی سرورها

اگر سرورها در حال اجرا نیستند:

### Backend:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

یا با استفاده از فایل bat:
```bash
start_backend_test.bat
```

### Frontend:
```bash
cd frontend
npm run dev
```

## نکات مهم

1. **Server-Side vs Client-Side**: 
   - `page.tsx` در سرور اجرا می‌شود و باید از `console.log` استفاده کند
   - Logs آن در terminal Next.js نمایش داده می‌شود، نه در browser console

2. **Client-Side Logs**:
   - `ClientLanding.tsx` در مرورگر اجرا می‌شود
   - Logs آن در browser console نمایش داده می‌شود

3. **Fallback Mechanism**:
   - اگر `groupOrderData.items` موجود نباشد، از 5 محصول اول `selectionProducts` استفاده می‌شود
   - اگر `selectionProducts` هم خالی باشد، صفحه خالی می‌ماند

## در صورت ادامه مشکل

اگر بعد از بررسی همه موارد بالا، مشکل همچنان ادامه دارد:

1. Logs کامل browser console را بررسی کنید
2. Logs کامل Next.js terminal را بررسی کنید  
3. Network tab در Developer Tools را باز کنید و ببینید:
   - آیا request به `/api/admin/products` ارسال می‌شود؟
   - آیا request به `/api/group-invite/...` ارسال می‌شود؟
   - Status code این request ها چیست؟
   - Response آنها چه محتوایی دارد؟

این اطلاعات به شما کمک می‌کند تا مشکل دقیق را پیدا کنید.

