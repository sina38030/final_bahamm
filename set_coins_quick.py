import requests

phone = "09436466464"
amount = 100000

# پیدا کردن کاربر
r = requests.get("http://127.0.0.1:8001/api/admin/users")
users = r.json()
user = next((u for u in users if u.get('phone_number') == phone), None)

if user:
    print(f"کاربر پیدا شد - ID: {user['id']}, موجودی فعلی: {user.get('coins', 0)}")
    
    # تنظیم موجودی
    r = requests.put(
        f"http://127.0.0.1:8001/api/admin/users/{user['id']}/coins",
        json={"coins": amount}
    )
    
    if r.status_code == 200:
        print(f"✅ موجودی به {amount:,} تومان تنظیم شد!")
        print(f"\nحالا این کارها را انجام دهید:")
        print(f"1. به مرورگر بروید")
        print(f"2. F12 را بزنید")
        print(f"3. در Console این را بزنید: localStorage.clear()")
        print(f"4. با شماره {phone} دوباره لاگین کنید")
        print(f"5. به /profile/wallet بروید")
    else:
        print(f"❌ خطا: {r.text}")
else:
    print(f"❌ کاربر با شماره {phone} یافت نشد")

