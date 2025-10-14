# راهنمای Cross-Domain Authentication

## مشکل

وقتی از subdomain های مختلف (`bahamm.ir` و `app.bahamm.ir`) استفاده می‌کنید، `localStorage` بین این دو دامنه به اشتراک گذاشته نمی‌شود. این یعنی:

- اگر کاربر در `bahamm.ir` login کند، token در localStorage آن دامنه ذخیره می‌شود
- وقتی به `app.bahamm.ir` می‌رود، localStorage خالی است و کاربر لاگین نیست

## راه حل پیاده‌سازی شده

یک سیستم Cross-Domain Authentication پیاده‌سازی شده که:

1. **Token را از URL می‌خواند** - وقتی صفحه لود می‌شود، بررسی می‌کند آیا token در URL هست
2. **Token را در localStorage ذخیره می‌کند** - اگر token در URL بود، آن را ذخیره می‌کند
3. **URL را پاک می‌کند** - بعد از ذخیره، token را از URL حذف می‌کند (برای امنیت)
4. **Navigation با Auth** - وقتی به دامنه دیگر می‌روید، token را در URL می‌فرستد

## فایل‌های اضافه شده

### 1. `frontend/src/utils/crossDomainAuth.ts`
Utility functions برای مدیریت cross-domain authentication:

- `syncTokenFromURL()` - token را از URL خوانده و در localStorage ذخیره می‌کند
- `buildAuthURL(url)` - یک URL با token در query parameters می‌سازد
- `navigateWithAuth(domain, path)` - به دامنه دیگر با authentication navigate می‌کند

### 2. `frontend/src/components/CrossDomainLink.tsx`
Component برای navigation بین دامنه‌ها:

- `<CrossDomainLink>` - مثل Link ولی با auth token
- `useCrossDomainNavigation()` - Hook برای navigation programmatic

### 3. `frontend/src/components/CrossDomainAuthWrapper.tsx`
Component wrapper برای صفحاتی که نیاز به cross-domain auth دارند (اختیاری)

## تغییرات در فایل‌های موجود

### ✅ `frontend/src/contexts/AuthContext.tsx`
- Import شده: `syncTokenFromURL`
- در اولین useEffect، قبل از چک کردن localStorage، token از URL sync می‌شود

### ✅ `frontend/src/app/admin/page.tsx`
- Import شده: `syncTokenFromURL`
- یک useEffect اضافه شده که token را از URL می‌خواند

### ✅ `frontend/src/app/admin-full/page.tsx`
- Import شده: `syncTokenFromURL`
- یک useEffect اضافه شده که token را از URL می‌خواند

## نحوه استفاده

### 1. Navigation بین دامنه‌ها (در کد)

```typescript
import { useCrossDomainNavigation } from '@/components/CrossDomainLink';

function MyComponent() {
  const navigateWithAuth = useCrossDomainNavigation();
  
  const goToAdminOnMainDomain = () => {
    navigateWithAuth('https://bahamm.ir/admin');
  };
  
  const goToAdminOnAppDomain = () => {
    navigateWithAuth('https://app.bahamm.ir/admin-full');
  };
  
  return (
    <div>
      <button onClick={goToAdminOnMainDomain}>Admin (Main)</button>
      <button onClick={goToAdminOnAppDomain}>Admin (App)</button>
    </div>
  );
}
```

### 2. استفاده از CrossDomainLink Component

```typescript
import { CrossDomainLink } from '@/components/CrossDomainLink';

function Navigation() {
  return (
    <nav>
      <CrossDomainLink href="https://bahamm.ir/admin">
        Admin Panel (Main Domain)
      </CrossDomainLink>
      
      <CrossDomainLink href="https://app.bahamm.ir/admin-full">
        Admin Full (App Domain)
      </CrossDomainLink>
    </nav>
  );
}
```

### 3. Manual Navigation (برای لینک‌های خارجی)

```typescript
import { buildAuthURL } from '@/utils/crossDomainAuth';

function MyComponent() {
  const shareLink = () => {
    const url = buildAuthURL('https://app.bahamm.ir/admin');
    navigator.clipboard.writeText(url);
    alert('Link copied with authentication!');
  };
  
  return <button onClick={shareLink}>Share Admin Link</button>;
}
```

