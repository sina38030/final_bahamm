# راهنمای آپلود فایل‌ها به سرور

## روش 1: استفاده از Script خودکار (آسان‌ترین) ⭐

### در Windows (PowerShell):
```powershell
# اجرای script
.\upload_to_server.ps1
```

Script از شما می‌پرسد:
- Username سرور (مثل: `root` یا `your-username`)
- Hostname یا IP سرور (مثل: `bahamm.ir` یا `185.x.x.x`)
- مسیر پروژه روی سرور (مثل: `/root/final_bahamm`)

و بعد همه فایل‌ها را خودکار آپلود می‌کند! ✨

### در Linux/Mac (Bash):
```bash
# اجرای script
./upload_to_server.sh
```

همان سوالات را می‌پرسد و فایل‌ها را آپلود می‌کند.

---

## روش 2: دستور دستی scp

اگر script کار نکرد، این دستور را اجرا کنید:

### یک دستور برای همه فایل‌ها:
```bash
scp nginx_server.conf start_backend_production.sh bahamm-backend.service test_server_setup.sh SERVER_SETUP_QUICKSTART.md SERVER_404_FIX_GUIDE.md امروز_حل_شد_404.md your-user@bahamm.ir:/path/to/final_bahamm/
```

**توجه:** `your-user` و `/path/to/final_bahamm/` را با اطلاعات واقعی جایگزین کنید!

### یا تک تک:
```bash
scp nginx_server.conf your-user@bahamm.ir:/path/to/final_bahamm/
scp start_backend_production.sh your-user@bahamm.ir:/path/to/final_bahamm/
scp bahamm-backend.service your-user@bahamm.ir:/path/to/final_bahamm/
scp test_server_setup.sh your-user@bahamm.ir:/path/to/final_bahamm/
scp SERVER_SETUP_QUICKSTART.md your-user@bahamm.ir:/path/to/final_bahamm/
scp SERVER_404_FIX_GUIDE.md your-user@bahamm.ir:/path/to/final_bahamm/
scp امروز_حل_شد_404.md your-user@bahamm.ir:/path/to/final_bahamm/
```

---

## روش 3: استفاده از WinSCP (Windows)

اگر scp ندارید یا کار نکرد:

1. دانلود و نصب [WinSCP](https://winscp.net/eng/download.php)
2. اتصال به سرور با اطلاعات SSH
3. رفتن به پوشه `/path/to/final_bahamm/`
4. Drag & Drop کردن فایل‌های زیر:
   - `nginx_server.conf`
   - `start_backend_production.sh`
   - `bahamm-backend.service`
   - `test_server_setup.sh`
   - `SERVER_SETUP_QUICKSTART.md`
   - `SERVER_404_FIX_GUIDE.md`
   - `امروز_حل_شد_404.md`

---

## روش 4: استفاده از FileZilla

1. دانلود و نصب [FileZilla](https://filezilla-project.org/)
2. اتصال با SFTP:
   - Host: `sftp://bahamm.ir`
   - Username: `your-username`
   - Password: `your-password`
   - Port: `22`
3. آپلود فایل‌ها به `/path/to/final_bahamm/`

---

## بعد از آپلود، چه کنیم؟

### 1. اتصال به سرور:
```bash
ssh your-user@bahamm.ir
```

### 2. رفتن به پوشه پروژه:
```bash
cd /path/to/final_bahamm
```

### 3. بررسی فایل‌ها:
```bash
ls -lh nginx_server.conf start_backend_production.sh bahamm-backend.service test_server_setup.sh
```

باید همه فایل‌ها را ببینید! ✅

### 4. خواندن راهنما:
```bash
cat SERVER_SETUP_QUICKSTART.md
```

یا اگر فارسی نمایش داده نمی‌شود:
```bash
less امروز_حل_شد_404.md
```

### 5. دنبال کردن مراحل!

به فایل `SERVER_SETUP_QUICKSTART.md` مراجعه کنید و مراحل را دنبال کنید.

---

## عیب‌یابی

### خطا: "scp: command not found"

**در Windows:**
1. Settings > Apps > Optional Features
2. Add a feature
3. OpenSSH Client را نصب کنید
4. PowerShell را ببندید و دوباره باز کنید

**در Linux:**
```bash
sudo apt install openssh-client   # Debian/Ubuntu
sudo yum install openssh-clients   # CentOS/RHEL
```

### خطا: "Permission denied"

- اطمینان حاصل کنید Username و Password درست است
- اطمینان حاصل کنید SSH key (اگر دارید) در دسترس است
- مسیر هدف روی سرور صحیح است

### خطا: "No such file or directory"

مسیر هدف روی سرور وجود ندارد. ابتدا آن را بسازید:
```bash
ssh your-user@bahamm.ir "mkdir -p /path/to/final_bahamm"
```

---

## اطلاعات سرور شما

برای راحتی، اینجا را پر کنید:

```
Username: _________________
Hostname: _________________
Port: _____ (معمولاً 22)
Project Path: _________________
```

سپس در دستورات scp جایگزین کنید!

---

موفق باشید! 🚀

