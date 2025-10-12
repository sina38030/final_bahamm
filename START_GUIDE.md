# راهنمای راه‌اندازی سیستم

## روش ساده (پیشنهادی)

### 1. راه‌اندازی Backend
```bash
# در PowerShell:
cd "C:\Users\User\OneDrive\Desktop\final project"
python simple_server.py
```

### 2. راه‌اندازی Frontend (در terminal جدید)
```bash
cd "C:\Users\User\OneDrive\Desktop\final project\frontend"
npm run dev
```

## تست سیستم

### تست Backend:
- آدرس: http://localhost:8001
- Health Check: http://localhost:8001/api/health

### تست Frontend:
- آدرس: http://localhost:3000

### تست Login API:
```bash
python test_login.py
```

## نکات مهم:
- کدهای تایید در console backend نمایش داده می‌شوند
- هر دو سرویس باید همزمان اجرا شوند
- اگر خطا دادند، فایل‌های .bat را امتحان کنید

## فایل‌های کمکی:
- `simple_server.py` - سرور ساده backend
- `test_login.py` - تست API
- `start_backend.bat` - راه‌اندازی خودکار backend
- `start_frontend.bat` - راه‌اندازی خودکار frontend 