## چگونه کار می‌کند؟

### مثال: رفتن از bahamm.ir به app.bahamm.ir

1. کاربر در `bahamm.ir` لاگین است
2. کلیک می‌کند روی لینکی که به `app.bahamm.ir/admin-full` می‌رود
3. سیستم token را از localStorage می‌خواند
4. URL را می‌سازد: `https://app.bahamm.ir/admin-full?auth_token=xxx&auth_user=yyy`
5. کاربر به URL جدید redirect می‌شود
6. صفحه `app.bahamm.ir` لود می‌شود
7. `syncTokenFromURL()` فراخوانی می‌شود (در AuthContext و admin pages)
8. Token از URL خوانده شده و در localStorage ذخیره می‌شود
9. URL پاک می‌شود: `https://app.bahamm.ir/admin-full`
10. کاربر حالا در `app.bahamm.ir` هم لاگین است! ✅

## امنیت

- ✅ Token فقط در HTTPS منتقل می‌شود (در production)
- ✅ Token بلافاصله از URL حذف می‌شود
- ✅ Token فقط بین subdomain های مجاز (`bahamm.ir`, `app.bahamm.ir`) منتقل می‌شود

## محدودیت‌ها

1. **Token در URL** - برای یک لحظه، token در URL قابل مشاهده است (قبل از پاک شدن)
2. **Browser History** - اگر کاربر back کند، ممکن است URL با token در history باشد
3. **Shared Links** - اگر کاربر URL را کپی کند قبل از پاک شدن، token لو می‌رود

## راه حل بهتر (توصیه برای آینده)

### استفاده از Shared Cookie Domain

به جای localStorage، از cookies با domain `.bahamm.ir` استفاده کنید:

```python
# در backend
response.set_cookie(
    "auth_token",
    value=token,
    domain=".bahamm.ir",  # این باعث می‌شود cookie بین همه subdomain ها shared شود
    httponly=True,
    secure=True,
    samesite="lax"
)
```

این راه حل:
- ✅ امن‌تر است (HttpOnly cookies)
- ✅ ساده‌تر است (نیاز به URL manipulation نیست)
- ✅ بدون محدودیت‌های cross-domain

## تست کردن

### در Development (localhost)

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn main:app --reload --port 8001

# Terminal 2: Frontend
cd frontend
npm run dev
```

سپس:
1. به `http://localhost:3000` بروید
2. Login کنید
3. به `/admin` بروید - باید کار کند

### در Production

1. در `bahamm.ir` login کنید
2. Console browser را باز کنید
3. چک کنید: `localStorage.getItem('auth_token')` - باید token را نشان دهد
4. به `app.bahamm.ir/admin-full` بروید
5. Console را باز کنید
6. باید ببینید: `[CrossDomainAuth] Token synced from URL`
7. چک کنید: `localStorage.getItem('auth_token')` - باید همان token را نشان دهد

## Debug

اگر مشکل دارید:

```javascript
// در browser console
console.log('Token:', localStorage.getItem('auth_token'));
console.log('User:', localStorage.getItem('user'));
```

اگر در یک domain token دارید ولی در domain دیگر ندارید:
1. بررسی کنید که از `CrossDomainLink` یا `navigateWithAuth` استفاده می‌کنید
2. بررسی کنید که `syncTokenFromURL()` در صفحه مقصد فراخوانی می‌شود
3. Network tab را چک کنید - باید `?auth_token=...` در URL ببینید

## سوالات متداول

### Q: چرا باید از subdomain جدا استفاده کنیم؟
A: تکنیکی نیازی نیست! می‌توانید از همان `bahamm.ir` برای همه چیز استفاده کنید. این راه حل فقط برای حالتی است که می‌خواهید subdomain جدا داشته باشید.

### Q: آیا این روش امن است؟
A: برای production، استفاده از shared cookies بهتر است. این روش یک راه حل موقت و کاربردی است.

### Q: آیا می‌توانم از یک domain استفاده کنم به جای دو تا؟
A: بله! در BotFather، می‌توانید `https://bahamm.ir` را برای Mini App تنظیم کنید و دیگر نیازی به این سیستم ندارید.

