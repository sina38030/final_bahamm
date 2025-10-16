# 🚀 دستورات Deploy Frontend به Production

## مشکل فعلی:
کاربران invited بعد از پرداخت به `/success` برمی‌گردند که صفحه قدیمی و حذف شده است.

## راه حل:
باید frontend را روی سرور rebuild کنیم تا صفحه جدید `/payment/success/invitee` را بسازد.

---

## 📋 دستورات (در ترمینال خودتان اجرا کنید):

### مرحله 1: اتصال به سرور
```bash
ssh root@bahamm.ir
```

### مرحله 2: رفتن به پوشه پروژه
```bash
cd /root/final_bahamm
```

### مرحله 3: Pull کردن تغییرات جدید از Git
```bash
git pull origin main
```

### مرحله 4: رفتن به پوشه frontend
```bash
cd frontend
```

### مرحله 5: حذف build قدیمی (مهم!)
```bash
rm -rf .next
rm -rf node_modules/.cache
```

### مرحله 6: Build کردن frontend جدید
```bash
npm run build
```
⏱️ این کار 2-5 دقیقه طول می‌کشد.

### مرحله 7: Restart کردن frontend service

**اگر از PM2 استفاده می‌کنید:**
```bash
pm2 restart frontend
pm2 status
```

**اگر از systemd استفاده می‌کنید:**
```bash
sudo systemctl restart bahamm-frontend
sudo systemctl status bahamm-frontend
```

**اگر نمی‌دانید:**
```bash
# ابتدا این را امتحان کنید
pm2 list

# اگر خروجی داد، از PM2 استفاده کنید
# اگر command not found گفت، از systemctl استفاده کنید
```

---

## ✅ تست کردن

بعد از restart:

1. یک کاربر invited ایجاد کنید
2. پرداخت را انجام دهید  
3. باید به این آدرس redirect شود:
   ```
   https://bahamm.ir/payment/success/invitee?orderId=XXX&groupId=YYY
   ```

4. **نباید** به `/success` برود!

---

## 🔍 اگر هنوز مشکل وجود دارد:

### بررسی کنید که صفحه قدیمی حذف شده:
```bash
ls -la /root/final_bahamm/frontend/src/app/success/
# باید بگوید: No such file or directory
```

### بررسی کنید که صفحه جدید وجود دارد:
```bash
ls -la /root/final_bahamm/frontend/src/app/payment/success/invitee/
# باید فایل page.tsx را نشان دهد
```

### مشاهده لاگ‌های frontend:
```bash
# با PM2
pm2 logs frontend --lines 50

# با systemd
sudo journalctl -u bahamm-frontend -n 50 -f
```

### Hard Restart (اگر restart معمولی کار نکرد):
```bash
# با PM2
pm2 delete frontend
pm2 start npm --name "frontend" -- start

# با systemd
sudo systemctl stop bahamm-frontend
sudo systemctl start bahamm-frontend
```

---

## 📝 تغییرات انجام شده در کد:

### ❌ حذف شده:
- `frontend/src/app/success/page.tsx` (صفحه قدیمی)

### ✅ اضافه شده:
- `frontend/src/app/payment/callback/page.tsx` (مدیریت callback بانک)
- `frontend/src/app/payment/success/invitee/page.tsx` (صفحه جدید)
- کامپوننت‌های مربوطه در `_components/`

### 🔄 تغییر route:
```
قبل: /success
بعد: /payment/success/invitee?orderId=X&groupId=Y
```

---

## ❓ سوالات متداول

**Q: چرا باید .next را حذف کنیم؟**
A: Next.js فایل‌های compiled را cache می‌کند. با حذف آن، مطمئن می‌شویم build از صفر شروع شود.

**Q: چقدر طول می‌کشد؟**
A: Build معمولاً 2-5 دقیقه طول می‌کشد بسته به سرعت سرور.

**Q: آیا سرویس قطع می‌شود؟**
A: در حین build خیر، اما در حین restart کوتاه (1-2 ثانیه) ممکن است قطع شود.

---

## 🎯 چک لیست نهایی:

- [ ] Git pull انجام شد
- [ ] پوشه .next حذف شد
- [ ] Build بدون خطا تمام شد
- [ ] Frontend restart شد
- [ ] تست: کاربر invited به /payment/success/invitee می‌رود
- [ ] تست: صفحه /success دیگر در دسترس نیست (404)

