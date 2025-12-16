# 🚀 راهنمای تنظیم GitHub Auto Deploy

## ✅ چی کار می‌کنه؟

بعد از هر `git push`، خودکار:
1. به سرور وصل می‌شه
2. `git pull` می‌کنه
3. Backend و Frontend رو restart می‌کنه
4. تمام! ⚡

**زمان: 15-30 ثانیه**

---

## 🔧 تنظیمات یکبار (فقط 2 دقیقه)

### قدم 1: رفتن به تنظیمات GitHub

1. برو به: https://github.com/sina38030/final_bahamm
2. کلیک کن روی **Settings** (بالای صفحه)
3. از منوی چپ، کلیک کن روی **Secrets and variables** > **Actions**
4. کلیک کن روی **New repository secret**

### قدم 2: اضافه کردن 3 Secret

#### Secret 1: `SERVER_IP`
- Name: `SERVER_IP`
- Value: `188.121.103.118`
- کلیک: **Add secret**

#### Secret 2: `SERVER_USER`
- کلیک دوباره: **New repository secret**
- Name: `SERVER_USER`
- Value: `ubuntu`
- کلیک: **Add secret**

#### Secret 3: `SSH_PRIVATE_KEY`
- کلیک دوباره: **New repository secret**
- Name: `SSH_PRIVATE_KEY`
- Value: محتوای فایل `C:\Users\User\.ssh\id_rsa`
  
  **چطور محتوا رو کپی کنیم:**
  ```powershell
  Get-Content C:\Users\User\.ssh\id_rsa | clip
  ```
  بعد Ctrl+V در GitHub

- کلیک: **Add secret**

---

## ✅ تست کردن

### حالا فقط این کار رو بکن:

```powershell
cd C:\Projects\final_bahamm
git add -A
git commit -m "test auto deploy"
git push origin main
```

### بعد برو اینجا:
https://github.com/sina38030/final_bahamm/actions

باید ببینی:
- ✅ یک deploy شروع شده (زرد رنگ، در حال اجرا)
- بعد 15-30 ثانیه سبز می‌شه ✅
- سایت update شده: https://bahamm.ir

---

## 🎯 از این به بعد

فقط:
```powershell
git add -A
git commit -m "your message"
git push
```

و تمام! GitHub خودکار deploy می‌کنه ⚡

---

## 🔍 مشکل داشتی؟

اگر deploy fail شد:
1. برو به: https://github.com/sina38030/final_bahamm/actions
2. کلیک روی failed job
3. ببین error چیه
4. معمولاً مشکل از SSH key هست - دوباره کپی کن

